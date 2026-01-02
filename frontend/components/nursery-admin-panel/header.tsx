'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Search, Menu } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import NotificationDropdown from '@/components/nursery-admin-panel/notification-dropdown';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

const AdminHeader = ({ onMenuClick }: AdminHeaderProps) => {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    // Get admin user from admin storage
    const adminUserData = localStorage.getItem('adminUser');
    const adminEmail = localStorage.getItem('adminEmail');
    
    if (adminUserData) {
      try {
        setAdminUser(JSON.parse(adminUserData));
      } catch (error) {
        console.error('Error parsing admin user:', error);
        // Fallback to email
        if (adminEmail) {
          setAdminUser({
            email: adminEmail,
            role: 'ADMIN',
            firstName: 'Admin',
            lastName: 'User'
          });
        }
      }
    }
  }, []);

  const getInitials = () => {
    if (!adminUser) return 'AD';
    const first = adminUser.firstName?.charAt(0) || 'A';
    const last = adminUser.lastName?.charAt(0) || 'D';
    return (first + last).toUpperCase();
  };

  const handleLogout = () => {
    // Clear admin tokens only
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminUser');
    
    // Redirect to admin login
    router.push('/admin-login');
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
      <div className="flex-1 max-w-6xl relative max-sm:hidden">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search..."
          className="bg-white pl-10 w-full rounded-lg h-11 border border-gray-200"
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notifications Dropdown */}
        <NotificationDropdown />

        <Separator orientation="vertical" className="h-8" />

        {/* Admin Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:bg-gray-100 rounded-lg p-2 transition-colors">
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src="" alt="Admin" />
                <AvatarFallback className="bg-primary text-white font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-gray-900">
                {adminUser?.firstName || 'Admin'} {adminUser?.lastName || 'User'}
              </p>
              <p className="text-xs text-gray-500">{adminUser?.email || 'admin@mathewnursery.com'}</p>
            </div>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-sm text-red-500 w-full cursor-pointer hover:text-red-600"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;
