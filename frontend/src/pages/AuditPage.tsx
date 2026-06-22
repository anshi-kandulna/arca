'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ScrollText, Search, Download, CheckCircle, Edit3, Send, AlertTriangle, Eye, UserCheck, Clock, Filter } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  actionType: 'approval' | 'edit' | 'dispatch' | 'escalation' | 'submission' | 'verification' | 'detection' | 'rejection';
  circularRef: string;
  mapId?: string;
  department?: string;
  details: string;
}

const auditLog: AuditEntry[] = [
  { id: 'a001', timestamp: '07 Jun 2026, 16:45 IST', actor: 'Ananya Sharma', actorRole: 'Chief Compliance Officer', action: 'Approved MAP batch for dispatch', actionType: 'approval', circularRef: 'RBI/2026-27/18', mapId: 'MAP-2026-033 to MAP-2026-039', department: 'Multiple', details: '7 MAPs approved and dispatched to Legal, Operations, and Risk departments after Gate 1 review.' },
  { id: 'a002', timestamp: '07 Jun 2026, 16:30 IST', actor: 'Ananya Sharma', actorRole: 'Chief Compliance Officer', action: 'Edited MAP — department reassigned', actionType: 'edit', circularRef: 'RBI/2026-27/18', mapId: 'MAP-2026-035', department: 'Risk', details: 'Reassigned from "Compliance" to "Risk" department. ARCA correction saved for learning.' },
  { id: 'a003', timestamp: '07 Jun 2026, 14:32 IST', actor: 'ARCA System', actorRole: 'Automated Agent', action: 'New circular detected and processed', actionType: 'detection', circularRef: 'FEMA 389(1)/2026', details: 'Circular detected on RBI website. 3 MAPs extracted with 93.4% confidence. Awaiting Gate 1 review.' },
  { id: 'a004', timestamp: '05 Jun 2026, 15:20 IST', actor: 'Priya Venkataraman', actorRole: 'Head of Legal', action: 'Evidence submitted for MAP', actionType: 'submission', circularRef: 'DBR.CID.No.43/2026', mapId: 'MAP-2026-041', department: 'Legal', details: 'Revised KYC Policy document (v2.3) submitted with Digital Nomad Visa added to OVD list. Board-approved version attached.' },
  { id: 'a005', timestamp: '05 Jun 2026, 09:15 IST', actor: 'ARCA System', actorRole: 'Automated Agent', action: 'New circular detected and processed', actionType: 'detection', circularRef: 'DBR.CID.No.43/2026', details: 'Circular detected on RBI website. 5 MAPs extracted with 89.2% confidence. Awaiting Gate 1 review.' },
  { id: 'a006', timestamp: '04 Jun 2026, 11:00 IST', actor: 'ARCA System', actorRole: 'Automated Agent', action: 'Evidence verified — task closed', actionType: 'verification', circularRef: 'RBI/2026-27/18', mapId: 'MAP-2026-036', department: 'Operations', details: 'Submitted evidence reviewed. Document inventory list satisfies requirement. Task automatically closed (MEDIUM priority, confidence 91%).' },
  { id: 'a007', timestamp: '03 Jun 2026, 09:30 IST', actor: 'ARCA System', actorRole: 'Automated Agent', action: 'Escalation triggered — task overdue', actionType: 'escalation', circularRef: 'DPSS.CO.PD.No.12/2026', mapId: 'MAP-2026-028', department: 'Operations', details: 'Task deadline passed without submission. Escalation sent to Rajesh Nair (Head of Operations). Second reminder scheduled in 48 hours.' },
  { id: 'a008', timestamp: '01 Jun 2026, 17:15 IST', actor: 'Ananya Sharma', actorRole: 'Chief Compliance Officer', action: 'Gate 2 sign-off — HIGH priority task closed', actionType: 'approval', circularRef: 'RBI/2026-27/18', mapId: 'MAP-2026-033', department: 'Compliance', details: 'Compliance officer personally confirmed closure of HIGH priority task. Evidence reviewed and accepted. Permanent record created.' },
  { id: 'a009', timestamp: '01 Jun 2026, 14:00 IST', actor: 'Sunita Mehta', actorRole: 'Head of HR', action: 'Evidence submitted for MAP', actionType: 'submission', circularRef: 'DBR.CID.No.43/2026', mapId: 'MAP-2026-042', department: 'HR', details: 'Training completion certificates for 47 front-office staff submitted. Attendance register and training materials attached.' },
  { id: 'a010', timestamp: '31 May 2026, 10:45 IST', actor: 'ARCA System', actorRole: 'Automated Agent', action: 'Evidence rejected — insufficient proof', actionType: 'rejection', circularRef: 'DPSS.CO.PD.No.12/2026', mapId: 'MAP-2026-029', department: 'Operations', details: 'Submitted screenshot does not demonstrate completion of enhanced due diligence workflow. Missing: merchant risk scoring documentation. Returned to Operations for resubmission.' },
  { id: 'a011', timestamp: '28 May 2026, 16:20 IST', actor: 'ARCA System', actorRole: 'Automated Agent', action: 'New circular detected and processed', actionType: 'detection', circularRef: 'DPSS.CO.PD.No.12/2026', details: 'Circular detected on RBI website. 4 MAPs extracted with 85.6% confidence. Awaiting Gate 1 review.' },
  { id: 'a012', timestamp: '22 May 2026, 12:00 IST', actor: 'Ananya Sharma', actorRole: 'Chief Compliance Officer', action: 'Approved MAP batch for dispatch', actionType: 'approval', circularRef: 'DOR.MRG.REC.No.9/2026', mapId: 'MAP-2026-021 to MAP-2026-022', department: 'Treasury', details: '2 MAPs approved and dispatched to Treasury department after Gate 1 review.' },
];

