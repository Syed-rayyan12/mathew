'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link'; // ✅ Correct import
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, ClosedCaption, HatGlassesIcon, Search, X, Menu } from 'lucide-react';
import { Separator } from '@/components/ui/separator'; // ✅ correct import
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = authService.getCurrentUser();
    if (userData) {
      setUser(userData);
    }
  }, []);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      // Check if this is admin or regular user
      const isAdmin = localStorage.getItem('adminRole') === 'ADMIN';
      
      if (isAdmin) {
        // Admin logout - clear admin tokens only
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminUser');
        router.push('/admin-login');
        return;
      }

      // Regular user logout - call backend API
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Check role BEFORE removing it
      const role = localStorage.getItem('role');
      
      // Clear all tokens and user data (regular users)
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('email');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      localStorage.removeItem('phone');
      localStorage.removeItem('nurseryName');
      
      // Redirect based on role
      if (role === 'ADMIN') {
        router.push('/admin-login');
      } else {
        router.push('/');
      }
    }
  };

  return (
    <header className="w-full flex items-center justify-between max-sm:px-6 pr-6 gap-4 rounded-b-3xl mt-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden mr-2"
        onClick={onMenuClick}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-6xl relative max-md:hidden">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search Nursery,Reviews..."
          className="bg-white pl-10 w-full rounded-lg h-11 border border-gray-200"
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
           
             
              className="relative rounded-full w-12 h-12  bg-white shadow-sm hover:bg-gray-100"
            >
              <Bell className="w-12 h-12 text-gray-700" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px]">

            <div className="p-2 flex justify-between items-center border-b border-gray-200">
              <span className="font-medium">NOTIFICATIONS</span>
              <div className="mt-1 ">
                <button className="text-sm text-white w-full bg-secondary rounded-md px-3 py-2">Mark all as Read</button>

              </div>
            </div>
            <div className='py-3'>
              <div className='flex gap-1 px-3 items-center justify-between border-b border-dotted border-black'>
                <div className='flex items-center'>
                  <div className='bg-gray-300 rounded-full p-2 flex justify-center items-center'>
                    <HatGlassesIcon className='w-4 h-4 text-blue-500 ' />
                  </div>
                  <div className='flex flex-col p-2 '>
                    <span className='text-[15px]'>Review Approved</span>
                    <span className='text-gray-400 text-sm'>2 hrs ago</span>
                  </div>
                </div>
                <X className='size-4' />
              </div>
              <div className='flex gap-1 px-3 items-center justify-between border-b border-dotted border-black'>
                <div className='flex items-center'>
                  <div className='bg-gray-300 rounded-full p-2 flex justify-center items-center'>
                    <HatGlassesIcon className='w-4 h-4 text-blue-500 ' />
                  </div>
                  <div className='flex flex-col p-2 '>
                    <span className='text-[15px]'>Review Approved</span>
                    <span className='text-gray-400 text-sm'>2 hrs ago</span>
                  </div>
                </div>
                <X className='size-4' />
              </div>
              <div className='flex gap-1 px-3 items-center justify-between border-b border-dotted border-black'>
                <div className='flex items-center'>
                  <div className='bg-gray-300 rounded-full p-2 flex justify-center items-center'>
                    <HatGlassesIcon className='w-4 h-4 text-blue-500 ' />
                  </div>
                  <div className='flex flex-col p-2 '>
                    <span className='text-[15px]'>Review Approved</span>
                    <span className='text-gray-400 text-sm'>2 hrs ago</span>
                  </div>
                </div>
                <X className='size-4'/>
              </div>
              <div className='flex gap-1 px-3 items-center justify-between border-b border-dotted border-black'>
                <div className='flex items-center'>
                  <div className='bg-gray-300 rounded-full p-2 flex justify-center items-center'>
                    <HatGlassesIcon className='w-4 h-4 text-blue-500 ' />
                  </div>
                  <div className='flex flex-col p-2 '>
                    <span className='text-[15px]'>Review Approved</span>
                    <span className='text-gray-400 text-sm'>2 hrs ago</span>
                  </div>
                </div>
                <X className='size-4' />
              </div>
              <div className='flex gap-1 px-3 items-center justify-between'>
                <div className='flex items-center'>
                  <div className='bg-gray-300 rounded-full p-2 flex justify-center items-center'>
                    <HatGlassesIcon className='w-4 h-4 text-blue-500 ' />
                  </div>
                  <div className='flex flex-col p-2 '>
                    <span className='text-[15px]'>Review Approved</span>
                    <span className='text-gray-400 text-sm'>2 hrs ago</span>
                  </div>
                </div>
                <X className='size-4' />
              </div>
           
            <div className="mt-2">
              <Button className='bg-secondary px-3 py-3 px-2 mx-3'>
                View All Notifications
              </Button>
            </div>
             </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer size-12 border border-gray-200 shadow-sm">
              <AvatarImage src="" alt="User Avatar" />
              <AvatarFallback className="bg-[#04B0D6] text-white font-medium">
                {user ? getInitials(user.firstName, user.lastName) : 'U'}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <p className="font-medium">
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User'}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email || 'No email'}</p>
            </div>

            <Separator className="my-0" />

            <DropdownMenuItem asChild>
              <Link href="/parent-dashboard/account-settings" className="text-sm text-foreground w-full">
                My Profile
              </Link>
            </DropdownMenuItem>

           

            <Separator className="my-0" />

            <DropdownMenuItem onClick={handleLogout} className="text-sm text-red-500 w-full cursor-pointer">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
