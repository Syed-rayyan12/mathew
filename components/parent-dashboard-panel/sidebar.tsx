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

    { name: 'My Shortlisted', href: '/parent-dashboard' },
    { name: 'Recently Viewed', href: '/parent-dashboard/recently-viewed' },
    { name: 'My Reviews', href: '/parent-dashboard/my-reviews' },
    { name: 'Account Settings', href: '/parent-dashboard/account-settings' },
    { name: 'Help & Support', href: '/parent-dashboard/help-support' },
  ];
    const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed md:relative top-0 left-0 h-full w-64 bg-white rounded-2xl max-sm:rounded-none shadow-md p-6 m-0 md:m-6 flex flex-col flex-shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${
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
