'use client';
import Sidebar from '@/components/nursery-admin-panel/sidebar';
import AdminHeader from '@/components/nursery-admin-panel/header';
import React, { useState } from 'react';
import { useSessionGuard } from '@/hooks/use-session-guard';

export default function DashboardLayout({ children }  : { children: React.ReactNode }) {
  const { ready } = useSessionGuard('admin', ['ADMIN']);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        <AdminHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="pl-12 pr-6 max-md:px-4 max-sm:px-4 py-6 md:pl-0 flex-1 overflow-y-auto">
          {children} {/* ✅ This is what you want */}
        </main>
      </div>
    </div>
  );
}
