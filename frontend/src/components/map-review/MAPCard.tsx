'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Edit3, ChevronDown, ChevronUp, Brain, AlertCircle, Save, X } from 'lucide-react';
import type { MAP } from './MAPReviewContent';

interface Props {
  map: MAP;
  index: number;
  onUpdate: (updates: Partial<MAP>) => void;
}

const departments = ['Legal', 'Compliance', 'Operations', 'Treasury', 'HR', 'IT', 'Risk', 'Finance', 'Audit'];

const priorityClasses: Record<string, string> = {
  HIGH: 'priority-high',
  MEDIUM: 'priority-medium',
  LOW: 'priority-low',
  CRITICAL: 'priority-critical',
};

const statusConfig: Record<string, { label: string; bg: string; border: string; text: string }> = {
  pending: { label: 'Pending Review', bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning' },
  approved: { label: 'Approved', bg: 'bg-success/10', border: 'border-success/20', text: 'text-success' },
  rejected: { label: 'Rejected', bg: 'bg-danger/10', border: 'border-danger/20', text: 'text-danger' },
  edited: { label: 'Edited — Pending', bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
  dispatched: { label: 'Dispatched', bg: 'bg-muted/20', border: 'border-muted', text: 'text-muted-foreground' },
};

export default function MAPCard({ map, index, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    obligationText: map.obligationText,
    department: map.department,
    deadline: map.deadline,
    evidenceRequirement: map.evidenceRequirement,
    priority: map.priority,
    notes: map.notes,
  });

  const isDispatched = !['pending', 'approved', 'rejected', 'edited', 'draft'].includes(map.status);
  const displayStatus = isDispatched ? 'dispatched' : map.status;
  const sc = statusConfig[displayStatus] || statusConfig.pending;
  const confidenceColor =
    map.confidenceScore >= 90 ? 'text-success' : map.confidenceScore >= 80 ? 'text-primary' : 'text-warning';

  function handleSaveEdit() {
    onUpdate({ ...editValues, status: 'edited' });
    setEditing(false);
  }

  function handleCancelEdit() {
    setEditValues({
      obligationText: map.obligationText,
      department: map.department,
      deadline: map.deadline,
      evidenceRequirement: map.evidenceRequirement,
      priority: map.priority,
      notes: map.notes,
    });
    setEditing(false);
  }

  const cardBorder = isDispatched ? 'border-muted/50 opacity-70'
    : map.status === 'approved' ?'border-success/30'
    : map.status === 'rejected' ?'border-danger/20 opacity-60'
    : map.status === 'edited' ?'border-primary/30' :'border-border';

  return (
    <div className={`card-elevated border ${cardBorder} transition-all duration-200 overflow-hidden`}>
      {/* Card Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/20">
        <span className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
          <span className="text-2xs font-bold font-mono-data text-muted-foreground">{index}</span>
        </span>

        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="font-mono-data text-xs font-bold text-primary">{map.mapId}</span>
          <span className={`gate-badge ${priorityClasses[map.priority]}`}>{map.priority}</span>
          <span className={`gate-badge ${sc.bg.replace('bg-', 'bg-')} ${sc.text} border ${sc.border}`}>{sc.label}</span>
          <div className="flex items-center gap-1 ml-1">
            <Brain size={11} className="text-muted-foreground" />
            <span className={`text-2xs font-mono-data font-semibold ${confidenceColor}`}>{map.confidenceScore}%</span>
            <span className="text-2xs text-muted-foreground font-mono-data">confidence</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Edit */}
          {map.status !== 'rejected' && !isDispatched && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Edit this MAP"
            >
              <Edit3 size={13} />
            </button>
          )}

          {/* Approve */}
          {map.status !== 'approved' && map.status !== 'rejected' && !isDispatched && (
            <button
              onClick={() => onUpdate({ status: 'approved' })}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-success/10 border border-success/25 text-success text-xs font-medium hover:bg-success/20 transition-all duration-150 active:scale-95"
            >
              <CheckCircle size={12} />
              Approve
            </button>
          )}

          {/* Reject */}
          {map.status !== 'rejected' && !isDispatched && (
            <button
              onClick={() => onUpdate({ status: 'rejected' })}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-danger/10 border border-danger/25 text-danger text-xs font-medium hover:bg-danger/20 transition-all duration-150 active:scale-95"
            >
              <XCircle size={12} />
              Reject
            </button>
          )}

          {/* Undo reject */}
          {map.status === 'rejected' && !isDispatched && (
            <button
              onClick={() => onUpdate({ status: 'pending' })}
              className="px-2.5 py-1 rounded-md bg-muted border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              Undo
            </button>
          )}

          {/* Undo approve */}
          {map.status === 'approved' && !isDispatched && (
            <button
              onClick={() => onUpdate({ status: 'pending' })}
              className="px-2.5 py-1 rounded-md bg-muted border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              Undo
            </button>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={expanded ? 'Collapse MAP details' : 'Expand MAP details'}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Card Body */}
      {expanded && (
        <div className="px-5 py-4 space-y-4">
          {editing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-primary/5 border border-primary/15 flex items-center gap-2">
                <AlertCircle size={13} className="text-primary flex-shrink-0" />
                <p className="text-xs text-primary">
                  Editing this MAP will mark it as corrected. ARCA will learn from this change.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">Obligation Text</label>
                  <p className="text-2xs text-muted-foreground mb-1.5">The exact action required by this regulation</p>
                  <textarea
                    value={editValues.obligationText}
                    onChange={(e) => setEditValues((v) => ({ ...v, obligationText: e.target.value }))}
                    rows={3}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Assigned Department</label>
                  <p className="text-2xs text-muted-foreground mb-1.5">Which department is responsible for this task</p>
                  <select
                    value={editValues.department}
                    onChange={(e) => setEditValues((v) => ({ ...v, department: e.target.value }))}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  >
                    {departments.map((d) => (
                      <option key={`dept-${d}`} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Deadline</label>
                  <p className="text-2xs text-muted-foreground mb-1.5">Completion deadline for this task</p>
                  <input
                    type="date"
                    value={editValues.deadline.split(' ').reverse().join('-').replace(/(\d{4})-(\w+)-(\d+)/, (_, y, m, d) => {
                      const months: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                      return `${y}-${months[m] || '06'}-${d.padStart(2, '0')}`;
                    })}
                    onChange={(e) => {
                      const [y, m, d] = e.target.value.split('-');
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      setEditValues((v) => ({ ...v, deadline: `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}` }));
                    }}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Priority Level</label>
                  <select
                    value={editValues.priority}
                    onChange={(e) => setEditValues((v) => ({ ...v, priority: e.target.value as MAP['priority'] }))}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  >
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                      <option key={`priority-${p}`} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">Evidence Requirement</label>
                  <p className="text-2xs text-muted-foreground mb-1.5">What proof of completion should look like</p>
                  <textarea
                    value={editValues.evidenceRequirement}
                    onChange={(e) => setEditValues((v) => ({ ...v, evidenceRequirement: e.target.value }))}
                    rows={2}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">Officer Notes</label>
                  <p className="text-2xs text-muted-foreground mb-1.5">Internal notes — not sent to the department</p>
                  <textarea
                    value={editValues.notes}
                    onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))}
                    rows={2}
                    placeholder="Add context or instructions for yourself…"
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-accent transition-all duration-150 active:scale-95"
                >
                  <Save size={12} />
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
                >
                  <X size={12} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-4">
              {/* Obligation */}
              <div>
                <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Obligation</p>
                <p className="text-sm text-foreground leading-relaxed">{map.obligationText}</p>
              </div>

              {/* Extracted Clause */}
              <div className="px-3 py-2.5 rounded-md bg-muted/50 border border-border">
                <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Source Clause</p>
                <p className="text-xs text-secondary-foreground font-mono-data leading-relaxed italic">{map.extractedClause}</p>
              </div>

              {/* Meta Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-muted/40 border border-border">
                  <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-1">Department</p>
                  <p className="text-xs font-semibold text-foreground">{map.department}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/40 border border-border">
                  <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-1">Deadline</p>
                  <p className="text-xs font-semibold font-mono-data text-foreground">{map.deadline}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/40 border border-border">
                  <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-1">Priority</p>
                  <span className={`gate-badge inline-block ${priorityClasses[map.priority]}`}>{map.priority}</span>
                </div>
                <div className="p-3 rounded-md bg-muted/40 border border-border">
                  <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-1">ARCA Confidence</p>
                  <p className={`text-xs font-bold font-mono-data ${confidenceColor}`}>{map.confidenceScore}%</p>
                </div>
              </div>

              {/* Evidence Requirement */}
              <div>
                <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Evidence Requirement</p>
                <p className="text-xs text-secondary-foreground leading-relaxed">{map.evidenceRequirement}</p>
              </div>

              {/* Notes */}
              {map.notes && (
                <div className="px-3 py-2 rounded-md bg-primary/5 border border-primary/15">
                  <p className="text-2xs font-medium uppercase tracking-widest text-primary mb-1">Officer Notes</p>
                  <p className="text-xs text-foreground">{map.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}