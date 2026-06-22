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
  draft: { label: 'Pending', bg: 'bg-[#fbfbfa]', border: 'border-black', text: 'text-black', icon: Clock },
  pending_evidence: { label: 'Pending Evidence', bg: 'bg-warning-muted', border: 'border-warning', text: 'text-warning', icon: Clock },
  in_progress: { label: 'In Progress', bg: 'bg-info-muted', border: 'border-info', text: 'text-info', icon: Send },
  under_review: { label: 'Under Review', bg: 'bg-info-muted', border: 'border-info', text: 'text-info', icon: Send },
  completed: { label: 'Completed', bg: 'bg-success-muted', border: 'border-success', text: 'text-success', icon: CheckCircle },
  closed: { label: 'Closed', bg: 'bg-black', border: 'border-black', text: 'text-white', icon: CheckCircle },
  rework_required: { label: 'Rejected — Resubmit', bg: 'bg-danger-muted', border: 'border-danger', text: 'text-black', icon: AlertTriangle },
  overdue: { label: 'Overdue', bg: 'bg-danger text-black', border: 'border-danger', text: 'text-black', icon: AlertTriangle },
};

const priorityClasses: any = {
  HIGH: 'bg-danger-muted text-black border-danger',
  MEDIUM: 'bg-warning-muted text-black border-warning',
  LOW: 'bg-success-muted text-black border-success',
  CRITICAL: 'bg-danger text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
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
    <div className={`card-elevated border-2 transition-all duration-200 bg-white ${task.status === 'rework_required' ? 'border-danger shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]' : 'border-black'}`}>
      <div className="px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className={`w-12 h-12 flex items-center justify-center border-2 border-black flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${sc.bg} ${sc.text}`}>
            <StatusIcon size={20} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-sm font-bold bg-primary text-black px-2 py-0.5 border border-black">{task.mapId}</span>
              <span className={`px-2 py-0.5 border text-[10px] font-mono font-bold uppercase tracking-widest border-black ${priorityClasses[task.priority] || priorityClasses['MEDIUM']}`}>{task.priority}</span>
              <span className={`px-2 py-0.5 border text-[10px] font-mono font-bold uppercase tracking-widest border-black ${sc.bg} ${sc.text}`}>{sc.label}</span>
            </div>
            <p className="text-lg font-serif text-black leading-snug mb-2">{task.action}</p>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs font-mono font-bold bg-[#fbfbfa] px-2 py-1 border border-black text-black">DEPT: {task.department}</span>
              <span className="text-xs font-mono font-bold bg-white px-2 py-1 border border-black text-black/60">DUE: {task.deadline || 'None'}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 flex-shrink-0 mt-4 sm:mt-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 px-4 py-2 border border-black bg-[#fbfbfa] text-xs font-mono font-bold text-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {expanded ? 'Close' : 'Expand'}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-6 pt-6 border-t-2 border-black border-dashed space-y-6">
            <div className="bg-[#fbfbfa] p-4 border border-black border-l-4 border-l-primary">
              <p className="text-[10px] font-mono font-bold text-black/50 uppercase tracking-[0.2em] mb-2">Full Obligation Details</p>
              <p className="text-sm font-sans font-medium text-black leading-relaxed">{task.action}</p>
            </div>

            {canSubmit && (
              <div className="space-y-4 bg-white border border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-sm font-mono font-bold text-black uppercase tracking-widest border-b border-black pb-2">Submit Evidence</p>
                <label className="flex items-center gap-3 px-4 py-6 border-2 border-dashed border-black/30 hover:border-black bg-[#fbfbfa] cursor-pointer transition-all group group-hover:bg-black/5">
                  <Paperclip size={20} className="text-black/50 group-hover:text-black transition-colors" />
                  <span className="text-sm font-mono text-black/60 group-hover:text-black transition-colors">
                    {fileName || 'SELECT FILE (PDF/DOCX/PNG)...'}
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
                  placeholder="ADD NOTES OR CONTEXT FOR COMPLIANCE REVIEW (OPTIONAL)..."
                  rows={3}
                  className="w-full bg-[#fbfbfa] border border-black rounded-none px-4 py-3 text-sm font-mono text-black placeholder:text-black/40 focus:outline-none focus:ring-0 focus:border-primary resize-none transition-all"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <p className="text-[10px] font-mono font-bold text-black/50 uppercase tracking-widest">ARCA auto-reviews submissions within 24h</p>
                  <button
                    onClick={handleSubmit}
                    disabled={uploading}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-black text-white hover:bg-white hover:text-black font-mono text-sm font-bold uppercase tracking-widest border border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {uploading ? 'UPLOADING...' : 'SUBMIT EVIDENCE'}
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
      <div className="space-y-8 pb-12 fade-in-up">
        {/* Header - Editorial Layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-[3px] border-black pb-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={16} className="text-primary" strokeWidth={3} />
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-[0.2em]">Personal Queue</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-black leading-none tracking-tight">My Tasks</h1>
          </div>
        </div>

        {/* Stats Grid - Brutalist */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Assigned', value: counts.all, color: 'text-black', border: 'border-black' },
            { label: 'Pending Action', value: counts.pending_evidence + counts.rework_required, color: 'text-warning', border: 'border-warning' },
            { label: 'Under Review', value: counts.under_review, color: 'text-info', border: 'border-info' },
            { label: 'Completed', value: counts.completed, color: 'text-success', border: 'border-success' },
          ].map((stat, idx) => (
            <div key={stat.label} className={`card-elevated bg-white p-5 border ${stat.border} stagger-${idx + 1}`}>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/60 mb-2">{stat.label}</p>
              <p className={`text-4xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs - Brutalist */}
        <div className="flex items-center flex-wrap gap-0 border border-black bg-white inline-flex shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] stagger-4">
          {[
            { key: 'all', label: 'All Tasks' },
            { key: 'pending_evidence', label: 'Pending' },
            { key: 'rework_required', label: 'Rejected' },
            { key: 'under_review', label: 'Under Review' },
            { key: 'completed', label: 'Completed' },
          ].map((tab, idx) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`flex items-center gap-2 px-5 py-4 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors ${idx !== 0 ? 'border-l border-black' : ''} ${
                filterStatus === tab.key
                  ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-[#fbfbfa]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 border ${filterStatus === tab.key ? 'border-white/30 text-white' : 'border-black/20 text-black/50'}`}>
                {counts[tab.key as keyof typeof counts] ?? counts.all}
              </span>
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-6 stagger-4">
          {filteredTasks.length === 0 ? (
            <div className="card-elevated border-2 border-black border-dashed bg-[#fbfbfa] px-6 py-20 text-center">
              <CheckCircle size={40} className="text-black/20 mx-auto mb-4" />
              <p className="text-sm font-mono uppercase tracking-widest font-bold text-black/50">No tasks in this category</p>
            </div>
          ) : (
            filteredTasks.map((task) => <TaskCard key={task.id} task={task} token={token || ''} onSubmitted={() => window.location.reload()} />)
          )}
        </div>
      </div>
    </AppLayout>
  );
}
