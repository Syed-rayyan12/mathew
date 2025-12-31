'use client'

import Link from "next/link";
import { Menu, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout, getUserInitials, getFullName } = useAuth();
  
  // Don't show profile for admin users on landing page
  const shouldShowProfile = isAuthenticated && user && user.role !== 'ADMIN';

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

        {/* RIGHT SECTION - Auth Button or Profile */}
        <div className="hidden lg:flex items-center gap-4">
          {isLoading ? (
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          ) : shouldShowProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 outline-none cursor-pointer">
                  <Avatar className="h-10 w-10 border-2 border-primary">
                    <AvatarImage src={user.avatar} alt={getFullName()} />
                    <AvatarFallback className="bg-primary text-white font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getFullName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  {/* <Link href="/profile" className="cursor-pointer flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link> */}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
