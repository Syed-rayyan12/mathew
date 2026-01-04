'use client';

import React, { useState, useEffect } from 'react';
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
import NotificationDropdown from '../nursery-admin-panel/notification-dropdown';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const [ownerName, setOwnerName] = useState<string>('Nursery Owner');
  const [nurseryEmail, setNurseryEmail] = useState<string>('');
  const [initials, setInitials] = useState<string>('NO');
  const [nurseryCount, setNurseryCount] = useState<number>(0);

  useEffect(() => {
    // Load nursery data from localStorage
    const storedEmail = localStorage.getItem('email', );
    
    if (storedEmail) {
      setNurseryEmail(storedEmail);
    }

    // Load user and nursery data
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          // Load nurseries first
          const { nurseryDashboardService } = await import('@/lib/api/nursery');
          const nurseriesResponse = await nurseryDashboardService.getMyNursery();
          
          if (nurseriesResponse.success && nurseriesResponse.data) {
            const nurseries = Array.isArray(nurseriesResponse.data) ? nurseriesResponse.data : [nurseriesResponse.data];
            setNurseryCount(nurseries.length);
            
            // Sort nurseries by creation date (oldest first) to ensure consistent order
            const sortedNurseries = [...nurseries].sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateA - dateB;
            });
            
            // Use first (oldest) nursery name as the display name - this will be consistent
            if (sortedNurseries.length > 0 && sortedNurseries[0].name) {
              const nurseryName = sortedNurseries[0].name;
              setOwnerName(nurseryName);
              
              // Generate initials from nursery name
              const words = nurseryName.trim().split(/\s+/);
              const nurseryInitials = words.length >= 2 
                ? `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase()
                : nurseryName.substring(0, 2).toUpperCase();
              setInitials(nurseryInitials);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      // Call backend logout API to update status
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch('https://mathew-production.up.railway.app/api/auth/logout', {
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
      // Clear all authentication data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('email');
      
      // Clear browser history and prevent back navigation
      window.history.go(-(window.history.length - 1));
      
      // Use replace to avoid adding to history
      setTimeout(() => {
        window.location.replace('/nursery-login');
      }, 100);
    }
  };

  return (
    <header className="w-full flex items-center justify-between pr-6 max-sm:px-6 gap-4 rounded-b-3xl mt-6">
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
      <div className="flex-1 max-w-6xl relative max-md:hidden ">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search Nursery,Reviews..."
          className="bg-white pl-10 w-full rounded-lg h-11 border border-gray-200"
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
           
             
              className="relative rounded-full w-12 h-12 bg-white shadow-sm hover:bg-gray-100"
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
        </DropdownMenu> */}
          <NotificationDropdown />

        {/* Profile Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer size-12 border border-gray-200 shadow-sm">
              <AvatarImage src="" alt="Nursery Avatar" />
              <AvatarFallback className="bg-[#04B0D6] text-white font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <p className="font-medium">{ownerName}</p>
              <p className="text-sm text-muted-foreground">{nurseryEmail}</p>
              <p className="text-xs text-gray-500 mt-1">{nurseryCount} {nurseryCount === 1 ? 'Nursery' : 'Nurseries'}</p>
            </div>

            <Separator className="my-2" />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="text-sm text-foreground w-full">
                Settings
              </Link>
            </DropdownMenuItem>

       
            <Separator className="my-2" />

            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-sm text-red-500 w-full cursor-pointer"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
