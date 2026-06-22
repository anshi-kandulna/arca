'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  CheckCircle, XCircle, AlertTriangle, ShieldCheck, 
  FileText, Brain, ChevronDown, ChevronUp 
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
      <div className="space-y-6 fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="gate-badge bg-primary/15 text-primary border border-primary/30 text-xs px-2 py-0.5">GATE 2</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Validation Sign-Off</h1>
            <p className="text-sm text-muted-foreground mt-1">Review AI validation of submitted evidence</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground text-sm">Loading validations…</div>
          </div>
        ) : validations.length === 0 ? (
          <div className="card-elevated border border-border px-6 py-12 text-center">
            <ShieldCheck size={32} className="text-success mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">All Caught Up!</h3>
            <p className="text-sm text-muted-foreground">No pending evidence waiting for review.</p>
          </div>
        ) : (
          <div className="space-y-4">
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

  const vColor = validation.verdict === 'Satisfied' ? 'text-success' 
               : validation.verdict === 'Partial' ? 'text-warning' : 'text-danger';
  const vBg = validation.verdict === 'Satisfied' ? 'bg-success/10 border-success/20' 
            : validation.verdict === 'Partial' ? 'bg-warning/10 border-warning/20' : 'bg-danger/10 border-danger/20';

  return (
    <div className={`card-elevated border border-border transition-all duration-200 overflow-hidden`}>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/20">
        <span className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
          <span className="text-2xs font-bold font-mono-data text-muted-foreground">{index}</span>
        </span>

        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="font-mono-data text-xs font-bold text-primary">{validation.mapId}</span>
          <span className="text-2xs text-muted-foreground">{validation.circularRef}</span>
          <span className={`gate-badge ${vBg} ${vColor}`}>{validation.verdict}</span>
          <div className="flex items-center gap-1 ml-1">
            <Brain size={11} className="text-primary" />
            <span className={`text-2xs font-mono-data font-semibold text-primary`}>{validation.confidence}%</span>
            <span className="text-2xs text-muted-foreground font-mono-data">confidence</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onDecide('Confirm Close')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-success/10 border border-success/25 text-success text-xs font-medium hover:bg-success/20 transition-all"
          >
            <CheckCircle size={12} /> Confirm Close
          </button>
          
          <button
            onClick={() => onDecide('Request Resubmission')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-danger/10 border border-danger/25 text-danger text-xs font-medium hover:bg-danger/20 transition-all"
          >
            <AlertTriangle size={12} /> Resubmit
          </button>

          <button
            onClick={() => onDecide('Override')}
            className="px-2.5 py-1 rounded-md bg-muted border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-all"
          >
            Override
          </button>

          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Obligation</p>
                <p className="text-sm text-foreground leading-relaxed">{validation.mapAction}</p>
              </div>
              <div className="p-3 rounded-md bg-muted/40 border border-border">
                <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-1">Evidence Submitted</p>
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} className="text-primary" />
                  <span className="text-sm font-medium text-primary cursor-pointer hover:underline">{validation.evidenceFile}</span>
                </div>
                {validation.evidenceNotes && <p className="text-xs text-muted-foreground mt-2 italic">"{validation.evidenceNotes}"</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-md bg-primary/5 border border-primary/15">
                <div className="flex items-center gap-1.5 mb-2">
                  <Brain size={14} className="text-primary" />
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest">Validation Agent Reasoning</p>
                </div>
                <p className="text-sm text-foreground">{validation.reasoning}</p>
              </div>

              {validation.missingElements && validation.missingElements.length > 0 && (
                <div className="p-3 rounded-md bg-danger/5 border border-danger/15">
                  <p className="text-xs font-semibold text-danger uppercase tracking-widest mb-2">Missing Elements</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {validation.missingElements.map((el: string, i: number) => (
                      <li key={i} className="text-sm text-foreground">{el}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
