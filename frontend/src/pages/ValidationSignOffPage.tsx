'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  CheckCircle, XCircle, AlertTriangle, ShieldCheck, 
  FileText, Brain, ChevronDown, ChevronUp, Bot, Search
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import * as mammoth from 'mammoth';

export default function ValidationSignOffPage() {
  const { token } = useAuth();
  const [validations, setValidations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchValidations = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/validations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setValidations(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load validations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidations();
  }, [token]);

  const handleDecision = async (validationId: string, action: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/validations/${validationId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, reasoning: "Reviewed by Compliance Officer" })
      });
      if (!res.ok) throw new Error('Decision failed');
      toast.success(`Validation marked as: ${action}`);
      fetchValidations();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit decision');
    }
  };

  const filteredValidations = validations.filter(v => {
    if (!search) return true;
    const term = search.toLowerCase();
    return v.mapId?.toLowerCase().includes(term) || v.mapAction?.toLowerCase().includes(term);
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredValidations.length / pageSize);
  const paginatedValidations = filteredValidations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <AppLayout activeRoute="/gate-2">
      <div className="space-y-8 pb-12 fade-in-up">
        {/* Header - Editorial Layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-[3px] border-black pb-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-primary" strokeWidth={3} />
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-[0.2em]">GATE 2</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-black leading-none tracking-tight">Validation</h1>
          </div>
          <div className="mt-6 md:mt-0 flex items-center gap-4 bg-white border border-black p-3 px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="font-mono text-sm font-bold text-black uppercase tracking-widest">{filteredValidations.length} Pending Sign-Offs</span>
          </div>
        </div>

        {/* Search */}
        <div className="flex border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
            <input
              type="text"
              placeholder="Search by MAP ID or Action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-mono text-black placeholder:text-black/40 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-12 text-center">
            <div className="w-10 h-10 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-mono uppercase tracking-widest font-bold text-black/60">Fetching Validations...</p>
          </div>
        ) : filteredValidations.length === 0 ? (
          <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-16 text-center">
            <ShieldCheck size={48} className="text-success mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-serif text-black mb-2">All Caught Up!</h3>
            <p className="text-xs font-mono uppercase tracking-widest font-bold text-black/60">No pending evidence waiting for review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {paginatedValidations.map((v, idx) => (
              <ValidationCard key={v.id} validation={v} index={(currentPage - 1) * pageSize + idx + 1} onDecide={(action) => handleDecision(v.id, action)} />
            ))}
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ValidationCard({ validation, index, onDecide }: { validation: any, index: number, onDecide: (a: string) => void }) {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [showEvidence, setShowEvidence] = useState(false);
  const [evidenceBlobUrl, setEvidenceBlobUrl] = useState<string | null>(null);
  const [evidenceDocxHtml, setEvidenceDocxHtml] = useState<string | null>(null);

  const toggleEvidence = async () => {
    if (showEvidence) {
      setShowEvidence(false);
      return;
    }
    
    if (!evidenceBlobUrl && !evidenceDocxHtml && validation.evidenceId) {
      try {
        const res = await fetch(`http://localhost:8000/api/evidence/${validation.evidenceId}/download`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const blob = await res.blob();
          const ext = validation.evidenceFile.split('.').pop()?.toLowerCase();
          
          if (ext === 'docx') {
            const arrayBuffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setEvidenceDocxHtml(result.value);
          } else {
            // Explicitly set the MIME type to prevent the browser from downloading it
            let mimeType = 'application/pdf';
            if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            
            const typedBlob = new Blob([blob], { type: mimeType });
            setEvidenceBlobUrl(URL.createObjectURL(typedBlob));
          }
        } else {
          toast.error("Failed to load evidence file");
        }
      } catch (err) {
        console.error("Error loading evidence", err);
        toast.error("Error loading evidence file");
      }
    }
    setShowEvidence(true);
  };

  const isSatisfied = validation.verdict === 'Satisfied';
  const isPartial = validation.verdict === 'Partial';
  
  const vColor = isSatisfied ? 'text-success' : isPartial ? 'text-warning' : 'text-danger';
  const vBg = isSatisfied ? 'bg-success-muted' : isPartial ? 'bg-warning-muted' : 'bg-danger-muted';

  return (
    <div className={`card-elevated-hover bg-white p-0 flex flex-col stagger-${(index % 4) + 1}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-5 border-b border-black bg-[#fbfbfa]">
        
        <div className="flex items-center gap-4 flex-1 min-w-0 flex-wrap">
          <span className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-mono font-bold">{index}</span>
          </span>
          <span className="font-mono font-bold text-lg text-black">{validation.mapId}</span>
          <span className="text-[10px] font-mono font-bold text-black/50 uppercase tracking-widest">{validation.circularRef}</span>
          <span className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border border-black ${vBg} ${vColor}`}>
            VERDICT: {validation.verdict}
          </span>
          <div className="flex items-center gap-2 ml-2 bg-black text-white px-3 py-1">
            <Bot size={14} className="text-primary" />
            <span className={`text-[10px] font-mono font-bold tracking-widest uppercase`}>{validation.confidence}% CONFIDENCE</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 mt-4 lg:mt-0">
          <button
            onClick={() => onDecide('Confirm Close')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors border border-black"
          >
            <CheckCircle size={14} /> Accept Verdict
          </button>
          
          <button
            onClick={() => onDecide('Request Resubmission')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors border border-black"
          >
            <AlertTriangle size={14} /> Reject Evidence
          </button>

          <button onClick={() => setExpanded(!expanded)} className="p-2 border border-black text-black hover:bg-black hover:text-white transition-colors bg-white">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-0 grid grid-cols-1 md:grid-cols-2">
          {/* Left Column */}
          <div className="p-6 md:border-r border-black space-y-6">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-black/50 mb-3">Obligation to satisfy</p>
              <p className="text-base font-sans text-black leading-relaxed p-4 border border-black/10 bg-[#fbfbfa]">{validation.mapAction}</p>
            </div>
            <div className="p-5 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-black/50 mb-4">Evidence Submitted</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-black text-white">
                  <FileText size={20} />
                </div>
                {validation.evidenceId ? (
                  <button 
                    onClick={toggleEvidence}
                    className="text-sm font-mono font-bold text-black underline decoration-primary underline-offset-4 hover:text-primary text-left"
                  >
                    {validation.evidenceFile} {showEvidence ? "(Hide)" : "(View Inline)"}
                  </button>
                ) : (
                  <span className="text-sm font-mono font-bold text-black underline decoration-primary underline-offset-4">{validation.evidenceFile}</span>
                )}
              </div>
              
              {showEvidence && evidenceBlobUrl && (
                <div className="mb-4 border border-black h-[400px] w-full bg-black/5">
                  <iframe 
                    src={evidenceBlobUrl} 
                    className="w-full h-full border-none"
                    title="Evidence Document"
                  />
                </div>
              )}

              {showEvidence && evidenceDocxHtml && (
                <div className="mb-4 border border-black max-h-[400px] overflow-y-auto w-full bg-white p-6">
                  <div 
                    className="prose prose-sm max-w-none text-black font-sans evidence-docx-viewer" 
                    dangerouslySetInnerHTML={{ __html: evidenceDocxHtml }} 
                  />
                </div>
              )}

              {validation.evidenceNotes && <p className="text-sm font-sans text-black/80 mt-4 bg-[#fbfbfa] p-4 border-l-2 border-black">"{validation.evidenceNotes}"</p>}
            </div>
          </div>

          {/* Right Column */}
          <div className="p-6 space-y-6 bg-[#fbfbfa]">
            <div className="p-6 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-4">
                <Bot size={20} className="text-primary" />
                <p className="text-xs font-mono font-bold text-black uppercase tracking-widest">AI Reasoning Log</p>
              </div>
              <p className="text-sm font-sans text-black leading-relaxed">{validation.reasoning}</p>
            </div>

            {validation.missingElements && validation.missingElements.length > 0 && (
              <div className="p-6 border border-black bg-danger-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle size={20} className="text-danger" />
                  <p className="text-xs font-mono font-bold text-danger uppercase tracking-widest">Missing Elements</p>
                </div>
                <ul className="list-disc list-inside text-sm font-sans text-danger font-bold space-y-1">
                  {validation.missingElements.map((el: string, i: number) => (
                    <li key={i}>{el}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.signalBreakdown && validation.signalBreakdown.length > 0 && (
              <div className="p-0 border-t border-black mt-6">
                <p className="text-[10px] font-mono font-bold text-black/50 uppercase tracking-[0.2em] mb-4 mt-6">Signal Breakdown</p>
                <div className="space-y-3">
                  {validation.signalBreakdown.map((sig: any, i: number) => {
                    const isSigMet = sig.status === 'MET';
                    const isSigPartial = sig.status === 'PARTIALLY_MET';
                    const sigColor = isSigMet ? 'text-success' : isSigPartial ? 'text-warning' : 'text-danger';
                    const sigBg = isSigMet ? 'bg-success-muted border-success/30' : isSigPartial ? 'bg-warning-muted border-warning/30' : 'bg-danger-muted border-danger/30';
                    const Icon = isSigMet ? CheckCircle : isSigPartial ? AlertTriangle : XCircle;

                    return (
                      <div key={i} className={`p-4 border ${sigBg} flex flex-col gap-2`}>
                        <div className="flex items-start gap-3">
                          <Icon size={16} className={`mt-0.5 flex-shrink-0 ${sigColor}`} />
                          <div>
                            <p className="text-sm font-sans font-bold text-black">{sig.signal}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border ${sigColor} border-current`}>
                                {sig.status} ({sig.confidence}%)
                              </span>
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-black/50 bg-white border border-black/20 px-1.5 py-0.5">
                                WT: {sig.weight}
                              </span>
                            </div>
                            {sig.reasoning && <p className="text-xs font-sans text-black/80 mt-2">{sig.reasoning}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
