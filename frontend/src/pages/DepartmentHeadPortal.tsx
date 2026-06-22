'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  CheckCircle, Clock, Send, AlertTriangle, Users, FileText, ChevronRight, Layers, Briefcase
} from 'lucide-react';

export default function DepartmentHeadPortal() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('http://localhost:8000/api/maps', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (err) {
        console.error("Failed to fetch department maps", err);
        toast.error('Failed to load department tasks');
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [token]);

  const handleReassign = (taskId: string) => {
    toast.success('Reassignment feature coming soon.');
  };

  const activeCount = tasks.filter(t => ['pending_evidence', 'draft', 'rework_required'].includes(t.status)).length;
  const reviewCount = tasks.filter(t => t.status === 'under_review').length;
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'closed').length;

  return (
    <AppLayout activeRoute="/department-portal">
      <div className="space-y-8 pb-12 fade-in-up">
        {/* Header - Editorial Layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-[3px] border-black pb-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={16} className="text-primary" strokeWidth={3} />
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-[0.2em]">Department Operations</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-black leading-none tracking-tight">Portal</h1>
          </div>
          <div className="mt-6 md:mt-0 flex items-center gap-4 bg-white border border-black p-3 px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="font-mono text-sm font-bold text-black uppercase tracking-widest">{tasks.length} Assigned MAPs</span>
          </div>
        </div>

        {/* METRICS GRID - Brutalist */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-elevated bg-warning-muted border-warning p-6 relative overflow-hidden stagger-1">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-warning mb-2 relative z-10">Action Required</p>
            <p className="text-5xl font-mono font-bold text-warning relative z-10">{activeCount}</p>
          </div>
          <div className="card-elevated bg-info-muted border-info p-6 relative overflow-hidden stagger-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-info mb-2 relative z-10">Under Review</p>
            <p className="text-5xl font-mono font-bold text-info relative z-10">{reviewCount}</p>
          </div>
          <div className="card-elevated bg-success-muted border-success p-6 relative overflow-hidden stagger-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-success mb-2 relative z-10">Completed</p>
            <p className="text-5xl font-mono font-bold text-success relative z-10">{completedCount}</p>
          </div>
        </div>

        <div className="card-elevated bg-white p-0 overflow-hidden stagger-4">
          <div className="px-6 py-5 border-b border-black bg-[#fbfbfa] flex items-center justify-between">
            <h3 className="text-lg font-serif text-black uppercase tracking-widest">Assigned MAPs</h3>
          </div>
          
          {loading ? (
             <div className="px-6 py-16 text-center">
               <div className="w-10 h-10 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-sm font-mono uppercase tracking-widest font-bold text-black/60">Loading Tasks...</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fbfbfa] border-b-2 border-black">
                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-black/60 uppercase tracking-[0.2em]">MAP ID</th>
                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-black/60 uppercase tracking-[0.2em]">Obligation</th>
                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-black/60 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-black/60 uppercase tracking-[0.2em]">Deadline</th>
                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-black/60 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {tasks.map(task => (
                    <tr key={task.id} className="hover:bg-black/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1 border border-primary/20">{task.mapId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-sans font-medium text-black max-w-sm truncate">{task.action}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border bg-[#fbfbfa] text-black border-black">
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-bold text-black/60">{task.deadline || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleReassign(task.id)} className="text-xs font-mono font-bold text-primary hover:text-white hover:bg-black px-4 py-2 border border-black transition-colors flex items-center gap-2 uppercase tracking-widest">
                          <Users size={14} /> Reassign
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-sm font-mono uppercase tracking-widest font-bold text-black/50">
                        No tasks assigned to your department.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
