'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  UserCheck, Brain, CheckCircle, AlertTriangle, Clock,
  ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Eye, Zap, FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface AIValidation {
  id: string;
  mapId: string;
  circularRef: string;
  department: string;
  obligation: string;
  submittedEvidence: string;
  submittedBy: string;
  submittedAt: string;
  arcaVerdict: 'fully_satisfied' | 'partially_satisfied' | 'not_satisfied';
  arcaConfidence: number;
  arcaReasoning: string;
  arcaMissingItems?: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  auditorStatus: 'pending_review' | 'confirmed' | 'overridden';
}

const validations: AIValidation[] = [
  {
    id: 'val-001',
    mapId: 'MAP-2026-041',
    circularRef: 'DBR.CID.No.43/2026',
    department: 'Legal',
    obligation: 'Update KYC Policy to include Digital Nomad Visa as OVD under Section 3(a), effective 01 Jul 2026.',
    submittedEvidence: 'KYC Policy v2.3 (board-approved), Board Resolution dated 28 May 2026, Digital Nomad Visa OVD amendment section.',
    submittedBy: 'Priya Venkataraman',
    submittedAt: '05 Jun 2026, 15:20 IST',
    arcaVerdict: 'fully_satisfied',
    arcaConfidence: 96.2,
    arcaReasoning: 'The submitted KYC Policy v2.3 explicitly lists Digital Nomad Visa under Section 3(a) OVD list. Board resolution confirms approval. Effective date matches circular requirement. All three evidence components are present and valid.',
    priority: 'HIGH',
    auditorStatus: 'pending_review',
  },
  {
    id: 'val-002',
    mapId: 'MAP-2026-036',
    circularRef: 'RBI/2026-27/18',
    department: 'Operations',
    obligation: 'Update document inventory to replace all references to "NCLT" with "Competent Authority" per revised FEMA definitions.',
    submittedEvidence: 'Updated document inventory list (47 documents), change log showing NCLT → Competent Authority replacements.',
    submittedBy: 'Rajesh Nair',
    submittedAt: '04 Jun 2026, 10:30 IST',
    arcaVerdict: 'partially_satisfied',
    arcaConfidence: 71.4,
    arcaReasoning: 'Document inventory shows 47 documents updated. However, the submission does not include the updated versions of the 3 highest-priority documents (Loan Agreement Template, Security Agreement, and Pledge Deed). Change log is present but lacks version control timestamps.',
    arcaMissingItems: [
      'Updated Loan Agreement Template (v current)',
      'Updated Security Agreement document',
      'Updated Pledge Deed template',
      'Version control timestamps in change log',
    ],
    priority: 'MEDIUM',
    auditorStatus: 'pending_review',
  },
  {
    id: 'val-003',
    mapId: 'MAP-2026-042',
    circularRef: 'DBR.CID.No.43/2026',
    department: 'HR',
    obligation: 'Conduct mandatory training for all front-office staff on updated OVD list and new KYC procedures for Digital Nomad Visa holders.',
    submittedEvidence: 'Training completion certificates for 47 front-office staff, attendance register, training materials.',
    submittedBy: 'Sunita Mehta',
    submittedAt: '01 Jun 2026, 14:00 IST',
    arcaVerdict: 'fully_satisfied',
    arcaConfidence: 88.7,
    arcaReasoning: 'Training certificates cover all 47 front-office staff. Attendance register is signed and dated. Training material includes the updated OVD list and specific procedures for DNV holders. Confidence slightly reduced as training date (28 May) precedes circular effective date — acceptable as preparatory training.',
    priority: 'MEDIUM',
    auditorStatus: 'confirmed',
  },
  {
    id: 'val-004',
    mapId: 'MAP-2026-029',
    circularRef: 'DPSS.CO.PD.No.12/2026',
    department: 'Operations',
    obligation: 'Implement enhanced due diligence workflow for merchant onboarding including risk scoring, document verification, and periodic review.',
    submittedEvidence: 'Screenshot of merchant onboarding screen showing new fields.',
    submittedBy: 'Rajesh Nair',
    submittedAt: '31 May 2026, 09:00 IST',
    arcaVerdict: 'not_satisfied',
    arcaConfidence: 94.1,
    arcaReasoning: 'The submitted screenshot shows only the UI changes to the onboarding form. The circular requires implementation of a complete risk scoring methodology, document verification process, and periodic review mechanism. None of these backend processes are evidenced.',
    arcaMissingItems: [
      'Merchant risk scoring methodology document',
      'Document verification process flowchart or SOP',
      'Periodic review schedule and mechanism',
      'Sample completed enhanced due diligence form',
    ],
    priority: 'HIGH',
    auditorStatus: 'pending_review',
  },
  {
    id: 'val-005',
    mapId: 'MAP-2026-033',
    circularRef: 'RBI/2026-27/18',
    department: 'Compliance',
    obligation: 'Update internal ICA timeline policy to reduce signing window from 30 days to 21 days per revised RBI guidelines.',
    submittedEvidence: 'Updated ICA Policy v4.1, Board committee approval note dated 01 Jun 2026.',
    submittedBy: 'Ananya Sharma',
    submittedAt: '01 Jun 2026, 17:00 IST',
    arcaVerdict: 'fully_satisfied',
    arcaConfidence: 99.1,
    arcaReasoning: 'ICA Policy v4.1 explicitly states 21-day signing window in Section 4.2. Board committee approval is dated and signed. Policy effective date is 01 Jun 2026. All requirements fully met with high confidence.',
    priority: 'HIGH',
    auditorStatus: 'confirmed',
  },
];

