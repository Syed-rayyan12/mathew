import { apiClient, nurseryApiClient, TokenManager, NurseryTokenManager, ApiResponse } from './client';
import { ENDPOINTS } from './config';
import { setSessionCookie } from '../auth/session-cookie';

// Types
export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  landline?: string;
  password: string;
  role?: 'USER' | 'PARENT' | 'NURSERY_OWNER';
  address?: string;
  addressLine2?: string;
  town?: string;
  postcode?: string;
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
  landline?: string;
  address?: string;
  addressLine2?: string;
  town?: string;
  postcode?: string;
  nurseryName?: string;
  role: string;
  /**
   * Display hint only — nothing gates on these. The real answer comes from
   * GET /api/nursery-dashboard/entitlements.
   */
  planTier?: 'standard' | 'platinum';
  paidNurseryCount?: number;
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
  phone?: string;       // Mobile
  landline?: string;    // Landline
  avatar?: string;
  address?: string;     // Address Line 1
  addressLine2?: string;
  town?: string;        // Town/City
  postcode?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/** What verify-upgrade-session hands back once reconcileAccount has run. */
export interface UpgradeResult {
  planTier: 'standard' | 'platinum';
  paidNurseryCount: number;
}

/**
 * create-upgrade-session puts the Stripe URL at the top level rather than
 * under `data`, so it does not fit the usual ApiResponse<T> shape.
 */
export type UpgradeSessionResponse = ApiResponse<never> & { url?: string };

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
      setSessionCookie('parent', response.data.user.role);
      // Save email separately so nursery-dashboard auth check passes for NURSERY_OWNER
      if (typeof window !== 'undefined') {
        localStorage.setItem('email', response.data.user.email);
      }
    }

    return response;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      // Call backend logout API to update status
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT, {}, true);
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

  // Create Stripe upgrade checkout session for existing nursery owner.
  // The count is never optional — the server rejects a quote of zero nurseries,
  // so a pure tier change must still send the account's current count.
  createUpgradeSession: async (
    planTier: 'standard' | 'platinum',
    billingPeriod: 'monthly' | 'annual',
    nurseryCount: number
  ): Promise<UpgradeSessionResponse> => {
    return nurseryApiClient.post<never>(
      '/stripe/create-upgrade-session',
      { plan: planTier, billingPeriod, nurseryCount },
      true
    ) as Promise<UpgradeSessionResponse>;
  },

  // Verify upgrade payment, then mirror the new tier + count into localStorage.
  // Display hint only — the dashboard re-reads entitlements from the server.
  verifyUpgradeSession: async (
    sessionId: string
  ): Promise<ApiResponse<UpgradeResult>> => {
    const response = await nurseryApiClient.post<UpgradeResult>(
      '/stripe/verify-upgrade-session',
      { sessionId },
      false
    );
    if (response.success && response.data?.planTier) {
      const { planTier, paidNurseryCount } = response.data;
      try {
        for (const key of ['nurseryUser', 'user']) {
          const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
          if (!raw) continue;
          const stored = JSON.parse(raw);
          stored.planTier = planTier;
          stored.paidNurseryCount = paidNurseryCount;
          localStorage.setItem(key, JSON.stringify(stored));
        }
      } catch { /* ignore parse errors */ }
    }
    return response;
  },
};

// Nursery Auth Service — separate session (nursery* keys) from the parent one
export const nurseryAuthService = {
  nurserySignin: async (data: SigninData): Promise<ApiResponse<AuthResponse>> => {
    const response = await nurseryApiClient.post<AuthResponse>(
      ENDPOINTS.AUTH.NURSERY_SIGNIN,
      data
    );

    if (response.success && response.data) {
      NurseryTokenManager.setTokens(
        response.data.accessToken,
        response.data.refreshToken
      );
      NurseryTokenManager.setUser(response.data.user);
      setSessionCookie('nursery', response.data.user.role || 'NURSERY_OWNER');
      // Legacy scattered keys still read by /settings and dashboard headers
      if (typeof window !== 'undefined') {
        const user = response.data.user;
        localStorage.setItem('nurseryEmail', user.email);
        localStorage.setItem('email', user.email);
        localStorage.setItem('firstName', user.firstName || '');
        localStorage.setItem('lastName', user.lastName || '');
        localStorage.setItem('phone', user.phone || '');
        localStorage.setItem('nurseryName', user.nurseryName || '');
      }
    }

    return response;
  },

  nurseryLogout: async (): Promise<void> => {
    try {
      await nurseryApiClient.post(ENDPOINTS.AUTH.LOGOUT, {}, true);
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    } finally {
      NurseryTokenManager.clearTokens();
    }
  },
};
