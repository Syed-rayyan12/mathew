'use client'

import { Facebook, Twitter, Instagram, Youtube, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export default function MiniNav() {
  const { isAuthenticated, user } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'NURSERY_OWNER': return '/nursery-dashboard';
      case 'PARENT': return '/parent-dashboard';
      default: return '/';
    }
  };

  return (
    <div className="w-full h-12 border-b  bg-[#04B0D6] dark:bg-gray-900 flex items-center justify-between px-24 xl:px-24 lg:px-12 max-lg:px-10 text-sm">
      
      {/* LEFT ICONS */}
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <div className="bg-primary text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
        <Facebook size={18} className="cursor-pointer hover:text-primary transition" />
        </div>
        <div className="bg-primary text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">

        <Twitter size={18} className="cursor-pointer hover:text-primary transition" />
        </div >
        <div className="bg-primary text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
        <Instagram size={18} className="cursor-pointer hover:text-primary transition" />
        </div>
        <div className="bg-primary text-white rounded-full p-2 w-8 h-8 flex items-center just">
        <Youtube size={18} className="cursor-pointer hover:text-primary transition" />
        </div>
      </div>

      {/* RIGHT LINKS */}
      <div className="flex items-center gap-5 text-gray-700 dark:text-gray-200">
        {isAuthenticated && user && (
          <Link 
            href={getDashboardPath()} 
            className="cursor-pointer text-white transition flex items-center gap-2 hover:opacity-80"
          >
            <LayoutDashboard size={17} /> 
            <span className="text-[17px]">My Dashboard</span>
   
          </Link>
        )}
      </div>
    </div>
  );
}
