// app/parent-dashboard/components/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const links = [

    { name: 'Dashboard Overview', href: '/admin-dashboard' },
    { name: 'Manage Users', href: '/admin-dashboard/users-management' },
    { name: 'Manage Groups', href: '/admin-dashboard/group-management' },
    { name: 'Manage Nurseries', href: '/admin-dashboard/nursery-management' },
    { name: 'Manage Reviews', href: '/admin-dashboard/reviews-management' },
     { name: 'Approvals/Moderation', href: '/admin-dashboard/approvals' },
     { name: 'Notifications', href: '/admin-dashboard/notifications' },
     { name: 'Subscriptions & Billing', href: '/admin-dashboard/subscriptions' },
      { name: 'Content & Article', href: '/admin-dashboard/content-article' },

  ];
    const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed md:relative top-0 left-0 h-full w-64 bg-white rounded-2xl shadow-md max-md:rounded-none p-6 m-0 md:m-6 flex flex-col flex-shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${!isOpen ? 'md:translate-x-0' : ''}`}>
        {/* Close button for mobile */}
        <div className="flex justify-between items-center md:hidden">
          <img src="/images/logo.png" className='w-50 object-cover' alt="" />
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logo for desktop */}
        <div className="hidden md:block">
          <img src="/images/logo.png" className='w-50 object-cover' alt="" />
        </div>

        <nav className="flex flex-col gap-2 mt-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)} // Close sidebar on mobile after navigation
               className={`px-4 py-2  rounded-lg transition ${
                pathname === link.href
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
