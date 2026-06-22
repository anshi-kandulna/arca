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
        id: 'nav-map-review',
        label: 'Gate 1 Review',
        icon: ClipboardList,
        href: '/map-review-screen',
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
    ],
  }
];

const badgeVariantClasses: Record<string, string> = {
  warning: 'bg-warning/20 text-warning border border-warning/30',
  danger: 'bg-danger/20 text-danger border border-danger/30',
  info: 'bg-info/20 text-info border border-info/30',
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
          hidden lg:flex flex-col bg-card border-r border-border sidebar-transition z-30 relative
          ${collapsed ? 'w-16' : 'w-60'}
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
          fixed lg:hidden top-0 left-0 h-full w-60 bg-card border-r border-border z-50
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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center h-14 border-b border-border px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="font-bold text-base tracking-tight text-gradient-gold">
              ARCA
            </span>
          </div>
        )}
        {collapsed && <AppLogo size={28} />}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* No alerts configured from backend yet */}

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {filteredGroups.map((group) => (
          <div key={`group-${group.label}`}>
            {!collapsed && (
              <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground px-2 mb-1">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const isActive = activeRoute === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className={`
                        group relative flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium
                        transition-all duration-150
                        ${isActive
                          ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary-foreground hover:text-foreground hover:bg-muted'
                        }
                        ${collapsed ? 'justify-center' : ''}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <ItemIcon size={16} className="flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className={`gate-badge ${badgeVariantClasses[item.badge.variant]}`}>
                              {item.badge.count}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-danger" />
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
      <div className={`border-t border-border p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="text-2xs font-bold text-primary">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-2xs text-muted-foreground truncate">{displayTitle}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-2xs font-bold text-primary">{initials}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}