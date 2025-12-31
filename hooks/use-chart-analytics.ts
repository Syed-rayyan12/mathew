import { useEffect, useState } from 'react';
import { adminService } from '@/lib/api/admin';

export interface MonthlyUserData {
  month: string;
  users: number;
  _count: number;
}

export interface MonthlyReviewData {
  month: string;
  reviews: number;
  approved: number;
  pending: number;
  _count: number;
}

export const useMonthlyUserStats = (months: number = 12) => {
  const [data, setData] = useState<MonthlyUserData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await adminService.getMonthlyUserStats(months);
        
        if (response.success && response.data) {
          setData(response.data.monthlyUsers);
          setTotal(response.data.totalUsers);
          setError(null);
        } else {
          setError('Failed to fetch user statistics');
          setData([]);
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [months]);

  return { data, total, loading, error };
};

export const useMonthlyReviewStats = (months: number = 12) => {
  const [data, setData] = useState<MonthlyReviewData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalApproved, setTotalApproved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await adminService.getMonthlyReviewStats(months);
        
        if (response.success && response.data) {
          setData(response.data.monthlyReviews);
          setTotal(response.data.totalReviews);
          setTotalApproved(response.data.totalApproved);
          setError(null);
        } else {
          setError('Failed to fetch review statistics');
          setData([]);
        }
      } catch (err) {
        console.error('Error fetching review stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [months]);

  return { data, total, totalApproved, loading, error };
};
