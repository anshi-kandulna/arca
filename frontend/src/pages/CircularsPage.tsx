'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { FileText, Search, Filter, Clock, CheckCircle, AlertTriangle, ChevronRight, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Circular {
  id: string;
  refNumber: string;
  title: string;
  category: string;
  publishedDate: string;
  detectedDate: string;
  totalObligations: number;
  completedObligations: number;
  status: 'pending_review' | 'in_progress' | 'completed' | 'overdue';
  arcaConfidence: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

import { useAuth } from '@/contexts/AuthContext';
const statusConfig = {
  pending_review: { label: 'Pending Review', bg: 'bg-warning/10', border: 'border-warning/25', text: 'text-warning', icon: Clock },
  in_progress: { label: 'In Progress', bg: 'bg-info/10', border: 'border-info/25', text: 'text-info', icon: AlertTriangle },
  completed: { label: 'Completed', bg: 'bg-success/10', border: 'border-success/25', text: 'text-success', icon: CheckCircle },
  overdue: { label: 'Overdue', bg: 'bg-danger/10', border: 'border-danger/25', text: 'text-danger', icon: AlertTriangle },
};

const priorityClasses = {
  HIGH: 'bg-danger/10 text-danger border-danger/25',
  MEDIUM: 'bg-warning/10 text-warning border-warning/25',
  LOW: 'bg-success/10 text-success border-success/25',
};

const categoryColors: Record<string, string> = {
  'FEMA': 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  'KYC/AML': 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  'Prudential': 'bg-teal-500/10 text-teal-400 border-teal-500/25',
  'Payments': 'bg-orange-500/10 text-orange-400 border-orange-500/25',
  'Regulatory': 'bg-pink-500/10 text-pink-400 border-pink-500/25',
  'Risk Management': 'bg-red-500/10 text-red-400 border-red-500/25',
};

export default function CircularsPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();
  const [circularsData, setCircularsData] = useState<Circular[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/circulars', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCircularsData(data);
      })
      .catch(err => console.error("Failed to fetch circulars", err));
  }, [token]);

  const filtered = circularsData.filter((c) => {
    const matchSearch =
      c.refNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: circularsData.length,
    pending_review: circularsData.filter((c) => c.status === 'pending_review').length,
    in_progress: circularsData.filter((c) => c.status === 'in_progress').length,
    overdue: circularsData.filter((c) => c.status === 'overdue').length,
    completed: circularsData.filter((c) => c.status === 'completed').length,
  };

  return (
    <AppLayout activeRoute="/circulars">
      <div className="space-y-5 fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-primary" />
              <span className="text-2xs font-mono-data text-muted-foreground uppercase tracking-widest">RBI Circular Registry</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Circulars</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All RBI circulars detected and processed by ARCA</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-data text-xs text-muted-foreground">{circularsData.length} total</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="font-mono-data text-xs text-warning">{counts.pending_review} pending review</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending_review', label: 'Pending Review' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border ${
                filterStatus === tab.key
                  ? 'bg-primary/10 text-primary border-primary/25' :'bg-muted/50 text-muted-foreground border-border hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
              <span className={`font-mono-data text-2xs px-1 rounded ${filterStatus === tab.key ? 'bg-primary/20' : 'bg-muted'}`}>
                {counts[tab.key as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by reference number, title, or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-input border border-border rounded-md pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Circular List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="card-elevated border border-border px-6 py-12 text-center">
              <Filter size={24} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No circulars match your filter</p>
            </div>
          ) : (
            filtered.map((circular) => {
              const sc = statusConfig[circular.status];
              const StatusIcon = sc.icon;
              const progress = circular.totalObligations > 0
                ? Math.round((circular.completedObligations / circular.totalObligations) * 100)
                : 0;
              const canReviewMAP = circular.status === 'pending_review' || circular.status === 'in_progress';

              return (
                <div
                  key={circular.id}
                  className="card-elevated border border-border hover:border-primary/25 transition-all duration-200 group"
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      {/* Left: Icon */}
                      <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText size={15} className="text-primary" />
                      </div>

                      {/* Center: Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono-data text-xs font-bold text-primary">{circular.refNumber}</span>
                          <span className={`gate-badge border text-2xs ${categoryColors[circular.category] || 'bg-muted text-muted-foreground border-border'}`}>
                            {circular.category}
                          </span>
                          <span className={`gate-badge border text-2xs ${priorityClasses[circular.priority]}`}>
                            {circular.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug mb-2 line-clamp-2">{circular.title}</p>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-2xs text-muted-foreground font-mono-data">Published {circular.publishedDate}</span>
                          <span className="text-2xs text-muted-foreground font-mono-data">Detected {circular.detectedDate}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-2xs text-muted-foreground font-mono-data">ARCA confidence:</span>
                            <span className={`text-2xs font-mono-data font-semibold ${circular.arcaConfidence >= 90 ? 'text-success' : circular.arcaConfidence >= 80 ? 'text-primary' : 'text-warning'}`}>
                              {circular.arcaConfidence}%
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${circular.status === 'completed' ? 'bg-success' : circular.status === 'overdue' ? 'bg-danger' : 'bg-primary'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-2xs font-mono-data text-muted-foreground flex-shrink-0">
                            {circular.completedObligations}/{circular.totalObligations} MAPs
                          </span>
                        </div>
                      </div>

                      {/* Right: Status + Action */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`gate-badge border text-2xs ${sc.bg} ${sc.text} ${sc.border} flex items-center gap-1`}>
                          <StatusIcon size={10} />
                          {sc.label}
                        </span>

                        {canReviewMAP ? (
                          <button
                            onClick={() => navigate(`/map-review-screen?circular=${circular.id}&ref=${encodeURIComponent(circular.refNumber)}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all duration-150"
                          >
                            <ClipboardCheck size={11} />
                            Review MAP
                            <ChevronRight size={10} />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                            <CheckCircle size={11} className="text-success" />
                            All MAPs closed
                          </span>
                        )}
                      </div>
                    </div>
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
