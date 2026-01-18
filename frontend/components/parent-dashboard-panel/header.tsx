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
import { Bell, CheckCircle, X, Menu, Search } from 'lucide-react';
import { Separator } from '@/components/ui/separator'; // ✅ correct import
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/api/auth';
import { notificationService, Notification } from '@/lib/api/notification';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    const userData = authService.getCurrentUser();
    if (userData) {
      setUser(userData);
      fetchNotifications();
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await notificationService.getRecentNotifications(10);
      if (response && response.notifications) {
        setNotifications(response.notifications);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification removed');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to remove notification');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

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
              className="relative rounded-full w-12 h-12 bg-white shadow-sm hover:bg-gray-100"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[350px] max-h-[500px] overflow-y-auto">
            <div className="p-3 flex justify-between items-center border-b border-gray-200 sticky top-0 bg-white z-10">
              <span className="font-semibold text-base">Notifications</span>
              {unreadCount > 0 && (
                <Button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-white bg-secondary rounded-md px-3 py-1.5 h-auto hover:bg-secondary/90"
                >
                  Mark all as read
                </Button>
              )}
            </div>
            
            <div className="py-2">
              {loadingNotifications ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex gap-2 px-3 py-3 items-start justify-between border-b border-dotted border-gray-200 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1">
                      <div className={`rounded-full p-2 flex justify-center items-center ${
                        notification.entity === 'review' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <CheckCircle className={`w-4 h-4 ${
                          notification.entity === 'review' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`text-sm ${!notification.isRead ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </span>
                        <span className="text-xs text-gray-600 line-clamp-2">
                          {notification.message}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 sticky bottom-0 bg-white">
                <Link href="/parent-dashboard/notifications">
                  <Button className="bg-secondary w-full hover:bg-secondary/90">
                    View All Notifications
                  </Button>
                </Link>
              </div>
            )}
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
