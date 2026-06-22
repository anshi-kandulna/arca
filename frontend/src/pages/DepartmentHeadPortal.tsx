'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  CheckCircle, Clock, Send, AlertTriangle, Users, FileText 
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
          // For demo, we just show all or filter if user has department
          // In a real app, backend would filter by user's department
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

  if (loading) {
    return (
      <AppLayout activeRoute="/department-portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm">Loading department portal…</div>
        </div>
      </AppLayout>
    );
  }

  const activeCount = tasks.filter(t => ['pending_evidence', 'draft', 'rework_required'].includes(t.status)).length;
  const reviewCount = tasks.filter(t => t.status === 'under_review').length;
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'closed').length;

  return (
    <AppLayout activeRoute="/department-portal">
      <div className="space-y-6 fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Department Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of all compliance tasks for your department</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-elevated px-5 py-4 border-warning/20">
            <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-1">Action Required</p>
            <p className="text-3xl font-bold text-warning font-mono-data">{activeCount}</p>
          </div>
          <div className="card-elevated px-5 py-4 border-info/20">
            <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-1">Under Review</p>
            <p className="text-3xl font-bold text-info font-mono-data">{reviewCount}</p>
          </div>
          <div className="card-elevated px-5 py-4 border-success/20">
            <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-1">Completed</p>
            <p className="text-3xl font-bold text-success font-mono-data">{completedCount}</p>
          </div>
        </div>

        <div className="card-elevated border border-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">MAP ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Obligation</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Deadline</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono-data font-medium text-foreground">{task.mapId}</td>
                  <td className="px-4 py-3 text-xs text-foreground max-w-xs truncate">{task.action}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="gate-badge bg-secondary text-secondary-foreground border border-border">
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono-data text-muted-foreground">{task.deadline || '-'}</td>
                  <td className="px-4 py-3 text-xs">
                    <button onClick={() => handleReassign(task.id)} className="text-primary hover:underline flex items-center gap-1">
                      <Users size={12} /> Reassign
                    </button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No tasks assigned to your department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
