'use client';

import React, { Suspense, useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, AlertTriangle, Brain, Calendar, CheckCircle, ChevronDown, ChevronRight, ChevronUp, Clock, Edit3, FileText, Loader2, Save, Send, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PDFViewer } from '@/components/PDFViewer';

// --- Combined Components ---



interface CircularOption {
  id: string;
  refNumber: string;
  category: string;
  totalObligations: number;
  pendingCount: number;
}

interface CircularSelectorProps {
  circulars: CircularOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  FEMA: 'bg-primary/15 text-primary border-primary/25',
  'KYC/AML': 'bg-info/15 text-info border-info/25',
  'Prudential': 'bg-warning/15 text-warning border-warning/25',
  'Credit': 'bg-success/15 text-success border-success/25',
};

function CircularSelector({ circulars, selectedId, onSelect }: CircularSelectorProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      <span className="text-xs text-muted-foreground font-medium flex-shrink-0">Pending review:</span>
      {circulars.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`
            flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all duration-150 flex-shrink-0
            ${selectedId === c.id
              ? 'bg-primary/10 border-primary/30 text-foreground'
              : 'bg-card border-border text-secondary-foreground hover:border-primary/20 hover:bg-muted/50'
            }
          `}
        >
          <FileText size={13} className={selectedId === c.id ? 'text-primary' : 'text-muted-foreground'} />
          <div>
            <p className="text-xs font-semibold font-mono-data">{c.refNumber}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`gate-badge text-2xs ${categoryColors[c.category] || 'bg-muted text-muted-foreground border-border'}`}>
                {c.category}
              </span>
              {c.pendingCount > 0 && (
                <span className="gate-badge bg-warning/15 text-warning border-warning/25 text-2xs">
                  {c.pendingCount} pending
                </span>
              )}
            </div>
          </div>
          {selectedId === c.id && <ChevronRight size={12} className="text-primary ml-1" />}
        </button>
      ))}
    </div>
  );
}


interface CircularMetadata {
  refNumber: string;
  title: string;
  publishedDate: string;
  detectedDate: string;
  category: string;
  totalObligations: number;
  arcaConfidence: number;
  summary: string;
}

interface CircularMetadataHeaderProps {
  circular: CircularMetadata;
}

