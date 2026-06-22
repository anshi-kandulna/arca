'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Building2, CheckCircle, Clock, AlertTriangle, XCircle, ChevronDown, ChevronUp, User } from 'lucide-react';

interface DeptTask {
  id: string;
  mapId: string;
  circularRef: string;
  description: string;
  deadline: string;
  status: 'pending' | 'submitted' | 'verified' | 'overdue' | 'rejected';
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
}

interface Department {
  id: string;
  name: string;
  head: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  pendingTasks: number;
  healthScore: number;
  tasks: DeptTask[];
}

const departments: Department[] = [
  {
    id: 'dept-legal',
    name: 'Legal',
    head: 'Priya Venkataraman',
    totalTasks: 8,
    completedTasks: 5,
    overdueTasks: 0,
    pendingTasks: 3,
    healthScore: 92,
    tasks: [
      { id: 't1', mapId: 'MAP-2026-047', circularRef: 'FEMA 389(1)/2026', description: 'Remove all references to "Clause 9(1)(b)" from internal FEMA compliance documentation', deadline: '12 Jun 2026', status: 'pending', priority: 'HIGH' },
      { id: 't2', mapId: 'MAP-2026-048', circularRef: 'FEMA 389(1)/2026', description: 'Add definition of "Competent Authority" to FX Operations Policy document', deadline: '12 Jun 2026', status: 'pending', priority: 'HIGH' },
      { id: 't3', mapId: 'MAP-2026-041', circularRef: 'DBR.CID.No.43/2026', description: 'Update KYC Policy to include Digital Nomad Visa as OVD', deadline: '14 Jun 2026', status: 'submitted', priority: 'HIGH' },
    ],
  },
  {
    id: 'dept-compliance',
    name: 'Compliance',
    head: 'Ananya Sharma',
    totalTasks: 12,
    completedTasks: 10,
    overdueTasks: 1,
    pendingTasks: 1,
    healthScore: 78,
    tasks: [
      { id: 't4', mapId: 'MAP-2026-033', circularRef: 'RBI/2026-27/18', description: 'Update ICA timeline tracking in compliance monitoring system', deadline: '01 Jun 2026', status: 'overdue', priority: 'HIGH' },
      { id: 't5', mapId: 'MAP-2026-034', circularRef: 'RBI/2026-27/18', description: 'File revised compliance report with updated ICA thresholds', deadline: '10 Jun 2026', status: 'verified', priority: 'MEDIUM' },
    ],
  },
  {
    id: 'dept-operations',
    name: 'Operations',
    head: 'Rajesh Nair',
    totalTasks: 6,
    completedTasks: 3,
    overdueTasks: 2,
    pendingTasks: 1,
    healthScore: 55,
    tasks: [
      { id: 't6', mapId: 'MAP-2026-049', circularRef: 'FEMA 389(1)/2026', description: 'Review all internal documents referencing "NCLT" and replace with "Competent Authority"', deadline: '19 Jun 2026', status: 'pending', priority: 'MEDIUM' },
      { id: 't7', mapId: 'MAP-2026-028', circularRef: 'DPSS.CO.PD.No.12/2026', description: 'Implement enhanced due diligence for merchant onboarding workflow', deadline: '28 May 2026', status: 'overdue', priority: 'HIGH' },
    ],
  },
  {
    id: 'dept-hr',
    name: 'HR',
    head: 'Sunita Mehta',
    totalTasks: 4,
    completedTasks: 4,
    overdueTasks: 0,
    pendingTasks: 0,
    healthScore: 100,
    tasks: [
      { id: 't8', mapId: 'MAP-2026-042', circularRef: 'DBR.CID.No.43/2026', description: 'Conduct mandatory training for front-office staff on new OVD category', deadline: '21 Jun 2026', status: 'verified', priority: 'MEDIUM' },
    ],
  },
  {
    id: 'dept-risk',
    name: 'Risk',
    head: 'Vikram Bose',
    totalTasks: 5,
    completedTasks: 2,
    overdueTasks: 1,
    pendingTasks: 2,
    healthScore: 62,
    tasks: [
      { id: 't9', mapId: 'MAP-2026-055', circularRef: 'RBI/2026-27/11', description: 'Implement revised Supervisory Outlier Test for IRRBB measurement', deadline: '30 May 2026', status: 'overdue', priority: 'HIGH' },
      { id: 't10', mapId: 'MAP-2026-056', circularRef: 'RBI/2026-27/11', description: 'Update risk management framework documentation for IRRBB', deadline: '15 Jun 2026', status: 'pending', priority: 'MEDIUM' },
    ],
  },
  {
    id: 'dept-treasury',
    name: 'Treasury',
    head: 'Arun Krishnamurthy',
    totalTasks: 3,
    completedTasks: 3,
    overdueTasks: 0,
    pendingTasks: 0,
    healthScore: 100,
    tasks: [
      { id: 't11', mapId: 'MAP-2026-021', circularRef: 'DOR.MRG.REC.No.9/2026', description: 'Review and update M&A approval thresholds in treasury policy', deadline: '22 May 2026', status: 'verified', priority: 'LOW' },
    ],
  },
];

