'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  ClipboardList, Clock, CheckCircle, AlertTriangle, Upload,
  FileText, ChevronDown, ChevronUp, ExternalLink, Send, X, Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig: any = {
  draft: { label: 'Pending', bg: 'bg-warning/10', border: 'border-warning/25', text: 'text-warning', icon: Clock },
  pending_evidence: { label: 'Pending Evidence', bg: 'bg-warning/10', border: 'border-warning/25', text: 'text-warning', icon: Clock },
  in_progress: { label: 'In Progress', bg: 'bg-info/10', border: 'border-info/25', text: 'text-info', icon: Send },
  under_review: { label: 'Under Review', bg: 'bg-info/10', border: 'border-info/25', text: 'text-info', icon: Send },
  completed: { label: 'Completed', bg: 'bg-success/10', border: 'border-success/25', text: 'text-success', icon: CheckCircle },
  closed: { label: 'Closed', bg: 'bg-success/10', border: 'border-success/25', text: 'text-success', icon: CheckCircle },
  rework_required: { label: 'Rejected — Resubmit', bg: 'bg-danger/10', border: 'border-danger/25', text: 'text-danger', icon: AlertTriangle },
  overdue: { label: 'Overdue', bg: 'bg-danger/10', border: 'border-danger/25', text: 'text-danger', icon: AlertTriangle },
};

const priorityClasses: any = {
  HIGH: 'bg-danger/10 text-danger border-danger/25',
  MEDIUM: 'bg-warning/10 text-warning border-warning/25',
  LOW: 'bg-success/10 text-success border-success/25',
};

function TaskCard({ task, token, onSubmitted }: { task: any, token: string, onSubmitted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');

  const sc = statusConfig[task.status] || statusConfig['draft'];
  const StatusIcon = sc.icon;
  const canSubmit = task.status === 'draft' || task.status === 'pending_evidence' || task.status === 'rework_required';

  const handleSubmit = async () => {
    if (!fileName) {
      toast.error('Please attach evidence before submitting');
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/maps/${task.id}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ file_name: fileName, notes: notes })
      });
      if (!res.ok) throw new Error('Submission failed');
      toast.success(`Evidence submitted for ${task.mapId}. ARCA will review within 24 hours.`);
      onSubmitted();
    } catch(err) {
      console.error(err);
      toast.error('Failed to submit evidence');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`card-elevated border transition-all duration-200 ${task.status === 'rework_required' ? 'border-danger/30' : 'border-border'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${sc.bg} border ${sc.border}`}>
            <StatusIcon size={15} className={sc.text} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono-data text-xs font-bold text-primary">{task.mapId}</span>
              <span className={`gate-badge border text-2xs ${priorityClasses[task.priority] || priorityClasses['MEDIUM']}`}>{task.priority}</span>
            </div>
            <p className="text-sm font-medium text-foreground leading-snug mb-1 line-clamp-2">{task.action}</p>
            <p className="text-2xs text-muted-foreground line-clamp-1 mb-2">{task.department}</p>

            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-2xs text-muted-foreground font-mono-data">Deadline: {task.deadline || 'None'}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`gate-badge border text-2xs ${sc.bg} ${sc.text} ${sc.border} flex items-center gap-1`}>
              <StatusIcon size={10} />
              {sc.label}
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-primary transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Collapse' : 'View details'}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            <div>
              <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Full Obligation</p>
              <p className="text-sm text-foreground leading-relaxed">{task.action}</p>
            </div>

            {canSubmit && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-foreground">Submit Evidence</p>
                <label className="flex items-center gap-3 px-4 py-3 rounded-md border border-dashed border-border hover:border-primary/40 bg-muted/30 cursor-pointer transition-all group">
                  <Paperclip size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    {fileName || 'Attach document, screenshot, or certificate…'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                  />
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes or context for the compliance team (optional)…"
                  rows={2}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                />
                <div className="flex items-center justify-between">
                  <p className="text-2xs text-muted-foreground">ARCA will review your submission within 24 hours</p>
                  <button
                    onClick={handleSubmit}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-primary text-background hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Submitting...' : 'Submit Evidence'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyTasksPage() {
  const { token, user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [tasksData, setTasksData] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/maps', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTasksData(data);
        }
      })
      .catch(err => console.error("Failed to fetch maps", err));
  }, [token, user]);

  const filteredTasks = tasksData.filter((task) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return ['pending_evidence', 'in_progress', 'draft'].includes(task.status);
    return task.status === filterStatus;
  });

  const counts = {
    all: tasksData.length,
    active: tasksData.filter(t => ['pending_evidence', 'in_progress', 'draft'].includes(t.status)).length,
    pending_evidence: tasksData.filter(t => t.status === 'pending_evidence' || t.status === 'draft').length,
    under_review: tasksData.filter(t => t.status === 'under_review').length,
    rework_required: tasksData.filter(t => t.status === 'rework_required').length,
    completed: tasksData.filter(t => t.status === 'completed' || t.status === 'closed').length,
    overdue: tasksData.filter(t => t.status === 'overdue').length,
  };

  return (
    <AppLayout activeRoute="/my-tasks">
      <div className="space-y-5 fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">My Tasks</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Assigned', value: counts.all, color: 'text-foreground' },
            { label: 'Pending Action', value: counts.pending_evidence + counts.rework_required, color: 'text-warning' },
            { label: 'Under Review', value: counts.under_review, color: 'text-info' },
            { label: 'Completed', value: counts.completed, color: 'text-success' },
          ].map((stat) => (
            <div key={stat.label} className="card-elevated border border-border px-4 py-3">
              <p className="text-2xs text-muted-foreground font-mono-data uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold font-mono-data ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {[
            { key: 'all', label: 'All Tasks' },
            { key: 'pending_evidence', label: 'Pending' },
            { key: 'rework_required', label: 'Rejected' },
            { key: 'under_review', label: 'Under Review' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border ${
                filterStatus === tab.key
                  ? 'bg-primary/10 text-primary border-primary/25' : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`font-mono-data text-2xs px-1 rounded ${filterStatus === tab.key ? 'bg-primary/20' : 'bg-muted'}`}>
                {counts[tab.key as keyof typeof counts] ?? counts.all}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="card-elevated border border-border px-6 py-12 text-center">
              <CheckCircle size={24} className="text-success mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tasks in this category</p>
            </div>
          ) : (
            filteredTasks.map((task) => <TaskCard key={task.id} task={task} token={token || ''} onSubmitted={() => window.location.reload()} />)
          )}
        </div>
      </div>
    </AppLayout>
  );
}
