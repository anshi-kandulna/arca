'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Search, Menu, ChevronDown, RefreshCw, Shield, ClipboardList, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/auth';

interface TopbarProps {
  onMobileMenuOpen: () => void;
}

export default function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const { user } = useAuth();
  const role = user?.role ?? 'compliance_officer';
  const notifications: any[] = []; // No backend endpoint for notifications yet
  const unreadCount = notifications.filter((n) => n.unread).length;

  const typeColors: Record<string, string> = {
    gate1: 'text-warning',
    gate2: 'text-primary',
    escalation: 'text-danger',
    overdue: 'text-danger',
    completed: 'text-success',
  };

  const roleIcon = role === 'compliance_officer'
    ? <Shield size={12} className="text-primary" />
    : role === 'department_user'
    ? <ClipboardList size={12} className="text-info" />
    : <UserCheck size={12} className="text-success" />;

  const roleLabel = role === 'compliance_officer' ?'COMPLIANCE OFFICER'
    : role === 'department_user' ?'DEPARTMENT USER' :'AUDITOR';

  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 lg:px-6 gap-4 flex-shrink-0 relative z-20">
      {/* Mobile menu */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search circulars, MAPs, departments… ⌘K"
            className="w-full bg-muted border border-border rounded-md pl-9 pr-4 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Role badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border">
          {roleIcon}
          <span className="text-2xs font-mono-data text-muted-foreground font-medium">{roleLabel}</span>
        </div>

        {/* User */}
        <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-muted transition-colors">
          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-2xs font-bold text-primary">{user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}</span>
          </div>
          <span className="hidden sm:block text-xs font-medium text-foreground">{user?.full_name ?? 'User'}</span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}