const taskStatusConfig = {
  pending: { label: 'Pending', bg: 'bg-warning/10', border: 'border-warning/25', text: 'text-warning', icon: Clock },
  submitted: { label: 'Submitted', bg: 'bg-info/10', border: 'border-info/25', text: 'text-info', icon: CheckCircle },
  verified: { label: 'Verified', bg: 'bg-success/10', border: 'border-success/25', text: 'text-success', icon: CheckCircle },
  overdue: { label: 'Overdue', bg: 'bg-danger/10', border: 'border-danger/25', text: 'text-danger', icon: AlertTriangle },
  rejected: { label: 'Rejected', bg: 'bg-danger/10', border: 'border-danger/25', text: 'text-danger', icon: XCircle },
};

const priorityClasses = {
  CRITICAL: 'bg-danger/15 text-danger border-danger/30',
  HIGH: 'bg-danger/10 text-danger border-danger/25',
  MEDIUM: 'bg-warning/10 text-warning border-warning/25',
  LOW: 'bg-success/10 text-success border-success/25',
};

function getHealthColor(score: number) {
  if (score >= 90) return 'text-success';
  if (score >= 70) return 'text-primary';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function getHealthBarColor(score: number) {
  if (score >= 90) return 'bg-success';
  if (score >= 70) return 'bg-primary';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

function DepartmentCard({ dept }: { dept: Department }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-elevated border border-border hover:border-primary/20 transition-all duration-200">
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-base font-bold text-foreground">{dept.name}</h3>
              <span className={`font-mono-data text-lg font-bold ${getHealthColor(dept.healthScore)}`}>
                {dept.healthScore}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              <User size={11} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{dept.head}</span>
            </div>

            {/* Health bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getHealthBarColor(dept.healthScore)}`}
                style={{ width: `${dept.healthScore}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-success" />
                <span className="text-xs font-mono-data text-foreground">{dept.completedTasks}</span>
                <span className="text-2xs text-muted-foreground">completed</span>
              </div>
              {dept.overdueTasks > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={11} className="text-danger" />
                  <span className="text-xs font-mono-data text-danger">{dept.overdueTasks}</span>
                  <span className="text-2xs text-muted-foreground">overdue</span>
                </div>
              )}
              {dept.pendingTasks > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-warning" />
                  <span className="text-xs font-mono-data text-warning">{dept.pendingTasks}</span>
                  <span className="text-2xs text-muted-foreground">pending</span>
                </div>
              )}
              <span className="text-2xs text-muted-foreground font-mono-data ml-auto">{dept.totalTasks} total tasks</span>
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        {dept.tasks.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-2xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? 'Hide tasks' : `View ${dept.tasks.length} active tasks`}
          </button>
        )}
      </div>

      {/* Tasks */}
      {expanded && dept.tasks.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {dept.tasks.map((task) => {
            const sc = taskStatusConfig[task.status];
            const StatusIcon = sc.icon;
            return (
              <div key={task.id} className="px-5 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono-data text-2xs font-bold text-primary">{task.mapId}</span>
                    <span className="text-2xs text-muted-foreground font-mono-data">{task.circularRef}</span>
                    <span className={`gate-badge border text-2xs ${priorityClasses[task.priority]}`}>{task.priority}</span>
                  </div>
                  <p className="text-xs text-foreground leading-snug mb-1">{task.description}</p>
                  <span className="text-2xs text-muted-foreground font-mono-data">Due {task.deadline}</span>
                </div>
                <span className={`gate-badge border text-2xs flex items-center gap-1 flex-shrink-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                  <StatusIcon size={9} />
                  {sc.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  const totalOverdue = departments.reduce((sum, d) => sum + d.overdueTasks, 0);
  const avgHealth = Math.round(departments.reduce((sum, d) => sum + d.healthScore, 0) / departments.length);

  return (
    <AppLayout activeRoute="/departments">
      <div className="space-y-5 fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={14} className="text-primary" />
              <span className="text-2xs font-mono-data text-muted-foreground uppercase tracking-widest">Department Overview</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Departments</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xs text-muted-foreground font-mono-data">Avg. Health</p>
              <p className={`text-lg font-bold font-mono-data ${getHealthColor(avgHealth)}`}>{avgHealth}%</p>
            </div>
            {totalOverdue > 0 && (
              <div className="px-3 py-2 rounded-md bg-danger/10 border border-danger/25 text-center">
                <p className="text-2xs text-muted-foreground font-mono-data">Overdue</p>
                <p className="text-lg font-bold font-mono-data text-danger">{totalOverdue}</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Departments', value: departments.length, color: 'text-foreground' },
            { label: 'Total Tasks', value: departments.reduce((s, d) => s + d.totalTasks, 0), color: 'text-foreground' },
            { label: 'Completed', value: departments.reduce((s, d) => s + d.completedTasks, 0), color: 'text-success' },
            { label: 'Overdue', value: totalOverdue, color: 'text-danger' },
          ].map((stat) => (
            <div key={stat.label} className="card-elevated border border-border px-4 py-3">
              <p className="text-2xs text-muted-foreground font-mono-data uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold font-mono-data ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Department Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {departments.map((dept) => (
            <DepartmentCard key={dept.id} dept={dept} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
