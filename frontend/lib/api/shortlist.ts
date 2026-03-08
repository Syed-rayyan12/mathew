import { apiClient, ApiResponse } from './client';

export interface ShortlistedNursery {
  id: string;
  nurseryId: string;
  createdAt: string;
  nursery: {
    id: string;
    name: string;
    slug: string;
    city: string;
    town?: string;
    cardImage?: string;
    logo?: string;
    reviewCount: number;
    averageRating: number;
  };
}

export const shortlistService = {
  // Get my shortlist
  getMyShortlist: (): Promise<ApiResponse<ShortlistedNursery[]>> => {
    return apiClient.get<ShortlistedNursery[]>('/shortlist', true);
  },

  // Add nursery to shortlist
  addToShortlist: (nurseryId: string): Promise<ApiResponse<ShortlistedNursery>> => {
    return apiClient.post<ShortlistedNursery>(`/shortlist/${nurseryId}`, {}, true);
  },

  // Remove nursery from shortlist
  removeFromShortlist: (nurseryId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/shortlist/${nurseryId}`, true);
  },

  // Check if a nursery is shortlisted
  checkShortlisted: (nurseryId: string): Promise<ApiResponse<{ isShortlisted: boolean }>> => {
    return apiClient.get<{ isShortlisted: boolean }>(`/shortlist/check/${nurseryId}`, true);
  },
};
