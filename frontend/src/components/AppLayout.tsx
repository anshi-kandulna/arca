'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Toaster } from 'sonner';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
}

export default function AppLayout({ children, activeRoute }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden modal-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        activeRoute={activeRoute}
      />

      <div
        className="flex flex-col flex-1 min-w-0 content-transition"
        style={{ marginLeft: 0 }}
      >
        <Topbar onMobileMenuOpen={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-auto bg-background bg-grid-pattern">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6">
            {children}
          </div>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          },
        }}
      />
    </div>
  );
}