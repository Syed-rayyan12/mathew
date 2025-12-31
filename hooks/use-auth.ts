'use client';

import { useState, useEffect, useCallback } from 'react';
import { authService, User } from '@/lib/api/auth';
import { TokenManager } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = () => {
      const currentUser = authService.getCurrentUser();
      const hasToken = authService.isAuthenticated();
      
      // Exclude admin users from regular authentication
      if (currentUser && hasToken && currentUser.role !== 'ADMIN') {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'user') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API fails
      TokenManager.clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/user-signIn';
    }
  }, []);

  // Update user data
  const updateUser = useCallback((userData: User) => {
    TokenManager.setUser(userData);
    setUser(userData);
  }, []);

  // Get user initials for avatar
  const getUserInitials = useCallback((): string => {
    if (!user) return '';
    const firstInitial = user.firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = user.lastName?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}`;
  }, [user]);

  // Get full name
  const getFullName = useCallback((): string => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`;
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    updateUser,
    getUserInitials,
    getFullName,
  };
}
