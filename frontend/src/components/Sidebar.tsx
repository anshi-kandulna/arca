'use client';

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, FileText, Building2, ScrollText, TrendingUp, Settings, ChevronLeft, ChevronRight, LogOut, Shield, ClipboardList, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/auth';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  activeRoute?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge: { count: number; variant: string } | null;
  roles: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Command',
    items: [
      {
        id: 'nav-dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
        badge: null,
        roles: ['compliance_officer', 'department_user', 'system_admin', 'department_head'],
      },
      {
        id: 'nav-circulars',
        label: 'Circulars',
        icon: FileText,
        href: '/circulars',
        badge: null,
        roles: ['compliance_officer', 'department_user', 'system_admin', 'department_head'],
      },
      {
        id: 'nav-upload',
        label: 'Upload Circular',
        icon: FileText,
        href: '/upload',
        badge: null,
        roles: ['compliance_officer', 'system_admin'],
      },
      {
        id: 'nav-gate-2',
        label: 'Gate 2 Validation',
        icon: Shield,
        href: '/gate-2',
        badge: null,
        roles: ['compliance_officer', 'system_admin'],
      },
      {
        id: 'nav-my-tasks',
        label: 'My Tasks',
        icon: ClipboardList,
        href: '/my-tasks',
        badge: null,
        roles: ['department_user', 'system_admin'],
      },
      {
        id: 'nav-dept-portal',
        label: 'Department Portal',
        icon: Building2,
        href: '/department-portal',
        badge: null,
        roles: ['department_head', 'system_admin'],
      },
      {
        id: 'nav-audit',
        label: 'Audit Trail',
        icon: ScrollText,
        href: '/audit',
        badge: null,
        roles: ['compliance_officer', 'system_admin', 'department_user', 'department_head'],
      },
    ],
  }
];

const badgeVariantClasses: Record<string, string> = {
  warning: 'bg-warning-muted text-warning border border-black',
  danger: 'bg-danger text-white border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
  info: 'bg-info-muted text-info border border-black',
};

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  activeRoute = '/',
}: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col bg-[#fbfbfa] border-r-4 border-black sidebar-transition z-30 relative
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          activeRoute={activeRoute}
        />
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`
          fixed lg:hidden top-0 left-0 h-full w-64 bg-[#fbfbfa] border-r-4 border-black z-50
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent
          collapsed={false}
          onToggleCollapse={onMobileClose}
          activeRoute={activeRoute}
          isMobile
        />
      </aside>
    </>
  );
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
  activeRoute,
  isMobile = false,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeRoute: string;
  isMobile?: boolean;
}) {
  const { user, logout } = useAuth();

  const userRole = (user?.role ?? 'compliance_officer') as UserRole;

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(userRole)),
    }))
    .filter((group) => group.items.length > 0);

  const handleSignOut = () => {
    logout();
    window.location.href = '/login';
  };

  const initials = user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  const displayName = user?.full_name ?? 'User';
  const displayTitle = userRole === 'compliance_officer' ? 'Compliance Officer'
    : userRole === 'department_user' ? 'Department User'
      : userRole === 'department_head' ? 'Department Head'
        : 'User';

  return (
    <div className="flex flex-col h-full bg-[#fbfbfa]">
      {/* Logo */}
      <div className={`flex items-center h-16 border-b-2 border-black px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <AppLogo size={36} />
            <span className="font-serif font-bold text-xl tracking-tighter text-black">
              ARCA
            </span>
          </div>
        )}
        {collapsed && <AppLogo size={24} />}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-none text-black hover:bg-black hover:text-white border border-transparent hover:border-black transition-colors duration-150 flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        {filteredGroups.map((group) => (
          <div key={`group-${group.label}`}>
            {!collapsed && (
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-black/50 px-2 mb-3">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const isActive = activeRoute === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className={`
                        group relative flex items-center gap-3 px-3 py-3 font-mono font-bold text-xs uppercase tracking-widest
                        transition-all duration-150 border-2
                        ${isActive
                          ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-black border-transparent hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        }
                        ${collapsed ? 'justify-center' : ''}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <ItemIcon size={16} className={`flex-shrink-0 ${isActive ? 'text-primary' : 'text-black/70 group-hover:text-black'}`} strokeWidth={isActive ? 3 : 2} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold ${badgeVariantClasses[item.badge.variant]}`}>
                              {item.badge.count}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-none border border-black bg-danger" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className={`border-t-2 border-black p-4 bg-white ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2 py-2 border-2 border-transparent hover:border-black transition-colors cursor-pointer group">
              <div className="w-10 h-10 bg-primary flex items-center justify-center flex-shrink-0 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                <span className="text-xs font-mono font-bold text-black">
                  {user?.full_name ? user.full_name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().substring(0, 3) || 'U' : 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-serif font-bold text-black truncate">{displayName}</p>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/60 truncate">{displayTitle}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-mono font-bold text-danger uppercase tracking-[0.2em] border-2 border-transparent hover:border-danger hover:bg-danger-muted transition-colors"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 bg-primary flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xs font-mono font-bold text-black">
                {user?.full_name ? user.full_name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().substring(0, 3) || 'U' : 'U'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-danger border-2 border-transparent hover:border-danger hover:bg-danger-muted transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}