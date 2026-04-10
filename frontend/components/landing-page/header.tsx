'use client'

import Link from "next/link";
import { Menu, LayoutDashboard, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [nurseryDropdown, setNurseryDropdown] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const shouldShowDashboard = isAuthenticated && user && user.role === 'USER';

  const getDashboardPath = () => '/parent-dashboard';

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

          {/* Find Nursery Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setNurseryDropdown(true)}
            onMouseLeave={() => setNurseryDropdown(false)}
          >
            <Link
              href="/products"
              className="flex items-center gap-1 hover:text-primary transition"
            >
              Find Nursery
              <ChevronDown
                size={16}
                className={`transition-transform duration-300 ${nurseryDropdown ? "rotate-180" : "rotate-0"}`}
              />
            </Link>

            {/* Dropdown Menu */}
            <div
              className={`absolute top-full left-0 mt-0 w-52 bg-white dark:bg-black rounded-lg shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 origin-top ${
                nurseryDropdown
                  ? "opacity-100 scale-y-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-y-95 -translate-y-2 pointer-events-none"
              }`}
            >
              <Link
                href="/products"
                className="block px-4 py-3 text-sm hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-900 transition"
              >
                Nursery
              </Link>
              <Link
                href="/nursery-group"
                className="block px-4 py-3 text-sm hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-900 transition border-t border-gray-100 dark:border-gray-800"
              >
                Nursery Group
              </Link>
              <Link
                href="/products?top20=true"
                className="block px-4 py-3 text-sm hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-900 transition border-t border-gray-100 dark:border-gray-800"
              >
                Top 20 Nurseries
              </Link>
            </div>
          </div>

          <Link href="/submit-review" className="hover:text-primary transition">Submit & Review</Link>
          <Link href="/pricing" className="hover:text-primary transition">Pricing</Link>
          <Link href="/jobs" className="hover:text-primary transition">Jobs</Link>
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
