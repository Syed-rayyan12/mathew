'use client';

import Header from '@/components/parent-dashboard-panel/header';
import Sidebar from '@/components/parent-dashboard-panel/sidebar';
import React, { useState } from 'react';

export default function ParentDashboardLayout({ children }  : { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="pl-12 max-md:px-6 max-sm:px-6 pr-6 py-6 md:pl-0 flex-1 overflow-y-auto">
          {children} {/* ✅ This is what you want */}
        </main>
      </div>
    </div>
  );
}