const verdictConfig = {
  fully_satisfied: { label: 'Fully Satisfied', bg: 'bg-success/10', border: 'border-success/25', text: 'text-success', icon: CheckCircle },
  partially_satisfied: { label: 'Partially Satisfied', bg: 'bg-warning/10', border: 'border-warning/25', text: 'text-warning', icon: AlertTriangle },
  not_satisfied: { label: 'Not Satisfied', bg: 'bg-danger/10', border: 'border-danger/25', text: 'text-danger', icon: AlertTriangle },
};

const auditorStatusConfig = {
  pending_review: { label: 'Awaiting Review', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  confirmed: { label: 'Auditor Confirmed', bg: 'bg-success/10', text: 'text-success', border: 'border-success/25' },
  overridden: { label: 'Auditor Overridden', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/25' },
};

const priorityClasses = {
  HIGH: 'bg-danger/10 text-danger border-danger/25',
  MEDIUM: 'bg-warning/10 text-warning border-warning/25',
  LOW: 'bg-success/10 text-success border-success/25',
};

function ValidationCard({ validation, onAction }: { validation: AIValidation; onAction: (id: string, action: 'confirm' | 'override') => void }) {
  const [expanded, setExpanded] = useState(false);
  const vc = verdictConfig[validation.arcaVerdict];
  const VerdictIcon = vc.icon;
  const asc = auditorStatusConfig[validation.auditorStatus];

  return (
    <div className={`card-elevated border transition-all duration-200 ${validation.arcaVerdict === 'not_satisfied' ? 'border-danger/20' : validation.arcaVerdict === 'partially_satisfied' ? 'border-warning/20' : 'border-border'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${vc.bg} border ${vc.border}`}>
            <VerdictIcon size={15} className={vc.text} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono-data text-xs font-bold text-primary">{validation.mapId}</span>
              <span className="font-mono-data text-2xs text-muted-foreground">{validation.circularRef}</span>
              <span className="text-2xs text-muted-foreground">→ {validation.department}</span>
              <span className={`gate-badge border text-2xs ${priorityClasses[validation.priority]}`}>{validation.priority}</span>
            </div>
            <p className="text-sm font-medium text-foreground leading-snug mb-2 line-clamp-2">{validation.obligation}</p>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Brain size={10} className="text-primary" />
                <span className="text-2xs text-muted-foreground">ARCA verdict:</span>
                <span className={`text-2xs font-semibold font-mono-data ${vc.text}`}>{vc.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap size={10} className={validation.arcaConfidence >= 90 ? 'text-success' : validation.arcaConfidence >= 75 ? 'text-primary' : 'text-warning'} />
                <span className={`text-2xs font-mono-data font-semibold ${validation.arcaConfidence >= 90 ? 'text-success' : validation.arcaConfidence >= 75 ? 'text-primary' : 'text-warning'}`}>
                  {validation.arcaConfidence}% confidence
                </span>
              </div>
              <span className="text-2xs text-muted-foreground font-mono-data">by {validation.submittedBy} · {validation.submittedAt}</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`gate-badge border text-2xs ${asc.bg} ${asc.text} ${asc.border}`}>{asc.label}</span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-primary transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Collapse' : 'Full analysis'}
            </button>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {/* Evidence submitted */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <FileText size={12} className="text-muted-foreground" />
                <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Evidence Submitted</p>
              </div>
              <p className="text-xs text-foreground leading-relaxed">{validation.submittedEvidence}</p>
            </div>

            {/* ARCA reasoning */}
            <div className="px-4 py-3 rounded-md bg-primary/5 border border-primary/15">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={12} className="text-primary" />
                <p className="text-2xs font-medium text-primary uppercase tracking-wider">ARCA Reasoning</p>
                <span className="ml-auto font-mono-data text-2xs text-primary">{validation.arcaConfidence}% confidence</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">{validation.arcaReasoning}</p>
            </div>

            {/* Missing items */}
            {validation.arcaMissingItems && validation.arcaMissingItems.length > 0 && (
              <div className="px-4 py-3 rounded-md bg-warning/5 border border-warning/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} className="text-warning" />
                  <p className="text-2xs font-medium text-warning uppercase tracking-wider">Missing / Insufficient</p>
                </div>
                <ul className="space-y-1">
                  {validation.arcaMissingItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="text-warning mt-0.5">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Auditor actions */}
            {validation.auditorStatus === 'pending_review' && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-2xs text-muted-foreground">Confirm ARCA's verdict or override with your judgment</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAction(validation.id, 'override')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-all"
                  >
                    <ThumbsDown size={11} />
                    Override
                  </button>
                  <button
                    onClick={() => onAction(validation.id, 'confirm')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-success/15 text-success border border-success/30 hover:bg-success/25 transition-all"
                  >
                    <ThumbsUp size={11} />
                    Confirm Verdict
                  </button>
                </div>
              </div>
            )}

            {validation.auditorStatus !== 'pending_review' && (
              <div className="flex items-center gap-2 pt-2">
                <Eye size={12} className="text-muted-foreground" />
                <p className="text-2xs text-muted-foreground">
                  {validation.auditorStatus === 'confirmed' ?'You confirmed ARCA\'s verdict. This record is permanently logged.' :'You overrode ARCA\'s verdict. Your judgment is permanently logged.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIValidationsPage() {
  const [items, setItems] = useState(validations);
  const [filterVerdict, setFilterVerdict] = useState<string>('all');

  const handleAction = (id: string, action: 'confirm' | 'override') => {
    setItems((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, auditorStatus: action === 'confirm' ? 'confirmed' : 'overridden' } : v
      )
    );
    const v = items.find((x) => x.id === id);
    if (action === 'confirm') {
      toast.success(`Verdict confirmed for ${v?.mapId}. Record permanently logged.`);
    } else {
      toast.warning(`ARCA verdict overridden for ${v?.mapId}. Your judgment has been recorded.`);
    }
  };

  const filtered = items.filter((v) => filterVerdict === 'all' || v.arcaVerdict === filterVerdict);

  const counts = {
    all: items.length,
    fully_satisfied: items.filter((v) => v.arcaVerdict === 'fully_satisfied').length,
    partially_satisfied: items.filter((v) => v.arcaVerdict === 'partially_satisfied').length,
    not_satisfied: items.filter((v) => v.arcaVerdict === 'not_satisfied').length,
  };

  const pendingCount = items.filter((v) => v.auditorStatus === 'pending_review').length;

  return (
    <AppLayout activeRoute="/ai-validations">
      <div className="space-y-5 fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain size={14} className="text-primary" />
              <span className="text-2xs font-mono-data text-muted-foreground uppercase tracking-widest">AI Evidence Review</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Validations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">ARCA's evidence verdicts — confirm or override as the auditor of record</p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-warning/10 border border-warning/25">
              <Clock size={13} className="text-warning" />
              <span className="text-sm font-semibold text-warning font-mono-data">{pendingCount} awaiting your review</span>
            </div>
          )}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Validations', value: counts.all, color: 'text-foreground' },
            { label: 'Fully Satisfied', value: counts.fully_satisfied, color: 'text-success' },
            { label: 'Partial / Rejected', value: counts.partially_satisfied + counts.not_satisfied, color: 'text-warning' },
            { label: 'Pending Review', value: pendingCount, color: 'text-primary' },
          ].map((stat) => (
            <div key={stat.label} className="card-elevated border border-border px-4 py-3">
              <p className="text-2xs text-muted-foreground font-mono-data uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold font-mono-data ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'fully_satisfied', label: 'Fully Satisfied' },
            { key: 'partially_satisfied', label: 'Partial' },
            { key: 'not_satisfied', label: 'Not Satisfied' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterVerdict(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border ${
                filterVerdict === tab.key
                  ? 'bg-primary/10 text-primary border-primary/25' : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`font-mono-data text-2xs px-1 rounded ${filterVerdict === tab.key ? 'bg-primary/20' : 'bg-muted'}`}>
                {counts[tab.key as keyof typeof counts] ?? counts.all}
              </span>
            </button>
          ))}
        </div>

        {/* Validation list */}
        <div className="space-y-3">
          {filtered.map((v) => (
            <ValidationCard key={v.id} validation={v} onAction={handleAction} />
          ))}
        </div>

        {/* Info footer */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-md bg-muted/40 border border-border">
          <UserCheck size={13} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            As auditor, your confirmations and overrides are permanently recorded in the audit trail. HIGH priority tasks require Compliance Officer sign-off before closure regardless of ARCA verdict. Your role is to validate ARCA's reasoning, not re-review the evidence from scratch.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
