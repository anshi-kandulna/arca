'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { FileText, Search, Filter, Clock, CheckCircle, AlertTriangle, ClipboardCheck, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Circular {
  id: string;
  ref_number: string;
  title: string;
  category: string;
  published_date: string;
  created_at: string;
  total_obligations: number;
  completed_obligations: number;
  status: string;
  priority: string;
}

const statusConfig: Record<string, { label: string, bg: string, text: string, icon: any }> = {
  processing: { label: 'Processing', bg: 'bg-black text-white', text: 'text-white', icon: Clock },
  detected: { label: 'Detected', bg: 'bg-info-muted', text: 'text-info', icon: Clock },
  pending_review: { label: 'Pending Review', bg: 'bg-warning-muted', text: 'text-warning', icon: Clock },
  in_progress: { label: 'In Progress', bg: 'bg-primary text-white', text: 'text-white', icon: AlertTriangle },
  completed: { label: 'Completed', bg: 'bg-success-muted', text: 'text-success', icon: CheckCircle },
  overdue: { label: 'Overdue', bg: 'bg-danger-muted', text: 'text-danger', icon: AlertTriangle },
  default: { label: 'Unknown', bg: 'bg-white', text: 'text-black', icon: FileText }
};

const priorityClasses: Record<string, string> = {
  HIGH: 'bg-danger text-white border-black',
  MEDIUM: 'bg-warning text-white border-black',
  LOW: 'bg-success text-white border-black',
};

const categoryColors: Record<string, string> = {
  'FEMA': 'bg-[#EBEBE9] text-black border-black',
  'KYC/AML': 'bg-black text-white border-black',
  'Prudential': 'bg-primary text-white border-black',
  'Payments': 'bg-info text-white border-black',
  'Regulatory': 'bg-white text-black border-black',
  'Risk Management': 'bg-danger text-white border-black',
};

export default function CircularsPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();
  const [circularsData, setCircularsData] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/circulars', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCircularsData(data);
        } else if (data.circulars) {
          setCircularsData(data.circulars);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch circulars", err);
        setLoading(false);
      });
  }, [token]);

  const filtered = circularsData.filter((c) => {
    const matchSearch =
      (c.ref_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.category || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: circularsData.length,
    pending_review: circularsData.filter((c) => c.status === 'pending_review' || c.status === 'detected').length,
    in_progress: circularsData.filter((c) => c.status === 'in_progress').length,
    completed: circularsData.filter((c) => c.status === 'completed').length,
  };

  return (
    <AppLayout activeRoute="/circulars">
      <div className="space-y-8 pb-12 fade-in-up">
        {/* Header - Editorial Layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-[3px] border-black pb-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-primary" strokeWidth={3} />
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-[0.2em]">RBI Circular Registry</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-black leading-none tracking-tight">Circulars</h1>
          </div>
          <div className="mt-6 md:mt-0 flex items-center gap-4 bg-white border border-black p-3 px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="font-mono text-sm font-bold text-black uppercase tracking-widest">{circularsData.length} Total</span>
            <div className="w-1 h-8 bg-black/20" />
            <span className="font-mono text-sm font-bold text-primary uppercase tracking-widest">{counts.pending_review} Action Req.</span>
          </div>
        </div>

        {/* Filters and Search - Brutalist */}
        <div className="flex flex-col md:flex-row gap-0 border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="relative flex-1 border-b md:border-b-0 md:border-r border-black">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
            <input
              type="text"
              placeholder="Search reference, title, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-mono text-black placeholder:text-black/40 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex items-center flex-wrap">
            <div className="px-4 py-4 border-r border-black flex items-center justify-center bg-[#fbfbfa]">
              <Filter size={18} className="text-black" />
            </div>
            {[
              { key: 'all', label: 'All' },
              { key: 'detected', label: 'Action Req.' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
            ].map((tab, idx) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${idx !== 3 ? 'border-r border-black' : ''} ${
                  filterStatus === tab.key
                    ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-[#fbfbfa]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Circular List */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-12 text-center">
              <div className="w-10 h-10 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-mono uppercase tracking-widest font-bold text-black/60">Fetching Circulars...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-16 text-center">
              <Filter size={40} className="text-black/20 mx-auto mb-4" />
              <p className="text-sm font-mono uppercase tracking-widest font-bold text-black/60">No circulars match your filter.</p>
            </div>
          ) : (
            filtered.map((circular, idx) => {
              const sc = statusConfig[circular.status] || statusConfig.default;
              const StatusIcon = sc.icon;
              const total = circular.total_obligations || 0;
              const completed = circular.completed_obligations || 0;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
              const canReviewMAP = circular.status === 'pending_review' || circular.status === 'detected' || circular.status === 'in_progress';
              const pClass = priorityClasses[circular.priority || 'MEDIUM'];
              const cClass = categoryColors[circular.category || 'Regulatory'] || 'bg-white text-black border-black';

              return (
                <div
                  key={circular.id}
                  className={`card-elevated-hover bg-white p-0 flex flex-col lg:flex-row stagger-${(idx % 4) + 1}`}
                >
                  {/* Left: Icon & Core Info */}
                  <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-black flex gap-6">
                    <div className="w-16 h-16 bg-black flex items-center justify-center flex-shrink-0">
                      <FileText size={24} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <span className="text-2xl font-serif font-bold text-black tracking-tight">{circular.ref_number}</span>
                        <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border ${cClass}`}>
                          {circular.category || 'Regulatory'}
                        </span>
                        <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border ${pClass}`}>
                          PRIORITY: {circular.priority || 'MEDIUM'}
                        </span>
                      </div>
                      <p className="text-base font-sans text-black leading-snug mb-4">{circular.title}</p>
                      
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-[10px] font-mono font-bold text-black/50 uppercase tracking-widest mb-1">Published</p>
                          <p className="text-xs font-mono font-bold text-black">{circular.published_date ? new Date(circular.published_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="w-px h-6 bg-black/20" />
                        <div>
                          <p className="text-[10px] font-mono font-bold text-black/50 uppercase tracking-widest mb-1">Detected</p>
                          <p className="text-xs font-mono font-bold text-black">{circular.created_at ? new Date(circular.created_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Progress & Action */}
                  <div className="lg:w-72 bg-[#fbfbfa] flex flex-col">
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-end mb-2">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 border border-black text-[10px] font-mono font-bold uppercase tracking-widest ${sc.bg} ${sc.text}`}>
                          <StatusIcon size={12} /> {sc.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-black">
                          {completed}/{total} MAPs
                        </span>
                      </div>
                      <div className="h-2 w-full bg-black/10 mt-4 border border-black overflow-hidden">
                        <div
                          className={`h-full ${progress === 100 ? 'bg-success' : 'bg-primary'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {canReviewMAP ? (
                      <button
                        onClick={() => navigate(`/map-review-screen?circular=${circular.id}`)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-black hover:bg-primary text-white font-mono font-bold text-xs transition-colors uppercase tracking-widest border-t border-black"
                      >
                        <span>Review MAPs</span>
                        <ArrowUpRight size={16} />
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between px-6 py-4 bg-success text-white font-mono font-bold text-xs uppercase tracking-widest border-t border-black">
                        <span>All Processed</span>
                        <CheckCircle size={16} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
