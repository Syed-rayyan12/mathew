// app/parent-dashboard/components/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Lock, Zap } from 'lucide-react';
import { useNurseryPlan } from '@/hooks/use-nursery-plan';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const plan = useNurseryPlan();
  const isPlatinum = plan === 'platinum';

  const baseLinks = [
    { name: 'Management Nurseries', href: '/nursery-dashboard' },
    { name: 'Reviews Management', href: '/nursery-dashboard/review-management' },
    { name: 'Help & Support', href: '/nursery-dashboard/help-and-support' },
  ];

  const platinumLinks = [
    { name: 'My Job Postings', href: '/nursery-dashboard/jobs' },
    { name: 'Job Applicants', href: '/nursery-dashboard/applicants' },
  ];

  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black  bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed md:relative top-0 left-0 h-full w-64 bg-white rounded-2xl shadow-md p-6 m-0 md:m-6 flex flex-col flex-shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${
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
          {baseLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`px-4 py-2 rounded-lg transition ${
                pathname === link.href
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Platinum-only section */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="px-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              {!isPlatinum && <Lock size={10} />} Jobs
              {!isPlatinum && <span className="ml-auto text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Platinum</span>}
            </p>
            {isPlatinum ? (
              platinumLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-2 rounded-lg transition block ${
                    pathname === link.href
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {link.name}
                </Link>
              ))
            ) : (
              <>
                {platinumLinks.map((link) => (
                  <div
                    key={link.href}
                    className="px-4 py-2 rounded-lg text-gray-300 flex items-center gap-2 cursor-not-allowed select-none"
                    title="Available on Platinum plan"
                  >
                    <Lock size={12} /> {link.name}
                  </div>
                ))}
                <Link
                  href="/nursery-dashboard/upgrade"
                  onClick={() => setIsOpen(false)}
                  className="mt-1 mx-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition"
                >
                  <Zap size={11} className="fill-yellow-500 text-yellow-500" />
                  Upgrade to unlock
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Upgrade banner — only for non-platinum */}
        {!isPlatinum && (
          <div className="mt-auto pt-4">
            <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="fill-yellow-500 text-yellow-500 shrink-0" />
                <p className="text-xs font-semibold text-yellow-800">You're on Standard</p>
              </div>
              <p className="text-xs text-yellow-700 leading-snug">
                Unlock job postings, applicant management & more.
              </p>
              <Link
                href="/nursery-dashboard/upgrade"
                onClick={() => setIsOpen(false)}
                className="mt-1 w-full text-center text-xs font-semibold py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-yellow-900 transition"
              >
                Upgrade to Platinum
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
