'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Link } from 'react-router-dom';
import {
  FileSearch, AlertTriangle, TrendingUp, Clock, FileText, ArrowUpRight, CheckCircle, ChevronUp, ChevronDown, ArrowRight, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

const vClasses: Record<string, any> = {
  warning: { icon: 'text-warning', val: 'text-warning', bg: 'bg-warning-muted', border: 'border-warning' },
  danger: { icon: 'text-danger', val: 'text-danger', bg: 'bg-danger-muted', border: 'border-danger' },
  success: { icon: 'text-success', val: 'text-success', bg: 'bg-success-muted', border: 'border-success' },
  primary: { icon: 'text-primary', val: 'text-primary', bg: 'bg-black text-white', border: 'border-black' },
  info: { icon: 'text-info', val: 'text-info', bg: 'bg-info-muted', border: 'border-info' },
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black text-white px-3 py-2 border-none">
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-mono uppercase tracking-widest">
          {p.name}: <span className="text-primary">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  const [data, setData] = useState<any>({
    metrics: { gate1: 0, compliance: 0, deadlines: 0 },
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
    { id: 'gate1', label: 'Gate 1 Queue', value: data.metrics.gate1, unit: 'MAPs', icon: FileSearch, variant: 'warning', href: '/map-review-screen' },
    { id: 'compliance', label: 'Compliance Index', value: data.metrics.compliance, unit: '%', icon: TrendingUp, variant: 'success', href: null },
    { id: 'deadlines', label: 'Upcoming Target', value: data.metrics.deadlines, unit: 'Tasks', icon: Clock, variant: 'info', href: null },
  ];

  const activities = (data.recent_circulars || []).slice(0, 4).map((c: any, i: number) => ({
    id: c.id,
    icon: FileText,
    color: 'text-foreground',
    bg: 'bg-transparent border border-black',
    title: `${c.ref_number}`,
    time: new Date(c.date || c.created_at || Date.now()).toLocaleDateString()
  }));

  return (
    <AppLayout activeRoute="/">
      <div className="space-y-8 pb-12 fade-in-up">
        
        {/* HEADER - Editorial Layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-[3px] border-black pb-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-primary" strokeWidth={3} />
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-[0.2em]">Platform Overview</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-black leading-none tracking-tight">Intelligence</h1>
          </div>
          <div className="mt-6 md:mt-0">
            <Link to="/circulars" className="group inline-flex items-center justify-center gap-3 px-6 py-3 bg-white text-black border border-black font-mono text-sm font-bold tracking-widest hover:bg-black hover:text-white transition-colors uppercase">
              <span>Browse Circulars</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* METRICS GRID - Brutalist */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricsArray.map((m, idx) => {
            const Icon = m.icon;
            const content = (
              <>
                <div className="flex justify-between items-start mb-6">
                  <p className={`text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-foreground/80`}>{m.label}</p>
                  <Icon size={18} className={vClasses[m.variant]?.icon || 'text-foreground'} strokeWidth={2.5} />
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-mono font-bold tracking-tighter text-black`}>{m.value}</span>
                    <span className={`text-sm font-mono font-bold uppercase text-black/60`}>{m.unit}</span>
                  </div>
                </div>
              </>
            );

            const baseClasses = `card-elevated p-6 flex flex-col justify-between stagger-${idx + 1} bg-white`;
            const linkClasses = `card-elevated-hover p-6 flex flex-col justify-between stagger-${idx + 1} bg-white`;

            if (m.href) {
              return (
                <Link key={m.id} to={m.href} className={linkClasses}>
                  {content}
                </Link>
              );
            }
            return (
              <div key={m.id} className={baseClasses}>
                {content}
              </div>
            );
          })}
        </div>

        {/* CHARTS - Strict Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-3 card-elevated bg-white p-0 overflow-hidden flex flex-col stagger-3">
            <div className="p-5 border-b border-black flex items-center justify-between bg-[#fbfbfa]">
              <h3 className="text-lg font-serif text-black uppercase tracking-widest">Compliance Trajectory</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-1 bg-black text-white uppercase tracking-widest">30 Days</span>
            </div>
            <div className="p-6 flex-1">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#d1d1cf" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: '#111', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#111', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#111', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="rate" stroke="#FF3300" strokeWidth={3} fill="transparent" activeDot={{ r: 6, fill: '#FF3300', stroke: '#111', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="xl:col-span-2 card-elevated bg-white p-0 flex flex-col stagger-4">
            <div className="p-5 border-b border-black bg-[#fbfbfa]">
              <h3 className="text-lg font-serif text-black uppercase tracking-widest">Department Index</h3>
            </div>
            <div className="p-6 flex-1">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.deptData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="2 2" stroke="#d1d1cf" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#111', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="dept" tick={{ fill: '#111', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={180} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f0' }} />
                  <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="Completed" />
                  <Bar dataKey="pending" stackId="a" fill="#eab308" radius={[0, 4, 4, 0]} name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 card-elevated bg-white p-0 stagger-3">
            <div className="p-5 border-b border-black flex justify-between items-center bg-[#fbfbfa]">
              <h3 className="text-lg font-serif text-black uppercase tracking-widest">Imminent Action Required</h3>
              <div 
                className="cursor-pointer flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-black hover:text-primary transition-colors"
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              >
                Sort {sortDir === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </div>
            </div>
            <div className="p-0">
              {data.imminent_actions && data.imminent_actions.length > 0 ? (
                <div className="flex flex-col">
                  {data.imminent_actions.map((action: any, i: number) => (
                    <div key={action.id} className={`flex items-stretch ${i !== data.imminent_actions.length - 1 ? 'border-b border-black/10' : ''}`}>
                      <div className="w-12 bg-black/5 flex flex-col items-center justify-center border-r border-black/10 flex-shrink-0">
                        <AlertTriangle size={16} className={action.priority === 'HIGH' ? 'text-danger' : 'text-warning'} />
                      </div>
                      <div className="p-4 flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-primary">{action.ref}</p>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-black/5 text-black uppercase">{action.deadline}</span>
                        </div>
                        <p className="text-sm font-bold text-black line-clamp-2">{action.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center min-h-[200px]">
                  <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={24} className="text-black" />
                  </div>
                  <p className="text-sm font-mono uppercase tracking-widest text-black/60 font-bold">Zero Imminent Deadlines</p>
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-1 card-elevated bg-white p-0 stagger-4">
            <div className="p-5 border-b border-black bg-[#fbfbfa]">
              <h3 className="text-lg font-serif text-black uppercase tracking-widest">Log</h3>
            </div>
            <div className="p-0">
              {activities.length > 0 ? (
                <div className="flex flex-col">
                  {activities.map((a: any, i: number) => {
                    const Icon = a.icon;
                    return (
                      <div key={a.id} className={`flex items-stretch ${i !== activities.length - 1 ? 'border-b border-black/10' : ''}`}>
                        <div className="w-12 bg-black/5 flex items-center justify-center border-r border-black/10 flex-shrink-0">
                          <Icon size={16} className="text-black" />
                        </div>
                        <div className="p-4 flex-1">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-primary mb-1">New Circular</p>
                          <p className="text-sm font-bold text-black">{a.title}</p>
                          <p className="text-[10px] font-mono text-black/50 mt-2">{a.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 flex items-center justify-center">
                  <p className="text-xs font-mono uppercase tracking-widest text-black/40">No entries.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
