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
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user, token } = useAuth();
  const role = user?.role ?? 'compliance_officer';
  
  const fetchNotifications = async () => {
    if (!token || !['department_user', 'department_head'].includes(role)) return;
    try {
      const res = await fetch('http://localhost:8000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30s just in case
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token, role]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const roleIcon = role === 'compliance_officer'
    ? <Shield size={14} className="text-black" />
    : role === 'department_user'
    ? <ClipboardList size={14} className="text-black" />
    : <UserCheck size={14} className="text-black" />;

  const roleLabel = role === 'compliance_officer' ?'COMPLIANCE OFFICER'
    : role === 'department_user' ?'DEPARTMENT USER' :'AUDITOR';

  return (
    <header className="h-16 bg-[#fbfbfa] border-b-4 border-black flex items-center px-4 lg:px-8 gap-4 flex-shrink-0 relative z-20">
      {/* Mobile menu */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden p-2 rounded-none border-2 border-transparent hover:border-black hover:bg-white transition-all shadow-none hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black transition-transform group-focus-within:scale-110" />
          <input
            type="text"
            placeholder="Search circulars, MAPs, departments… ⌘K"
            className="w-full bg-white border-2 border-black pl-11 pr-4 py-2 font-mono text-xs font-bold text-black uppercase tracking-widest placeholder:text-black/40 focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* Role badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {roleIcon}
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-black">{roleLabel}</span>
        </div>

        {/* Notifications (only for department users) */}
        {['department_user', 'department_head'].includes(role) && (
          <div className="relative">
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 border-2 border-transparent hover:border-black hover:bg-white transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 bg-white text-black text-[10px] font-mono font-bold border border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-4 w-80 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50">
                <div className="p-4 border-b-2 border-black flex justify-between items-center bg-[#fbfbfa]">
                  <span className="font-mono text-sm font-bold uppercase tracking-widest text-black">Notifications</span>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 bg-black text-white">{unreadCount} New</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono font-bold text-black/50 uppercase tracking-widest">
                      No recent notifications
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className={`p-4 border-b border-black/10 hover:bg-[#fbfbfa] transition-colors ${!notif.is_read ? 'border-l-4 border-l-black bg-black/5' : ''}`}>
                        <p className="text-xs font-serif text-black font-medium leading-snug">{notif.message}</p>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-black/50 uppercase">{new Date(notif.created_at).toLocaleDateString()}</span>
                          {!notif.is_read && (
                            <button 
                              onClick={() => markAsRead(notif.id)}
                              className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary hover:text-black transition-colors"
                            >
                              Mark as Read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}