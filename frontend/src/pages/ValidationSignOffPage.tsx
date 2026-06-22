'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  CheckCircle, XCircle, AlertTriangle, ShieldCheck, 
  FileText, Brain, ChevronDown, ChevronUp, Bot 
} from 'lucide-react';

export default function ValidationSignOffPage() {
  const { token } = useAuth();
  const [validations, setValidations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
            <span className="font-mono text-sm font-bold text-black uppercase tracking-widest">{validations.length} Pending Sign-Offs</span>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-12 text-center">
            <div className="w-10 h-10 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-mono uppercase tracking-widest font-bold text-black/60">Fetching Validations...</p>
          </div>
        ) : validations.length === 0 ? (
          <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-16 text-center">
            <ShieldCheck size={48} className="text-success mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-serif text-black mb-2">All Caught Up!</h3>
            <p className="text-xs font-mono uppercase tracking-widest font-bold text-black/60">No pending evidence waiting for review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {validations.map((v, idx) => (
              <ValidationCard key={v.id} validation={v} index={idx + 1} onDecide={(action) => handleDecision(v.id, action)} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ValidationCard({ validation, index, onDecide }: { validation: any, index: number, onDecide: (a: string) => void }) {
  const [expanded, setExpanded] = useState(true);

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
            className="flex items-center gap-2 px-4 py-2 bg-success text-white text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-black transition-colors border border-black"
          >
            <CheckCircle size={14} /> Accept Verdict
          </button>
          
          <button
            onClick={() => onDecide('Request Resubmission')}
            className="flex items-center gap-2 px-4 py-2 bg-danger text-white text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-black transition-colors border border-black"
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
                <span className="text-sm font-mono font-bold text-black underline decoration-primary underline-offset-4 cursor-pointer hover:text-primary">{validation.evidenceFile}</span>
              </div>
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
              <div className="p-6 border border-danger bg-danger-muted">
                <p className="text-[10px] font-mono font-bold text-danger uppercase tracking-[0.2em] mb-4">Missing Elements Identified</p>
                <ul className="list-square pl-5 space-y-2">
                  {validation.missingElements.map((el: string, i: number) => (
                    <li key={i} className="text-sm font-sans font-medium text-danger">{el}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
