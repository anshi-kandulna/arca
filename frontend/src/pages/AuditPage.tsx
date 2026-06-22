'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { ScrollText, Search, Download, CheckCircle, Edit3, Send, AlertTriangle, Eye, UserCheck, Clock, Filter, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  actionType: string;
  circularRef: string;
  mapId?: string;
  department?: string;
  details: string;
}

const actionTypeConfig: Record<string, { icon: React.ElementType; bg: string; text: string; label: string }> = {
  approval: { icon: CheckCircle, bg: 'bg-success-muted', text: 'text-success', label: 'Approval' },
  edit: { icon: Edit3, bg: 'bg-info-muted', text: 'text-info', label: 'Edit' },
  dispatch: { icon: Send, bg: 'bg-primary/10', text: 'text-primary', label: 'Dispatch' },
  escalation: { icon: AlertTriangle, bg: 'bg-danger-muted', text: 'text-danger', label: 'Escalation' },
  submission: { icon: UserCheck, bg: 'bg-info-muted', text: 'text-info', label: 'Submission' },
  verification: { icon: CheckCircle, bg: 'bg-success-muted', text: 'text-success', label: 'Verification' },
  detection: { icon: Eye, bg: 'bg-black', text: 'text-white', label: 'Detection' },
  rejection: { icon: AlertTriangle, bg: 'bg-warning-muted', text: 'text-warning', label: 'Rejection' },
  default: { icon: Activity, bg: 'bg-[#fbfbfa]', text: 'text-black', label: 'Action' }
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
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/audit', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setAuditLog(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch audit log", err);
        setLoading(false);
      });
  }, [token]);

  const filtered = auditLog.filter((entry) => {
    const matchSearch =
      (entry.circularRef || '').toLowerCase().includes(search.toLowerCase()) ||
      (entry.actor || '').toLowerCase().includes(search.toLowerCase()) ||
      (entry.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (entry.mapId?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchType = filterType === 'all' || entry.actionType === filterType;
    return matchSearch && matchType;
  });

  return (
    <AppLayout activeRoute="/audit">
      <div className="space-y-8 pb-12 fade-in-up">
        {/* Header - Editorial Layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-[3px] border-black pb-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ScrollText size={16} className="text-primary" strokeWidth={3} />
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-[0.2em]">Immutable Record</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-black leading-none tracking-tight">Audit Trail</h1>
          </div>
          <div className="mt-6 md:mt-0">
            <button className="flex items-center justify-center gap-3 px-6 py-3 bg-white border border-black text-black font-mono text-sm font-bold tracking-widest hover:bg-black hover:text-white transition-colors uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Stats - Brutalist */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: auditLog.length, color: 'text-black', border: 'border-black' },
            { label: 'Human Actions', value: auditLog.filter(e => e.actor !== 'ARCA System').length, color: 'text-primary', border: 'border-primary' },
            { label: 'System Events', value: auditLog.filter(e => e.actor === 'ARCA System').length, color: 'text-info', border: 'border-info' },
            { label: 'Escalations', value: auditLog.filter(e => e.actionType === 'escalation').length, color: 'text-danger', border: 'border-danger' },
          ].map((stat, idx) => (
            <div key={stat.label} className={`card-elevated bg-white p-5 border ${stat.border} stagger-${idx + 1}`}>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/60 mb-2">{stat.label}</p>
              <p className={`text-4xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters - Brutalist */}
        <div className="flex flex-col md:flex-row gap-0 border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="relative flex-1 border-b md:border-b-0 md:border-r border-black">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
            <input
              type="text"
              placeholder="Search circular, actor, MAP ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-mono text-black placeholder:text-black/40 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex items-center flex-wrap">
            <div className="px-4 py-4 border-r border-black flex items-center justify-center bg-[#fbfbfa]">
              <Filter size={18} className="text-black" />
            </div>
            {filterOptions.map((opt, idx) => (
              <button
                key={opt.key}
                onClick={() => setFilterType(opt.key)}
                className={`px-4 py-4 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${idx !== filterOptions.length - 1 ? 'border-r border-black' : ''} ${
                  filterType === opt.key
                    ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-[#fbfbfa]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="card-elevated bg-white p-0 overflow-hidden stagger-4">
          <div className="px-6 py-4 border-b-2 border-black flex items-center justify-between bg-[#fbfbfa]">
            <span className="text-sm font-mono font-bold uppercase tracking-widest text-black">
              {filtered.length} Event{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-black/50">Chronological Desc</span>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="w-10 h-10 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-mono uppercase tracking-widest font-bold text-black/60">Loading Audit Trail...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <ScrollText size={40} className="text-black/20 mx-auto mb-4" />
              <p className="text-sm font-mono uppercase tracking-widest font-bold text-black/60">No audit events match your filter</p>
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              {filtered.map((entry) => {
                const ac = actionTypeConfig[entry.actionType] || actionTypeConfig.default;
                const ActionIcon = ac.icon;
                const isSystem = entry.actor === 'ARCA System';

                return (
                  <div key={entry.id} className="p-6 hover:bg-[#fbfbfa] transition-colors border-l-4 border-transparent hover:border-black">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      
                      {/* Left Sidebar Time & Action */}
                      <div className="flex items-center gap-4 md:w-64 flex-shrink-0">
                        <div className={`w-12 h-12 flex items-center justify-center border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${ac.bg}`}>
                          <ActionIcon size={20} className={ac.text} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={12} className="text-black/50" />
                            <span className="text-xs font-mono font-bold text-black/70">{entry.timestamp.split('T')[1]?.substring(0, 5) || entry.timestamp}</span>
                          </div>
                          <span className={`px-2 py-1 border border-black text-[10px] font-mono font-bold uppercase tracking-widest ${ac.bg} ${ac.text}`}>{ac.label}</span>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <span className="text-lg font-serif font-bold text-black block">{entry.action}</span>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 bg-[#fbfbfa] px-3 py-1 border border-black">
                            <div className={`w-6 h-6 flex items-center justify-center border border-black ${isSystem ? 'bg-black text-white' : 'bg-primary text-white'}`}>
                              <span className="text-[10px] font-mono font-bold">
                                {isSystem ? 'S' : entry.actor.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="text-sm font-mono font-bold text-black">{entry.actor}</span>
                            <span className="text-[10px] font-mono font-bold text-black/50 uppercase tracking-widest">({entry.actorRole})</span>
                          </div>
                          
                          {entry.circularRef && (
                            <span className="px-3 py-1 bg-white border border-black text-[10px] font-mono font-bold text-black uppercase tracking-widest">REF: {entry.circularRef}</span>
                          )}
                          {entry.mapId && (
                            <span className="px-3 py-1 bg-white border border-black text-[10px] font-mono font-bold text-black uppercase tracking-widest">MAP: {entry.mapId}</span>
                          )}
                          {entry.department && (
                            <span className="px-3 py-1 bg-white border border-black text-[10px] font-mono font-bold text-black uppercase tracking-widest">DEPT: {entry.department}</span>
                          )}
                        </div>

                        <p className="text-sm font-sans font-medium text-black/80 leading-relaxed bg-[#fbfbfa] border-l-2 border-black p-3">
                          {entry.details}
                        </p>
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

