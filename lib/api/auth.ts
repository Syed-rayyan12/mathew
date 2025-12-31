import { apiClient, TokenManager, ApiResponse } from './client';
import { ENDPOINTS } from './config';

// Types
export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: 'USER' | 'PARENT' | 'NURSERY_OWNER';
}

export interface SigninData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  nurseryName?: string;
  role: string;
  avatar?: string;
  isVerified?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  pendingApproval?: boolean;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  address?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Auth Service
export const authService = {
  // User Signup - Don't save tokens, user needs to login after signup
  userSignup: async (data: SignupData): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<AuthResponse>(
      ENDPOINTS.AUTH.USER_SIGNUP,
      data
    );

    // Don't save tokens on signup - user should login manually
    return response;
  },

  // User Signin
  userSignin: async (data: SigninData): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<AuthResponse>(
      ENDPOINTS.AUTH.USER_SIGNIN,
      data
    );

    if (response.success && response.data) {
      TokenManager.setTokens(
        response.data.accessToken,
        response.data.refreshToken
      );
      TokenManager.setUser(response.data.user);
    }

    return response;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      // Call backend logout API to update status
      await apiClient.post('/auth/logout', {}, true);
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    } finally {
      TokenManager.clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
    }
  },

  // Update Profile
  updateProfile: async (
    data: UpdateProfileData
  ): Promise<ApiResponse<User>> => {
    return apiClient.put<User>(ENDPOINTS.AUTH.PROFILE, data, true);
  },

  // Change Password
  changePassword: async (
    data: ChangePasswordData
  ): Promise<ApiResponse<void>> => {
    return apiClient.put<void>(ENDPOINTS.AUTH.CHANGE_PASSWORD, data, true);
  },

  // Get current user from localStorage
  getCurrentUser: (): User | null => {
    return TokenManager.getUser();
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!TokenManager.getAccessToken();
  },

  // Get user role
  getUserRole: (): string | null => {
    const user = TokenManager.getUser();
    return user?.role || null;
  },
};
