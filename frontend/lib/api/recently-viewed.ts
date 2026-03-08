import { apiClient, ApiResponse } from './client';

export interface RecentlyViewedEntry {
  id: string;
  viewedAt: string;
  nurseryId: string;
  nursery: {
    id: string;
    name: string;
    slug: string;
    city: string;
    town?: string;
    cardImage?: string;
    reviewCount: number;
    averageRating: number;
  };
}

export const recentlyViewedService = {
  // Get last 10 recently viewed nurseries
  getRecentlyViewed: (): Promise<ApiResponse<RecentlyViewedEntry[]>> => {
    return apiClient.get<RecentlyViewedEntry[]>('/recently-viewed', true);
  },

  // Record a visit (call this when nursery detail page loads)
  recordView: (nurseryId: string): Promise<ApiResponse<void>> => {
    return apiClient.post<void>(`/recently-viewed/${nurseryId}`, {}, true);
  },

  // Clear all recently viewed
  clearAll: (): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>('/recently-viewed', true);
  },
};