function CircularMetadataHeader({ circular }: CircularMetadataHeaderProps) {
  return (
    <div className="card-elevated border-l-2 border-l-primary p-5">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono-data text-sm font-bold text-primary">{circular.refNumber}</span>
            <span className="gate-badge bg-primary/15 text-primary border-primary/25">{circular.category}</span>
            <span className="gate-badge bg-muted text-muted-foreground border-border">
              {circular.totalObligations} obligations
            </span>
          </div>
          <h2 className="text-sm font-semibold text-foreground leading-relaxed mb-3">{circular.title}</h2>
        </div>

        <div className="flex flex-col gap-2 lg:w-52 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-muted-foreground" />
            <span className="text-2xs text-muted-foreground font-mono-data">Published {circular.publishedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-muted-foreground" />
            <span className="text-2xs text-muted-foreground font-mono-data">Detected {circular.detectedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}



interface BatchApproveBarProps {
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  dispatching: boolean;
  onDispatch: () => void;
  onApproveAll: () => void;
}

function BatchApproveBar({ approvedCount, pendingCount, rejectedCount, dispatching, onDispatch, onApproveAll }: BatchApproveBarProps) {
  const canDispatch = approvedCount > 0;

  return (
    <div className="sticky bottom-6 z-20">
      <div className="card-elevated border border-border amber-glow px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-success" />
            <span className="text-sm font-semibold text-foreground font-mono-data">{approvedCount}</span>
            <span className="text-xs text-muted-foreground">approved</span>
          </div>
          {rejectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-danger font-mono-data">{rejectedCount}</span>
              <span className="text-xs text-muted-foreground">rejected</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-warning" />
              <span className="text-sm font-semibold text-warning font-mono-data">{pendingCount}</span>
              <span className="text-xs text-muted-foreground">still pending</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <button
              onClick={onApproveAll}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              Approve remaining {pendingCount}
            </button>
          )}

          <button
            onClick={onDispatch}
            disabled={!canDispatch || dispatching}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150
              ${canDispatch && !dispatching
                ? 'bg-primary text-primary-foreground hover:bg-accent active:scale-95 amber-glow'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
            style={{ minWidth: '180px', justifyContent: 'center' }}
          >
            {dispatching ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Dispatching…
              </>
            ) : (
              <>
                <Send size={14} />
                Dispatch {approvedCount > 0 ? `${approvedCount} MAPs` : 'MAPs'} — Gate 1
              </>
            )}
          </button>
        </div>
      </div>

      {!canDispatch && (
        <p className="text-center text-2xs text-muted-foreground mt-2 font-mono-data">
          Approve at least one MAP before dispatching to departments
        </p>
      )}
    </div>
  );
}



interface MAPCardProps {
  map: MAP;
  index: number;
  onUpdate: (updates: Partial<MAP>) => void;
  departments: string[];
  isActive?: boolean;
  onSelect?: () => void;
}

const priorityClasses: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-600 border-red-500/30',
  HIGH: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  MEDIUM: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  LOW: 'bg-green-500/15 text-green-600 border-green-500/30',
};

const statusConfig: Record<string, { label: string; bg: string; border: string; text: string }> = {
  pending: { label: 'Pending Review', bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning' },
  approved: { label: 'Approved', bg: 'bg-success/10', border: 'border-success/20', text: 'text-success' },
  rejected: { label: 'Rejected', bg: 'bg-danger/10', border: 'border-danger/20', text: 'text-danger' },
  edited: { label: 'Edited — Pending', bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
  dispatched: { label: 'Dispatched', bg: 'bg-muted/20', border: 'border-muted', text: 'text-muted-foreground' },
};

function MAPCard({ map, index, onUpdate, departments, isActive, onSelect }: MAPCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    obligationText: map.obligationText,
    department: map.department,
    deadline: map.deadline,
    priority: map.priority,
    notes: map.notes,
  });

  const isDispatched = !['pending', 'approved', 'rejected', 'edited', 'draft'].includes(map.status);
  const displayStatus = isDispatched ? 'dispatched' : map.status;
  const sc = statusConfig[displayStatus] || statusConfig.pending;
  const confidenceColor = map.routingConfidence >= 90 ? 'text-success' : map.routingConfidence >= 80 ? 'text-primary' : 'text-warning';

  function handleSaveEdit() {
    onUpdate({ ...editValues, status: 'edited' });
    setEditing(false);
  }

  function handleCancelEdit() {
    setEditValues({
      obligationText: map.obligationText,
      department: map.department,
      deadline: map.deadline,
      priority: map.priority,
      notes: map.notes,
    });
    setEditing(false);
  }

  const cardBorder = isDispatched ? 'border-muted/50 opacity-70'
    : map.status === 'approved' ? 'border-success/30'
    : map.status === 'rejected' ? 'border-danger/20 opacity-60'
    : map.status === 'edited' ? 'border-primary/30' : 'border-border';

  const activeStyles = isActive ? 'ring-2 ring-primary/50 shadow-md transform scale-[1.01]' : '';

  return (
    <div 
      className={`card-elevated border ${cardBorder} ${activeStyles} transition-all duration-200 overflow-hidden cursor-pointer hover:border-primary/30`}
      onClick={onSelect}
    >
      {/* Card Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/20">
        <span className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
          <span className="text-2xs font-bold font-mono-data text-muted-foreground">{index}</span>
        </span>

        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="font-mono-data text-xs font-bold text-primary">{map.mapId}</span>
          <span className={`gate-badge ${priorityClasses[map.priority]}`}>{map.priority}</span>
          <span className={`gate-badge ${sc.bg.replace('bg-', 'bg-')} ${sc.text} border ${sc.border}`}>{sc.label}</span>
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
                  <label className="block text-xs font-medium text-foreground mb-1">Routing Reasoning</label>
                  <p className="text-2xs text-muted-foreground mb-1.5">Why this department was assigned by ARCA</p>
                  <p className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none italic">{map.routingReasoning}</p>
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
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                <div className="p-2 rounded-md bg-muted/40 border border-border overflow-hidden">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Department</p>
                  <p className="text-[11px] font-semibold text-foreground truncate" title={map.department}>{map.department}</p>
                </div>
                <div className="p-2 rounded-md bg-muted/40 border border-border overflow-hidden">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Deadline</p>
                  <p className="text-[11px] font-semibold font-mono-data text-foreground truncate" title={map.deadline}>{map.deadline}</p>
                </div>
                <div className="p-2 rounded-md bg-muted/40 border border-border overflow-hidden">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Priority</p>
                  <span className={`gate-badge inline-block text-[10px] px-1.5 py-0.5 ${priorityClasses[map.priority]}`}>{map.priority}</span>
                </div>
                <div className="p-2 rounded-md bg-muted/40 border border-border overflow-hidden">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Confidence</p>
                  <p className={`text-[11px] font-bold font-mono-data ${confidenceColor}`}>{map.routingConfidence}%</p>
                </div>
              </div>

              {/* Routing & Deadline Reasoning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="px-3 py-2.5 rounded-md bg-muted/30 border border-border">
                  <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Routing Reasoning</p>
                  <p className="text-xs text-secondary-foreground leading-relaxed italic">{map.routingReasoning}</p>
                </div>
                {map.deadlineReasoning && (
                  <div className="px-3 py-2.5 rounded-md bg-muted/30 border border-border">
                    <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Deadline Reasoning</p>
                    <p className="text-xs text-secondary-foreground leading-relaxed italic">{map.deadlineReasoning}</p>
                  </div>
                )}
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



interface MAPCardListProps {
  maps: MAP[];
  onUpdateMap: (mapId: string, updates: Partial<MAP>) => void;
  onApproveAll: () => void;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  dispatchedCount: number;
  departments: string[];
  activeMapId: string | null;
  onSelectMap: (id: string) => void;
}

function MAPCardList({ maps, onUpdateMap, onApproveAll, approvedCount, rejectedCount, pendingCount, dispatchedCount, departments, activeMapId, onSelectMap }: MAPCardListProps) {
  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-warning" />
            <span className="text-xs text-muted-foreground font-mono-data">{pendingCount} pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle size={13} className="text-success" />
            <span className="text-xs text-muted-foreground font-mono-data">{approvedCount} approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle size={13} className="text-danger" />
            <span className="text-xs text-muted-foreground font-mono-data">{rejectedCount} rejected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle size={13} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono-data">{dispatchedCount} dispatched</span>
          </div>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={onApproveAll}
            className="text-xs text-primary hover:text-accent transition-colors font-medium flex items-center gap-1"
          >
            <CheckCircle size={12} />
            Approve all remaining
          </button>
        )}
      </div>

      {/* MAP Cards */}
      {maps.map((map, idx) => (
        <MAPCard
          key={map.id}
          map={map}
          index={idx + 1}
          onUpdate={(updates) => onUpdateMap(map.id, updates)}
          departments={departments}
          isActive={activeMapId === map.id}
          onSelect={() => onSelectMap(map.id)}
        />
      ))}
    </div>
  );
}



export interface MAP {
  id: string;
  mapId: string;
  obligationText: string;
  department: string;
  deadline: string;
  deadlineReasoning?: string;
  routingReasoning: string;
  routingConfidence: number;
  pageNo?: number;
  matchedText?: string;
  bbox?: number[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  extractedClause: string;
  notes: string;
}


function MAPReviewPageInner() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const paramCircularId = searchParams.get('circular');
  
  const [selectedCircularId, setSelectedCircularId] = useState(paramCircularId || '');
  const [circularData, setCircularData] = useState<Record<string, any>>({});
  const [maps, setMaps] = useState<Record<string, MAP[]>>({});
  const [dispatching, setDispatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const circRes = await fetch('http://localhost:8000/api/circulars', { headers: { 'Authorization': `Bearer ${token}` } });
        const mapRes = await fetch('http://localhost:8000/api/maps', { headers: { 'Authorization': `Bearer ${token}` } });
        const deptRes = await fetch('http://localhost:8000/api/departments', { headers: { 'Authorization': `Bearer ${token}` } });
        
        const circs = await circRes.json();
        const allMaps = await mapRes.json();
        const depts = await deptRes.json();
        setDepartments(depts);
        
        const newCircData: Record<string, any> = {};
        const newMaps: Record<string, MAP[]> = {};
        
        circs.forEach((c: any) => {
          newCircData[c.id] = { ...c, maps: [] };
          newMaps[c.id] = [];
        });
        
        allMaps.forEach((m: any) => {
          if (newCircData[m.circularId]) {
            const frontendMap: MAP = {
              id: m.id,
              mapId: m.mapId,
              obligationText: m.action,
              department: m.department,
              deadline: m.deadline,
              deadlineReasoning: m.deadlineReasoning,
              routingReasoning: m.routingReasoning || 'Default routing.',
              routingConfidence: m.routingConfidence || 80,
              pageNo: m.pageNo,
              matchedText: m.matchedText,
              bbox: m.bbox,
              priority: m.priority,
              status: m.status === 'draft' ? 'pending' : m.status as any,
              extractedClause: m.clauseRef,
              notes: ''
            };
            newMaps[m.circularId].push(frontendMap);
          }
        });
        
        setCircularData(newCircData);
        setMaps(newMaps);
        if (circs.length > 0) {
          if (paramCircularId && newCircData[paramCircularId]) {
            setSelectedCircularId(paramCircularId);
          } else if (!selectedCircularId) {
            setSelectedCircularId(circs[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch map review data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]); // removed paramCircularId to avoid double fetch, we'll sync it separately

  useEffect(() => {
    if (paramCircularId && circularData[paramCircularId]) {
      setSelectedCircularId(paramCircularId);
    }
  }, [paramCircularId, circularData]);
  
  const circular = circularData[selectedCircularId];
  const currentMaps = maps[selectedCircularId] || [];

  const approvedCount = currentMaps.filter((m) => m.status === 'approved').length;
  const rejectedCount = currentMaps.filter((m) => m.status === 'rejected').length;
  const pendingCount = currentMaps.filter((m) => m.status === 'pending' || m.status === 'edited').length;
  const dispatchedCount = currentMaps.filter((m) => !['pending', 'approved', 'rejected', 'edited', 'draft'].includes(m.status)).length;

  async function updateMap(mapId: string, updates: Partial<MAP>) {
    // Capture original department BEFORE state update so we can detect a real change
    const originalMap = (maps[selectedCircularId] || []).find(m => m.id === mapId);
    const departmentChanged =
      updates.department !== undefined &&
      updates.department !== originalMap?.department;

    setMaps((prev) => ({
      ...prev,
      [selectedCircularId]: prev[selectedCircularId].map((m) =>
        m.id === mapId ? { ...m, ...updates } : m
      ),
    }));

    const backendUpdates: Record<string, any> = {};
    if (updates.obligationText !== undefined) backendUpdates.obligation_text = updates.obligationText;
    if (updates.department !== undefined) backendUpdates.department_raw = updates.department;
    if (updates.deadline !== undefined) backendUpdates.deadline_raw = updates.deadline;
    if (updates.extractedClause !== undefined) backendUpdates.clause_ref = updates.extractedClause;
    if (updates.priority !== undefined) backendUpdates.priority = updates.priority;
    if (updates.status !== undefined) backendUpdates.status = updates.status;

    try {
      await fetch(`http://localhost:8000/api/maps/${mapId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(backendUpdates)
      });

      // Only teach the routing agent when the department actually changed
      if (departmentChanged && updates.status === 'edited') {
        fetch(`http://localhost:8000/api/maps/${mapId}/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            corrected_department: updates.department,
            reasoning: `Compliance officer corrected routing: ${originalMap?.department} → ${updates.department}`
          })
        }).catch(err => console.warn('[ARCA] Feedback call failed (non-blocking):', err));
      }
    } catch (err) {
      console.error("Failed to update map", err);
      toast.error("Failed to update MAP in database");
    }
  }

  async function handleApproveAll() {
    const mapsToApprove = maps[selectedCircularId]?.filter((m) => m.status === 'pending' || m.status === 'edited') || [];
    if (mapsToApprove.length === 0) return;
    
    // Optimistically update UI
    setMaps((prev) => ({
      ...prev,
      [selectedCircularId]: prev[selectedCircularId].map((m) =>
        (m.status === 'pending' || m.status === 'edited') ? { ...m, status: 'approved' } : m
      ),
    }));
    
    // Call backend for each
    await Promise.all(mapsToApprove.map(m => 
      fetch(`http://localhost:8000/api/maps/${m.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      }).catch(err => console.error("Failed to approve map", m.id, err))
    ));
    
    toast.success(`${mapsToApprove.length} MAPs approved`);
  }

  async function handleDispatch() {
    if (approvedCount === 0) {
      toast.error('No MAPs approved — approve at least one MAP before dispatching');
      return;
    }
    setDispatching(true);
    try {
      const res = await fetch(`http://localhost:8000/api/circulars/${selectedCircularId}/dispatch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Dispatch failed');
      }
      
      toast.success(`${approvedCount} MAPs dispatched to departments — Gate 1 complete`, {
        description: `Circular ${circular.refNumber} · Reminders scheduled automatically`,
      });
      
      // Remove circular from the view since it's no longer pending_review
      const newCircularData = { ...circularData };
      delete newCircularData[selectedCircularId];
      setCircularData(newCircularData);
      
      const newMaps = { ...maps };
      delete newMaps[selectedCircularId];
      setMaps(newMaps);
      
      const remainingCircs = Object.values(newCircularData);
      if (remainingCircs.length > 0) {
        setSelectedCircularId(remainingCircs[0].id);
      } else {
        setSelectedCircularId('');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to dispatch MAPs');
    } finally {
      setDispatching(false);
    }
  }

  const circularsForSelector = Object.values(circularData).map((c) => ({
    id: c.id,
    refNumber: c.refNumber,
    category: c.category,
    totalObligations: c.totalObligations,
    pendingCount: maps[c.id]?.filter((m) => m.status === 'pending' || m.status === 'edited').length ?? 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">Loading MAP Review data…</div>
      </div>
    );
  }

  if (!circular) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">No circulars available for review.</div>
      </div>
    );
  }

  const activeMap = currentMaps.find(m => m.id === activeMapId) || null;

  return (
    <div className="space-y-5 fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="gate-badge bg-warning/15 text-warning border border-warning/30 text-xs px-2 py-0.5">GATE 1</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">MAP Review</h1>
        </div>
      </div>

      {/* Circular Selector */}
      <CircularSelector
        circulars={circularsForSelector}
        selectedId={selectedCircularId}
        onSelect={setSelectedCircularId}
      />

      {/* Split Pane Layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* LEFT PANE: Document Viewer */}
        <div className="lg:w-1/2 flex flex-col gap-4">
          <CircularMetadataHeader circular={circular} />
          
          <div className="card-elevated border border-border p-0 overflow-hidden bg-muted/10 h-[800px] flex flex-col relative">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex justify-between items-center">
              <span className="text-xs font-semibold text-foreground uppercase tracking-widest">Document Context</span>
              {activeMap && <span className="text-2xs text-muted-foreground font-mono-data">Targeting MAP: {activeMap.mapId}</span>}
            </div>
            
            <div className="flex-1 overflow-hidden relative bg-white/5">
              {activeMap ? (
                <PDFViewer 
                  url={`http://localhost:8000/api/circulars/${circular.id}/pdf`} 
                  token={token || ''}
                  pageNumber={activeMap.pageNo || 1}
                  bbox={activeMap.bbox as any} 
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground italic">
                  Select a MAP on the right to view its context in the document.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: MAP List */}
        <div className="lg:w-1/2 flex flex-col gap-4 h-[880px] overflow-y-auto pr-2 pb-24">
          <MAPCardList
            maps={currentMaps}
            onUpdateMap={updateMap}
            onApproveAll={handleApproveAll}
            approvedCount={approvedCount}
            rejectedCount={rejectedCount}
            pendingCount={pendingCount}
            dispatchedCount={dispatchedCount}
            departments={departments}
            activeMapId={activeMapId}
            onSelectMap={setActiveMapId}
          />
        </div>
      </div>

      {/* Batch Approve Bar - Fixed to bottom of right pane */}
      <div className="fixed bottom-0 right-0 w-full lg:w-1/2 p-4 bg-background/80 backdrop-blur-md border-t border-border z-30 lg:pr-6">
        <div className="max-w-7xl mx-auto">
          <BatchApproveBar
            approvedCount={approvedCount}
            pendingCount={pendingCount}
            rejectedCount={rejectedCount}
            dispatching={dispatching}
            onDispatch={handleDispatch}
            onApproveAll={handleApproveAll}
          />
        </div>
      </div>
    </div>
  );
}

export default function MAPReviewPage() {
  return (
    <Suspense fallback={
      <AppLayout activeRoute="/circulars">
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground text-sm">Loading MAP Review...</div>
        </div>
      </AppLayout>
    }>
      <AppLayout activeRoute="/circulars">
        <MAPReviewPageInner />
      </AppLayout>
    </Suspense>
  );
}
