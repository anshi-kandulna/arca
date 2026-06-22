'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Link } from 'react-router-dom';
import {
  FileSearch, CheckSquare, AlertTriangle, TrendingUp, Clock, Zap,
  Activity, FileText, ArrowUpRight, CheckCircle, ChevronUp, ChevronDown, ExternalLink,
  ClipboardCheck, ArrowRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

// --- HELPER COMPONENTS ---

const vClasses: Record<string, any> = {
  warning: { icon: 'text-warning', val: 'text-warning', border: 'border-warning/25', bg: 'bg-warning/5' },
  danger: { icon: 'text-danger', val: 'text-danger', border: 'border-danger/25', bg: 'bg-danger/5' },
  success: { icon: 'text-success', val: 'text-success', border: 'border-success/20', bg: 'bg-success/5' },
  primary: { icon: 'text-primary', val: 'text-primary', border: 'border-primary/25', bg: 'bg-primary/5' },
  info: { icon: 'text-info', val: 'text-info', border: 'border-info/20', bg: 'bg-info/5' },
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-semibold font-mono-data" style={{ color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---

export default function DashboardPage() {
  const { token } = useAuth();
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  const [data, setData] = useState<any>({
    metrics: { gate1: 0, overdue: 0, compliance: 0, deadlines: 0 },
    trendData: [],
    deptData: [],
    recent_circulars: []
  });

  useEffect(() => {
    fetch('http://localhost:8000/api/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(json => {
        if(json.metrics) setData(json);
      })
      .catch(err => console.error("Failed to load dashboard data", err));
  }, [token]);

  const metricsArray = [
    { id: 'gate1', label: 'Gate 1 Queue', value: data.metrics.gate1, unit: 'items', icon: FileSearch, variant: 'warning', hero: true, href: '/map-review-screen' },
    { id: 'overdue', label: 'Overdue', value: data.metrics.overdue, unit: 'tasks', icon: AlertTriangle, variant: 'danger', hero: false, href: null },
    { id: 'compliance', label: 'Compliance Rate', value: data.metrics.compliance, unit: '%', icon: TrendingUp, variant: 'success', hero: false, href: null },
    { id: 'deadlines', label: 'Upcoming', value: data.metrics.deadlines, unit: 'tasks', icon: Clock, variant: 'info', hero: false, href: null },
  ];

  // Use recent_circulars from backend for activities instead of hardcoded data
  const activities = data.recent_circulars.slice(0, 3).map((c: any, i: number) => ({
    id: c.id,
    icon: FileText,
    color: 'text-primary',
    bg: 'bg-primary/10',
    title: `New circular: ${c.ref_number}`,
    time: new Date(c.date).toLocaleDateString()
  }));

  return (
    <AppLayout activeRoute="/">
      <div className="space-y-6 fade-in-up">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/map-review-screen" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent transition-all">
              <ClipboardCheck size={14} /><span>Review MAPs</span><ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricsArray.map((m) => {
            const Icon = m.icon;
            const v = vClasses[m.variant];
            const content = (
              <>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{m.label}</p>
                  <Icon size={16} className={v.icon} />
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-3xl font-bold font-mono-data ${v.val}`}>{m.value}</span>
                  <span className={`text-xs ${v.val} opacity-70`}>{m.unit}</span>
                </div>
              </>
            );

            if (m.href) {
              return (
                <Link key={m.id} to={m.href} className={`col-span-${m.hero ? 2 : 1} card-elevated-hover p-4 ${v.bg} border ${v.border} flex flex-col justify-between`}>
                  {content}
                </Link>
              );
            }
            return (
              <div key={m.id} className={`col-span-${m.hero ? 2 : 1} card-elevated-hover p-4 ${v.bg} border ${v.border} flex flex-col justify-between`}>
                {content}
              </div>
            );
          })}
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 card-elevated p-5">
            <h3 className="text-sm font-semibold mb-4">Compliance Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={2} fill="url(#grad)" activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="xl:col-span-2 card-elevated p-5">
            <h3 className="text-sm font-semibold mb-4">Department Health</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.deptData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="dept" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="rate" radius={[0, 3, 3, 0]} maxBarSize={14}>
                  {data.deptData.map((e: any, i: number) => (
                    <Cell key={i} fill={e.rate >= 90 ? 'var(--success)' : e.rate >= 75 ? 'var(--primary)' : 'var(--warning)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 card-elevated p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold">Upcoming Deadlines</h3>
              <div 
                className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              >
                Sort {sortDir === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 text-center text-sm text-muted-foreground">
                No upcoming deadlines for your active MAPs.
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 card-elevated p-5">
            <h3 className="text-sm font-semibold mb-4">Activity</h3>
            <div className="space-y-4">
              {activities.map(a => {
                const Icon = a.icon;
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${a.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={14} className={a.color} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono-data">{a.time}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
