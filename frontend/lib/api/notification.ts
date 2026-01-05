import { API_CONFIG } from './config';
import { apiClient, ApiResponse } from './client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  entity: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const notificationService = {
  // Get all notifications with pagination
  getAllNotifications: async (page = 1, limit = 20, isRead?: boolean) => {
    const query = new URLSearchParams();
    query.append('page', page.toString());
    query.append('limit', limit.toString());
    if (isRead !== undefined) {
      query.append('isRead', isRead.toString());
    }
    
    return apiClient.get<NotificationResponse>(
      `/notifications?${query.toString()}`,
      true  // requireAuth = true
    );
  },

  // Get recent notifications (for header dropdown)
  getRecentNotifications: async (limit = 10) => {
    return apiClient.get<NotificationResponse>(
      `/notifications/recent?limit=${limit}`,
      true  // requireAuth = true
    );
  },

  // Get notification statistics
  getNotificationStats: async () => {
    return apiClient.get<any>(
      '/notifications/stats',
      true  // requireAuth = true
    );
  },

  // Mark a single notification as read
  markAsRead: async (notificationId: string) => {
    return apiClient.put<{ success: boolean }>(
      `/notifications/${notificationId}/read`,
      {},
      true  // requireAuth = true
    );
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    return apiClient.put<{ success: boolean }>(
      '/notifications/read-all',
      {},
      true  // requireAuth = true
    );
  },

  // Delete a single notification
  deleteNotification: async (notificationId: string) => {
    return apiClient.delete<{ success: boolean }>(
      `/notifications/${notificationId}`,
      true  // requireAuth = true
    );
  },

  // Clear all notifications
  clearAllNotifications: async () => {
    return apiClient.delete<{ success: boolean }>(
      '/notifications',
      true  // requireAuth = true
    );
  },
};