const actionTypeConfig: Record<string, { icon: React.ElementType; bg: string; border: string; text: string; label: string }> = {
  approval: { icon: CheckCircle, bg: 'bg-success/10', border: 'border-success/25', text: 'text-success', label: 'Approval' },
  edit: { icon: Edit3, bg: 'bg-primary/10', border: 'border-primary/25', text: 'text-primary', label: 'Edit' },
  dispatch: { icon: Send, bg: 'bg-info/10', border: 'border-info/25', text: 'text-info', label: 'Dispatch' },
  escalation: { icon: AlertTriangle, bg: 'bg-danger/10', border: 'border-danger/25', text: 'text-danger', label: 'Escalation' },
  submission: { icon: UserCheck, bg: 'bg-blue-500/10', border: 'border-blue-500/25', text: 'text-blue-400', label: 'Submission' },
  verification: { icon: CheckCircle, bg: 'bg-teal-500/10', border: 'border-teal-500/25', text: 'text-teal-400', label: 'Verification' },
  detection: { icon: Eye, bg: 'bg-purple-500/10', border: 'border-purple-500/25', text: 'text-purple-400', label: 'Detection' },
  rejection: { icon: AlertTriangle, bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-400', label: 'Rejection' },
};

const filterOptions = [
  { key: 'all', label: 'All Events' },
  { key: 'approval', label: 'Approvals' },
  { key: 'edit', label: 'Edits' },
  { key: 'escalation', label: 'Escalations' },
  { key: 'detection', label: 'Detections' },
  { key: 'submission', label: 'Submissions' },
  { key: 'verification', label: 'Verifications' },
];

export default function AuditTrailPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = auditLog.filter((entry) => {
    const matchSearch =
      entry.circularRef.toLowerCase().includes(search.toLowerCase()) ||
      entry.actor.toLowerCase().includes(search.toLowerCase()) ||
      entry.action.toLowerCase().includes(search.toLowerCase()) ||
      (entry.mapId?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchType = filterType === 'all' || entry.actionType === filterType;
    return matchSearch && matchType;
  });

  return (
    <AppLayout activeRoute="/audit">
      <div className="space-y-5 fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScrollText size={14} className="text-primary" />
              <span className="text-2xs font-mono-data text-muted-foreground uppercase tracking-widest">Immutable Record</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Audit Trail</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Complete history of every action taken in ARCA — exportable for RBI inspection</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
            <Download size={13} />
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Events', value: auditLog.length, color: 'text-foreground' },
            { label: 'Human Actions', value: auditLog.filter(e => e.actor !== 'ARCA System').length, color: 'text-primary' },
            { label: 'System Events', value: auditLog.filter(e => e.actor === 'ARCA System').length, color: 'text-purple-400' },
            { label: 'Escalations', value: auditLog.filter(e => e.actionType === 'escalation').length, color: 'text-danger' },
          ].map((stat) => (
            <div key={stat.label} className="card-elevated border border-border px-4 py-3">
              <p className="text-2xs text-muted-foreground font-mono-data uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold font-mono-data ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by circular, actor, MAP ID, or action…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-input border border-border rounded-md pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={12} className="text-muted-foreground mr-1" />
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterType(opt.key)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${
                  filterType === opt.key
                    ? 'bg-primary/10 text-primary border-primary/25' :'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="card-elevated border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-2xs font-mono-data text-muted-foreground">Sorted by most recent</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ScrollText size={24} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No audit events match your filter</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((entry) => {
                const ac = actionTypeConfig[entry.actionType] || actionTypeConfig.detection;
                const ActionIcon = ac.icon;
                const isSystem = entry.actor === 'ARCA System';

                return (
                  <div key={entry.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-md ${ac.bg} border ${ac.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <ActionIcon size={13} className={ac.text} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{entry.action}</span>
                            <span className={`gate-badge border text-2xs ${ac.bg} ${ac.text} ${ac.border}`}>{ac.label}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Clock size={10} className="text-muted-foreground" />
                            <span className="text-2xs font-mono-data text-muted-foreground">{entry.timestamp}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isSystem ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-primary/20 border border-primary/30'}`}>
                              <span className={`text-2xs font-bold ${isSystem ? 'text-purple-400' : 'text-primary'}`}>
                                {isSystem ? 'A' : entry.actor.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-foreground">{entry.actor}</span>
                            <span className="text-2xs text-muted-foreground">·</span>
                            <span className="text-2xs text-muted-foreground">{entry.actorRole}</span>
                          </div>
                          <span className="font-mono-data text-2xs font-bold text-primary">{entry.circularRef}</span>
                          {entry.mapId && (
                            <span className="font-mono-data text-2xs text-muted-foreground">{entry.mapId}</span>
                          )}
                          {entry.department && (
                            <span className="text-2xs text-muted-foreground">→ {entry.department}</span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">{entry.details}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
