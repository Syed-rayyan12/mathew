import { API_CONFIG } from './config';

import { apiClient } from './client';

export interface NurseryGroup {
  id: string;
  name: string;
  slug: string;
  city?: string;
  town?: string;
  cardImage?: string;
  logo?: string;
  images?: string[];
  aboutUs?: string;
  description?: string;
}

export interface NurseryGroupUpdateData {
  nurseryId?: string;
  name?: string;
  logo?: string;
  cardImage?: string;
  images?: string[];
  aboutUs?: string;
  description?: string;
  address?: string;
  town?: string;
  city?: string;
  postcode?: string;
}

export const nurseryGroupService = {
  // Get all nursery groups (for nursery-group page - public)
  getAllGroups: async (params?: { city?: string }) => {
    let url = `${API_CONFIG.BASE_URL}/user/nurseries/groups`;
    if (params?.city) {
      url += `?city=${encodeURIComponent(params.city)}`;
    }
    const response = await fetch(url);
    return response.json();
  },

  // Get group by slug (for nursery-group/[slug] page - public)
  getGroupBySlug: async (slug: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/user/nurseries/groups/${slug}`);
    return response.json();
  },

  // Get my group (for settings page - protected)
  getMyGroup: async (token: string) => {
    return apiClient.get('/groups/my/group', true);
  },

  // Update nursery group (for settings page - protected)
  updateGroup: async (data: NurseryGroupUpdateData, token: string) => {
    return apiClient.put('/groups/update', data, true);
  },
};
