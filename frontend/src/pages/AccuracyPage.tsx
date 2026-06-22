'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import { TrendingUp, Brain, Edit3, Building2, Tag, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const accuracyTrend = [
  { month: 'Jan', confidence: 74, corrections: 18 },
  { month: 'Feb', confidence: 78, corrections: 14 },
  { month: 'Mar', confidence: 82, corrections: 11 },
  { month: 'Apr', confidence: 85, corrections: 9 },
  { month: 'May', confidence: 89, corrections: 6 },
  { month: 'Jun', confidence: 92, corrections: 4 },
];

const correctionsByType = [
  { type: 'Dept. Reassignment', count: 28, trend: 'down', change: -34 },
  { type: 'Deadline Correction', count: 19, trend: 'down', change: -22 },
  { type: 'Obligation Reword', count: 15, trend: 'down', change: -18 },
  { type: 'Priority Change', count: 11, trend: 'down', change: -45 },
  { type: 'Evidence Edit', count: 8, trend: 'stable', change: 0 },
  { type: 'MAP Rejection', count: 5, trend: 'down', change: -17 },
];

const correctionsByDept = [
  { dept: 'Legal', corrections: 22 },
  { dept: 'Operations', corrections: 18 },
  { dept: 'Compliance', corrections: 14 },
  { dept: 'Risk', corrections: 10 },
  { dept: 'Treasury', corrections: 6 },
  { dept: 'HR', corrections: 4 },
  { dept: 'IT', corrections: 3 },
  { dept: 'Finance', corrections: 2 },
];

