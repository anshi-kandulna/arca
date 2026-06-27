import os
from sqlalchemy.orm import Session
from db import database, crud, models
import time

from .obligation_intel import extract_obligation_intel
from .evidence_aligner import align_evidence
from .verdict_synthesizer import synthesize_verdict

def parse_document_with_docling(file_path: str) -> str:
    if not file_path or not os.path.exists(file_path):
        return ""
        
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".pdf", ".docx", ".doc"]:
        return "" # Skip docling for non-documents
        
    try:
        from docling.datamodel.pipeline_options import PdfPipelineOptions # type: ignore
        from docling.datamodel.base_models import InputFormat # type: ignore
        from docling.document_converter import DocumentConverter, PdfFormatOption # type: ignore
        
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False
        
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=pipeline_options
                )
            }
        )
        
        doc = converter.convert(file_path).document
        
        # Extract text from docling Document object
        # The document object has a .export_to_markdown() method in docling v2+
        return doc.export_to_markdown()
    except Exception as e:
        print(f"Docling parsing error: {e}")
        return ""

def run_validation_background(evidence_id: str):
    """
    Background task to validate the submitted evidence.
    """
    db = database.SessionLocal()
    try:
        evidence = crud.get_evidence(db, evidence_id)
        if not evidence:
            print("Evidence not found.")
            return
            
        map_obj = crud.get_map(db, str(evidence.map_id))
        if not map_obj:
            print("MAP not found.")
            return
            
        print(f"[Validation Agent] Running background validation for evidence {evidence.id}...")
        
        # Phase 0: Document Parsing
        print(f"[Validation Agent] Phase 0: Parsing document using docling...")
        doc_text = parse_document_with_docling(evidence.file_path)
        combined_text = f"User Notes: {evidence.notes or 'None'}\n\nDocument Content:\n{doc_text}"
        print(f"[Validation Agent] Phase 0 Complete: Parsed {len(doc_text)} characters.")
        
        # Phase 1: Obligation Intelligence
        print(f"[Validation Agent] Phase 1: Extracting Obligation Intelligence for MAP {map_obj.map_ref}...")
        intel_data = extract_obligation_intel(map_obj)
        print(f"[Validation Agent] Phase 1 Complete: Found {len(intel_data.get('evidence_signals', []))} signals.")
        
        # Phase 2: Evidence Alignment
        print(f"[Validation Agent] Phase 2: Aligning evidence against extracted signals...")
        signal_results = align_evidence(map_obj, intel_data, combined_text)
        print(f"[Validation Agent] Phase 2 Complete.")
        
        # Phase 3: Verdict Synthesizer
        print(f"[Validation Agent] Phase 3: Synthesizing final verdict...")
        final_verdict = synthesize_verdict(signal_results)
        print(f"[Validation Agent] Phase 3 Complete: Verdict = {final_verdict['verdict']} ({final_verdict['confidence']}%)")
        
        # Save Verdict
        verdict_db = crud.create_validation_verdict(
            db=db,
            evidence_id=str(evidence.id),
            verdict=final_verdict["verdict"],
            confidence=final_verdict["confidence"],
            reasoning=final_verdict["reasoning"],
            missing_elements=final_verdict["missing_elements"],
            signal_breakdown=final_verdict["signal_breakdown"]
        )
        
        # Always create an Audit Log for AI Verdict
        circular = crud.get_circular(db, map_obj.circular_id)
        crud.create_audit_log(
            db=db,
            bank_id=str(map_obj.bank_id),
            user_id=None, # System action
            actor="ARCA Validation Agent",
            actor_role="System",
            action=f"AI Verdict: {final_verdict['verdict']}",
            action_type="AI_VALIDATION",
            circular_ref=circular.ref_number if circular else None,
            map_ref=map_obj.map_ref,
            business_vertical=map_obj.business_vertical,
            details=f"AI Validation returned verdict '{final_verdict['verdict']}' with {final_verdict['confidence']}% confidence."
        )
        
        # Auto-Close Logic
        if final_verdict["auto_close"]:
            crud.update_map(db, map_obj, {"status": "closed"})
            
            # Create Audit Log for Auto-Close
            crud.create_audit_log(
                db=db,
                bank_id=str(map_obj.bank_id),
                user_id=None, # System action
                actor="ARCA Validation Agent",
                actor_role="System",
                action="MAP Auto-Closed",
                action_type="AUTO_CLOSE",
                circular_ref=circular.ref_number if circular else None,
                map_ref=map_obj.map_ref,
                business_vertical=map_obj.business_vertical,
                details=f"AI Validation reached {final_verdict['confidence']}% confidence. MAP auto-closed."
            )
        
    except Exception as e:
        print(f"[Validation Agent] FATAL Validation failed: {e}")
    finally:
        db.close()
