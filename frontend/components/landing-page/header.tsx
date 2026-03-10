'use client'

import Link from "next/link";
import { Menu, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function Header() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const shouldShowDashboard = isAuthenticated && user && user.role !== 'ADMIN';

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'NURSERY_OWNER': return '/nursery-dashboard';
      case 'PARENT': return '/parent-dashboard';
      case 'USER': return '/parent-dashboard';
      default: return '/';
    }
  };

  return (
    <>
      {/* HEADER */}
      <header className="w-full h-20 bg-white dark:bg-black shadow-md sticky top-0 flex items-center justify-between xl:px-24 lg:px-12 max-lg:px-10 z-50">
        
        {/* LOGO */}
        <Link href="/">
        <img src="/images/logo.png" alt="" className="object-cover"  width={200} height={200}/>
        </Link>

        {/* CENTER LINKS */}
        <nav className="hidden lg:flex items-center gap-8 text-base font-medium">
          <Link href="/" className="hover:text-primary transition">Home</Link>
          <Link href="/products" className="hover:text-primary transition">Find Nursery</Link>
          <Link href="/nursery-group" className="hover:text-primary transition">Groups</Link>
          <Link href="/submit-review" className="hover:text-primary transition">Submit & Review</Link>
          <Link href="/article" className="hover:text-primary transition">Article</Link>
          <Link href="/about" className="hover:text-primary transition">About</Link>
        </nav>

        {/* RIGHT SECTION - Auth Button or Dashboard */}
        <div className="hidden lg:flex items-center gap-4">
          {isLoading ? (
            <div className="w-24 h-10 rounded-[6px] bg-gray-200 animate-pulse" />
          ) : shouldShowDashboard ? (
            <Link
              href={getDashboardPath()}
              className="flex items-center gap-2 bg-primary hover:bg-transparent hover:text-primary border-2 transition-all duration-300 cursor-pointer border-primary text-white rounded-[6px] px-6 py-2 font-medium"
            >
              <LayoutDashboard size={18} />
              <span>My Dashboard</span>
            </Link>
          ) : (
            <Link 
              href="/signin" 
              className="bg-primary hover:bg-transparent hover:text-primary border-2 transition-all duration-300 cursor-pointer border-primary text-white rounded-[6px] px-8 py-2 inline-flex items-center justify-center"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* MOBILE MENU ICON */}
        <Menu
          size={26}
          className="lg:hidden cursor-pointer ml-4"
          onClick={() => setOpen(!open)}
        />
      </header>

      {/* MOBILE MENU */}
      {open && (
        <div className="lg:hidden bg-white dark:bg-black shadow-md px-6 py-4 flex flex-col gap-4 text-base font-medium">
          <Link href="/" className="hover:text-primary transition">Home</Link>
          <Link href="/about" className="hover:text-primary transition">About</Link>
          <Link href="/products" className="hover:text-primary transition">Products</Link>
          <Link href="/contact" className="hover:text-primary transition">Contact</Link>
          {!isLoading && !isAuthenticated && (
            <Link href="/signin" className="text-primary font-semibold">Sign In</Link>
          )}
        </div>
      )}
    </>
  );
}
