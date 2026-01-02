import { apiClient, ApiResponse } from './client';
import { ENDPOINTS } from './config';

// Types
export interface Review {
  id: string;
  title: string;
  content: string;
  rating: number;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  nursery?: {
    name: string;
    slug: string;
  };
}

export interface ReviewListResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReviewData {
  nurseryId: string;
  title: string;
  content: string;
  rating: number;
}

// Review Service
export const reviewService = {
  // Get nursery reviews
  getNurseryReviews: async (
    nurseryId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse<ReviewListResponse>> => {
    let endpoint = ENDPOINTS.REVIEWS.LIST(nurseryId);
    
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      const queryString = queryParams.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }
    
    return apiClient.get<ReviewListResponse>(endpoint);
  },

  // Get my reviews
  getMyReviews: async (): Promise<ApiResponse<Review[]>> => {
    return apiClient.get<Review[]>(ENDPOINTS.REVIEWS.MY_REVIEWS, true);
  },

  // Create review
  create: async (data: CreateReviewData): Promise<ApiResponse<Review>> => {
    return apiClient.post<Review>(ENDPOINTS.REVIEWS.CREATE, data, true);
  },

  // Approve review (Admin only)
  approve: async (id: string): Promise<ApiResponse<Review>> => {
    return apiClient.put<Review>(ENDPOINTS.REVIEWS.APPROVE(id), {}, true);
  },

  // Delete review (Admin only)
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(ENDPOINTS.REVIEWS.DELETE(id), true);
  },
};