const recentCorrections = [
  { id: 'c001', date: '07 Jun 2026', circularRef: 'RBI/2026-27/18', mapId: 'MAP-2026-035', type: 'Dept. Reassignment', from: 'Compliance', to: 'Risk', officer: 'Ananya Sharma' },
  { id: 'c002', date: '05 Jun 2026', circularRef: 'DBR.CID.No.43/2026', mapId: 'MAP-2026-043', type: 'Deadline Correction', from: '30 Jun 2026', to: '21 Jun 2026', officer: 'Ananya Sharma' },
  { id: 'c003', date: '01 Jun 2026', circularRef: 'RBI/2026-27/18', mapId: 'MAP-2026-034', type: 'Priority Change', from: 'MEDIUM', to: 'HIGH', officer: 'Ananya Sharma' },
  { id: 'c004', date: '28 May 2026', circularRef: 'DPSS.CO.PD.No.12/2026', mapId: 'MAP-2026-028', type: 'Dept. Reassignment', from: 'IT', to: 'Operations', officer: 'Ananya Sharma' },
  { id: 'c005', date: '22 May 2026', circularRef: 'DOR.MRG.REC.No.9/2026', mapId: 'MAP-2026-021', type: 'Obligation Reword', from: 'Update M&A thresholds', to: 'Review and update M&A approval thresholds in treasury policy', officer: 'Ananya Sharma' },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card-elevated border border-border px-3 py-2 text-xs">
        <p className="font-mono-data text-muted-foreground mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-mono-data">
            {p.name}: <span className="font-bold">{p.value}{p.name === 'Confidence' ? '%' : ''}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AccuracyPage() {
  const currentConfidence = accuracyTrend[accuracyTrend.length - 1].confidence;
  const prevConfidence = accuracyTrend[accuracyTrend.length - 2].confidence;
  const confidenceDelta = currentConfidence - prevConfidence;
  const totalCorrections = correctionsByType.reduce((s, c) => s + c.count, 0);

  return (
    <AppLayout activeRoute="/accuracy">
      <div className="space-y-5 fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain size={14} className="text-primary" />
              <span className="text-2xs font-mono-data text-muted-foreground uppercase tracking-widest">Model Learning</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">ARCA Accuracy</h1>
            <p className="text-sm text-muted-foreground mt-0.5">How ARCA's extraction accuracy improves over time through officer corrections</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-success/10 border border-success/25">
            <TrendingUp size={14} className="text-success" />
            <span className="text-sm font-semibold text-success font-mono-data">+{confidenceDelta}% this month</span>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Current Confidence', value: `${currentConfidence}%`, sub: 'avg across all circulars', color: 'text-success' },
            { label: 'Total Corrections', value: totalCorrections, sub: 'since deployment', color: 'text-primary' },
            { label: 'Corrections This Month', value: 4, sub: 'down from 6 last month', color: 'text-foreground' },
            { label: 'Months Active', value: 6, sub: 'Jan 2026 — present', color: 'text-muted-foreground' },
          ].map((kpi) => (
            <div key={kpi.label} className="card-elevated border border-border px-4 py-3">
              <p className="text-2xs text-muted-foreground font-mono-data uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className={`text-2xl font-bold font-mono-data ${kpi.color}`}>{kpi.value}</p>
              <p className="text-2xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Confidence Trend */}
          <div className="card-elevated border border-border px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Confidence Trend</h3>
                <p className="text-2xs text-muted-foreground">Monthly average extraction confidence</p>
              </div>
              <TrendingUp size={14} className="text-success" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={accuracyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A843" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4A843" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,45,58,0.8)" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="confidence" name="Confidence" stroke="#D4A843" strokeWidth={2} fill="url(#confGrad)" dot={{ fill: '#D4A843', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Corrections per Month */}
          <div className="card-elevated border border-border px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Corrections per Month</h3>
                <p className="text-2xs text-muted-foreground">Officer edits — fewer means ARCA is learning</p>
              </div>
              <Edit3 size={14} className="text-primary" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={accuracyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,45,58,0.8)" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="corrections" name="Corrections" fill="#D4A843" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Corrections by Type + by Department */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By Type */}
          <div className="card-elevated border border-border px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={13} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Corrections by Type</h3>
            </div>
            <div className="space-y-2.5">
              {correctionsByType.map((item) => (
                <div key={item.type} className="flex items-center gap-3">
                  <span className="text-xs text-foreground flex-1 min-w-0 truncate">{item.type}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${(item.count / correctionsByType[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono-data text-xs text-foreground w-6 text-right">{item.count}</span>
                  <div className="flex items-center gap-0.5 w-14 justify-end">
                    {item.trend === 'down' ? (
                      <ArrowDown size={10} className="text-success" />
                    ) : item.trend === 'up' ? (
                      <ArrowUp size={10} className="text-danger" />
                    ) : (
                      <Minus size={10} className="text-muted-foreground" />
                    )}
                    <span className={`text-2xs font-mono-data ${item.trend === 'down' ? 'text-success' : item.trend === 'up' ? 'text-danger' : 'text-muted-foreground'}`}>
                      {item.change !== 0 ? `${item.change}%` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Department */}
          <div className="card-elevated border border-border px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={13} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Corrections by Department</h3>
            </div>
            <div className="space-y-2.5">
              {correctionsByDept.map((item) => (
                <div key={item.dept} className="flex items-center gap-3">
                  <span className="text-xs text-foreground w-20 flex-shrink-0">{item.dept}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${(item.corrections / correctionsByDept[0].corrections) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono-data text-xs text-foreground w-6 text-right">{item.corrections}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Corrections Log */}
        <div className="card-elevated border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Recent Corrections</h3>
            <p className="text-2xs text-muted-foreground">Each correction is saved to improve future extractions</p>
          </div>
          <div className="divide-y divide-border">
            {recentCorrections.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-start gap-4">
                <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Edit3 size={11} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono-data text-xs font-bold text-primary">{c.mapId}</span>
                    <span className="text-2xs text-muted-foreground font-mono-data">{c.circularRef}</span>
                    <span className="gate-badge bg-primary/10 text-primary border border-primary/25 text-2xs">{c.type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground line-through truncate max-w-[120px]">{c.from}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground font-medium truncate max-w-[160px]">{c.to}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xs font-mono-data text-muted-foreground">{c.date}</p>
                  <p className="text-2xs text-muted-foreground">{c.officer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
