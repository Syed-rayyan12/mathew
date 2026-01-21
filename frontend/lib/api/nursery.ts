import { apiClient, ApiResponse } from './client';

// Types
export interface Nursery {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  postcode: string;
  phone?: string;
  email?: string;
  logo?: string;
  cardImage?: string;
  images: string[];
  videoUrl?: string;
  reviewCount: number;
  averageRating?: number;
  isVerified: boolean;
  isApproved?: boolean;
  openingHours?: any;
  ageRange?: string;
  fees?: any;
  facilities: string[];
  aboutUs?: string;
  philosophy?: string;
  createdAt?: string;
  updatedAt?: string;
  groupId?: string | null;
  group?: {
    name: string;
    slug: string;
  };
}

export interface NurseryUpdateData {
  nurseryId?: string;
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  logo?: string;
  cardImage?: string;
  images?: string[];
  videoUrl?: string;
  ageRange?: string;
  capacity?: number;
  facilities?: string[];
  openingHours?: any;
  fees?: any;
  aboutUs?: string;
  philosophy?: string;
  location?: string;
  openingTime?: string;
  closingTime?: string;
}

// User-facing nursery service (for public viewing)
export const nurseryService = {
  // Get all approved nurseries (for public viewing on website)
  getAll: async (params?: {
    city?: string;
    search?: string;
    page?: number;
    limit?: number;
    ageRange?: string[];
    facilities?: string[];
  }) => {
    let endpoint = '/user/nurseries';
    
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.city) queryParams.append('city', params.city);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      // Add age range filters
      if (params.ageRange && params.ageRange.length > 0) {
        params.ageRange.forEach(age => queryParams.append('ageRange', age));
      }
      
      // Add facilities filters
      if (params.facilities && params.facilities.length > 0) {
        params.facilities.forEach(facility => queryParams.append('facilities', facility));
      }
      
      const queryString = queryParams.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }
    
    return apiClient.get<{ data: Nursery[]; count: number }>(endpoint);
  },

  // Get nursery by slug (for public viewing)
  getBySlug: async (slug: string) => {
    return apiClient.get<{ success: boolean; data: Nursery }>(`/user/nurseries/${slug}`);
  },

  // Search nurseries for review submission
  search: async (query: string) => {
    return apiClient.get<{ success: boolean; data: Array<{
      id: string;
      name: string;
      slug: string;
      address: string;
      city: string;
      postcode: string;
    }> }>(`/user/nurseries/search?query=${encodeURIComponent(query)}`);
  },

  // Search by city for hero banner (returns 2 groups + 2 nurseries)
  searchByCity: async (city: string) => {
    return apiClient.get<{ 
      success: boolean; 
      data: {
        groups: Array<{
          id: string;
          name: string;
          slug: string;
          city: string;
          cardImage?: string;
          logo?: string;
          description?: string;
          nurseryCount: number;
        }>;
        nurseries: Array<{
          id: string;
          name: string;
          slug: string;
          city: string;
          cardImage?: string;
          description?: string;
          ageRange?: string;
          facilities: string[];
          group?: {
            name: string;
            slug: string;
          };
        }>;
      }
    }>(`/user/nurseries/search-by-city?city=${encodeURIComponent(city)}`);
  },
};

// Review service
export interface ReviewData {
  nurseryId: string;
  overallRating: number;
  content: string;
  connection?: string;
  visitDate?: string;
  facilities?: number;
  learning?: number;
  resources?: number;
  care?: number;
  activities?: number;
  staff?: number;
  food?: number;
  management?: number;
  cleanliness?: number;
  safeguarding?: number;
  value?: number;
  firstName: string;
  lastName: string;
  email: string;
  telephone?: string;
  initialsOnly?: boolean;
}

export interface Review {
  id: string;
  overallRating: number;
  content: string;
  connection?: string;
  visitDate?: string;
  firstName: string;
  lastName: string;
  email?: string;
  telephone?: string;
  initialsOnly: boolean;
  isVerified: boolean;
  isApproved: boolean;
  isRejected: boolean;
  createdAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  pendingApproval: number;
}

export interface NurseryReviewsResponse {
  reviews: Review[];
  stats: ReviewStats;
}

export const reviewService = {
  // Submit a review (with optional authentication)
  submit: async (data: ReviewData) => {
    // Check if user is logged in by looking for access token
    const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');
    
    return apiClient.post<{ success: boolean; message: string; data: Review }>(
      '/reviews/submit',
      data,
      !!hasToken // Send with auth if token exists
    );
  },

  // Get reviews for a nursery
  getNurseryReviews: async (nurseryId: string, page = 1, limit = 100) => {
    return apiClient.get<{ 
      success: boolean; 
      data: Review[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      }
    }>(`/reviews/nursery/${nurseryId}?page=${page}&limit=${limit}`);
  },
};

// Nursery Dashboard service (for nursery owners)
export const nurseryDashboardService = {
  // Get my nursery profile
  getMyNursery: async () => {
    return apiClient.get<{ success: boolean; data: Nursery[] }>('/nursery-dashboard/my-nursery', true);
  },

  // Get all my nurseries (for manage-nursery page)
  getMyNurseries: async () => {
    return apiClient.get<{ success: boolean; data: Nursery[] }>('/nursery-dashboard/my-nursery', true);
  },

  // Get my nursery reviews with stats
  getMyReviews: async () => {
    return apiClient.get<NurseryReviewsResponse>(
      '/nursery-dashboard/my-reviews',
      true
    );
  },

  // Create new nursery
  createNursery: async (data: NurseryUpdateData) => {
    return apiClient.post<{ success: boolean; message: string; data: Nursery }>(
      '/nursery-dashboard/create',
      data,
      true
    );
  },

  // Update nursery profile
  updateNursery: async (data: NurseryUpdateData) => {
    return apiClient.put<{ success: boolean; message: string; data: Nursery }>(
      '/nursery-dashboard/update',
      data,
      true
    );
  },

  // Delete nursery
  deleteNursery: async (id: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/nursery-dashboard/${id}`,
      true
    );
  },

  // Approve review
  approveReview: async (reviewId: string) => {
    return apiClient.put<{ success: boolean; message: string; data: Review }>(
      `/reviews/${reviewId}/approve`,
      {},
      true
    );
  },

  // Reject/Unapprove review
  rejectReview: async (reviewId: string) => {
    return apiClient.put<{ success: boolean; message: string; data: Review }>(
      `/reviews/${reviewId}/unapprove`,
      {},
      true
    );
  },
};
