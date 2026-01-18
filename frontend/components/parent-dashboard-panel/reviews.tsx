'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface Review {
  id: string;
  nurseryId: string;
  overallRating: number;
  createdAt: string;
  isApproved: boolean;
  isRejected: boolean;
  nursery: {
    name: string;
    slug: string;
  };
}

const MyReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyReviews();
  }, []);

  const fetchMyReviews = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching my reviews...');
      console.log('   Access Token:', localStorage.getItem('accessToken')?.substring(0, 20) + '...');
      console.log('   User:', JSON.parse(localStorage.getItem('user') || '{}'));
      
      const response = await apiClient.get<Review[]>('/reviews/my-reviews', true);
      
      console.log('📊 API Response:', response);
      console.log('   Success:', response.success);
      console.log('   Data:', response.data);
      console.log('   Reviews count:', response.data?.length || 0);
      
      if (response.success && response.data) {
        setReviews(response.data);
        console.log('✅ Reviews loaded:', response.data.length);
      } else {
        console.log('❌ No reviews data in response');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch reviews:', error);
      console.error('   Error details:', error.message, error.response);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (review: Review) => {
    if (review.isRejected) {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
          Rejected
        </Badge>
      );
    }
    if (review.isApproved) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
          Approved
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
        Pending
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {/* Heading */}
      <div className="mb-6">
        <h2 className='text-secondary font-medium text-[48px] font-heading'><span className='text-foreground'>MY </span>REVIEWS</h2>
        <p className="text-muted-foreground">
          Manage your nursery reviews and feedback
        </p>
      </div>

      {/* Table */}
      <div className="rounded-md bg-white shadow p-4 overflow-x-auto">
        <table className="w-full text-left  border-collapse ">
          <thead className="bg-[#D1D5DB] ">
            <tr className="">
              <th className="px-6 py-3 text-lg tracking-[0.1rem] font-bold font-heading text-foreground ">
               NURSERY
              </th>
              <th className="px-6 py-3 text-lg tracking-[0.1rem] font-bold font-heading text-foreground ">
               DATE
              </th>
              <th className="px-6 py-3 text-lg tracking-[0.1rem] font-bold font-heading text-foreground ">
                RATING
              </th>
              <th className="px-6 py-3 text-lg tracking-[0.1rem] font-bold font-heading text-foreground ">
                STATUS
              </th>
            </tr>
          </thead>

          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                  No reviews yet. Start by reviewing a nursery!
                </td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr
                  key={review.id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium">{review.nursery.name}</td>
                  <td className="px-6 py-4">{formatDate(review.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1">
                      {'⭐'.repeat(Math.round(review.overallRating))}
                      <span className="ml-1 text-sm text-gray-600">({review.overallRating.toFixed(1)})</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(review)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyReviews;
