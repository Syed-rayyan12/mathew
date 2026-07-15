'use client';


import Header from '@/components/nursery-dashboard-panel/header';
import Sidebar from '@/components/nursery-dashboard-panel/sidebar';
import React, { useState } from 'react';
import { useSessionGuard } from '@/hooks/use-session-guard';

export default function ParentDashboardLayout({ children }  : { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { ready } = useSessionGuard('nursery', ['NURSERY_OWNER']);

  if (ready === false) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (ready === null) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="pl-12 pr-6 py-5 max-md:px-6 max-sm:px-6 md:pl-0 flex-1 overflow-y-auto">
          {children} {/* ✅ This is what you want */}
        </main>
      </div>
    </div>
  );
}
