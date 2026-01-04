import { adminApiClient, ApiResponse } from './client';

export interface AdminStats {
  totalNurseries: number;
  totalGroups: number;
  totalUsers: number;
  totalReviews: number;
  rejectedReviews: number;
}

export interface AdminGroup {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  cardImage?: string;
  images: string[];
  aboutUs?: string;
  address: string;
  city: string;
  postcode: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  childNurseries: Array<{
    id: string;
    name: string;
  }>;
  _count: {
    childNurseries: number;
    reviews: number;
  };
  createdAt: string;
}

export interface AdminNursery {
  id: string;
  name: string;
  slug: string;
  city: string;
  postcode: string;
  address: string;
  groupId?: string | null;
  logo?: string;
  cardImage?: string;
  images: string[];
  reviewCount: number;
  averageRating: number;
  isApproved: boolean;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  parentGroup?: {
    id: string;
    name: string;
  } | null;
  _count: {
    reviews: number;
  };
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isOnline: boolean;
  createdAt: string;
  _count: {
    nurseries: number;
    reviews: number;
  };
}

export interface AdminReview {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  nursery: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  title?: string;
  content: string;
  overallRating: number;
  activities?: number;
  care?: number;
  cleanliness?: number;
  facilities?: number;
  food?: number;
  learning?: number;
  management?: number;
  resources?: number;
  safeguarding?: number;
  staff?: number;
  value?: number;
  visitDate?: string;
  isApproved: boolean;
  isRejected: boolean;
  rejectionReason?: string;
  rejectedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface SearchParams {
  searchQuery?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  role?: string;
}

export interface AdminArticle {
  id: string;
  name: string;
  cardHeading: string;
  cardParagraph: string;
  slug: string;
  sections: Array<{ heading: string; paragraph: string }>;
  listHeading?: string;
  listItems?: Array<{ heading: string }>;
  tipText?: string;
  finalHeading?: string;
  finalParagraph?: string;
  cardImage?: string;
  slugImage?: string;
  category: string;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleData {
  name: string;
  cardHeading: string;
  cardParagraph: string;
  sections: Array<{ heading: string; paragraph: string }>;
  listHeading?: string;
  listItems?: Array<{ heading: string }>;
  tipText?: string;
  finalHeading?: string;
  finalParagraph?: string;
  cardImage?: string;
  slugImage?: string;
  category?: string;
}

export const adminService = {
  // Admin signin
  signin: async (email: string, password: string) => {
    return adminApiClient.post<{
      success: boolean;
      message: string;
      data: {
        email: string;
        role: string;
        accessToken: string;
        refreshToken: string;
      };
    }>('/admin/signin', { email, password });
  },

  // Get dashboard stats
  getStats: async () => {
    return adminApiClient.get<{ success: boolean; data: AdminStats }>(
      '/admin/stats',
      true
    );
  },

  // Get all groups
  getAllGroups: async (params?: SearchParams) => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return adminApiClient.get<{ success: boolean; data: AdminGroup[] }>(
      `/admin/groups${queryString}`,
      true
    );
  },

  // Get all nurseries
  getAllNurseries: async (params?: SearchParams) => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return adminApiClient.get<{ success: boolean; data: AdminNursery[] }>(
      `/admin/nurseries${queryString}`,
      true
    );
  },

  // Get all users
  getAllUsers: async (params?: SearchParams) => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return adminApiClient.get<{ success: boolean; data: AdminUser[] }>(
      `/admin/users${queryString}`,
      true
    );
  },

  // Get all reviews
  getAllReviews: async (params?: SearchParams) => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return adminApiClient.get<{ success: boolean; data: AdminReview[] }>(
      `/admin/reviews${queryString}`,
      true
    );
  },

  // Delete a group
  deleteGroup: async (id: string) => {
    return adminApiClient.delete<{ success: boolean; message: string }>(
      `/admin/groups/${id}`,
      true
    );
  },

  // Delete a nursery
  deleteNursery: async (id: string) => {
    return adminApiClient.delete<{ success: boolean; message: string }>(
      `/admin/nurseries/${id}`,
      true
    );
  },

  // Delete a user
  deleteUser: async (id: string) => {
    return adminApiClient.delete<{ success: boolean; message: string }>(
      `/admin/users/${id}`,
      true
    );
  },

  // Delete a review
  deleteReview: async (id: string) => {
    return adminApiClient.delete<{ success: boolean; message: string }>(
      `/reviews/${id}`,
      true
    );
  },

  // Get users pending approval
  getPendingApprovals: async (params?: SearchParams) => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return adminApiClient.get<{ success: boolean; data: AdminUser[] }>(
      `/admin/approvals/pending${queryString}`,
      true
    );
  },

  // Approve user
  approveUser: async (id: string) => {
    return adminApiClient.put<{ success: boolean; message: string; data: AdminUser }>(
      `/admin/approvals/${id}/approve`,
      {},
      true
    );
  },

  // Reject user
  rejectUser: async (id: string) => {
    return adminApiClient.delete<{ success: boolean; message: string }>(
      `/admin/approvals/${id}/reject`,
      true
    );
  },

  // Get all articles
  getAllArticles: async (params?: SearchParams) => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return adminApiClient.get<{ success: boolean; data: AdminArticle[] }>(
      `/admin/articles${queryString}`,
      true
    );
  },

  // Create article
  createArticle: async (data: CreateArticleData) => {
    return adminApiClient.post<{ success: boolean; message: string; data: AdminArticle }>(
      '/articles',
      data,
      true
    );
  },

  // Update article
  updateArticle: async (id: string, data: Partial<CreateArticleData>) => {
    return adminApiClient.put<{ success: boolean; message: string; data: AdminArticle }>(
      `/articles/${id}`,
      data,
      true
    );
  },

  // Delete article
  deleteArticle: async (id: string) => {
    return adminApiClient.delete<{ success: boolean; message: string }>(
      `/articles/${id}`,
      true
    );
  },

  // Get monthly user statistics
  getMonthlyUserStats: async (months: number = 12) => {
    return adminApiClient.get<{
      monthlyUsers: Array<{
        month: string;
        users: number;
        _count: number;
      }>;
      totalUsers: number;
    }>(`/admin/analytics/monthly-users?months=${months}`, true);
  },

  // Get monthly review statistics
  getMonthlyReviewStats: async (months: number = 12) => {
    return adminApiClient.get<{
      monthlyReviews: Array<{
        month: string;
        reviews: number;
        approved: number;
        pending: number;
        _count: number;
      }>;
      totalReviews: number;
      totalApproved: number;
    }>(`/admin/analytics/monthly-reviews?months=${months}`, true);
  },
};
