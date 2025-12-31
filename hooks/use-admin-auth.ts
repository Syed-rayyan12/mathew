'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminUser {
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAuth = () => {
      if (typeof window === 'undefined') return;

      const adminToken = localStorage.getItem('adminAccessToken');
      const adminUserData = localStorage.getItem('adminUser');
      const adminRole = localStorage.getItem('adminRole');

      if (adminToken && adminUserData && adminRole === 'ADMIN') {
        try {
          const user = JSON.parse(adminUserData);
          setAdminUser(user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error parsing admin user data:', error);
          clearAdminAuth();
        }
      } else {
        setAdminUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAdminAuth();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adminAccessToken' || e.key === 'adminUser') {
        checkAdminAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const clearAdminAuth = () => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminUser');
    setAdminUser(null);
    setIsAuthenticated(false);
  };

  const logout = () => {
    clearAdminAuth();
    router.push('/admin-login');
  };

  const requireAdminAuth = () => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin-login');
    }
  };

  return {
    adminUser,
    isLoading,
    isAuthenticated,
    logout,
    requireAdminAuth,
  };
}
