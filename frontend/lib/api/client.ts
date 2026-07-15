import { API_CONFIG } from './config';
import {
  SessionType,
  LOGIN_PATHS,
  setSessionCookie,
  clearSessionCookie,
} from '../auth/session-cookie';

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface ITokenManager {
  sessionType: SessionType;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
  getUser: () => any;
  setUser: (user: any) => void;
}

export { setSessionCookie, clearSessionCookie };

// Token Management
export const TokenManager: ITokenManager = {
  sessionType: 'parent',
  getAccessToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  },

  getRefreshToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  },

  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('email');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      clearSessionCookie('parent');
    }
  },

  getUser: () => {
    if (typeof window !== 'undefined') {
      try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
      } catch {
        // Corrupted data — clear it so the login screen shows cleanly
        localStorage.removeItem('user');
        return null;
      }
    }
    return null;
  },

  setUser: (user: any): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },
};

// Admin Token Management
export const AdminTokenManager: ITokenManager = {
  sessionType: 'admin',
  getAccessToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminAccessToken');
    }
    return null;
  },

  getRefreshToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminRefreshToken');
    }
    return null;
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminAccessToken', accessToken);
      localStorage.setItem('adminRefreshToken', refreshToken);
    }
  },

  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('adminUser');
      clearSessionCookie('admin');
    }
  },

  getUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('adminUser');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  setUser: (user: any): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminUser', JSON.stringify(user));
    }
  },
};

// Custom Error Class
export class ApiException extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
  }
}

// Request Options Type
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  isRetry?: boolean;
}

// API Client Class
class ApiClient {
  private baseUrl: string;
  private tokenManager: ITokenManager;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string, tokenManager: ITokenManager = TokenManager) {
    this.baseUrl = baseUrl;
    this.tokenManager = tokenManager;
  }

  // Exchange the stored refresh token for a new pair. Single-flight so
  // concurrent 401s trigger only one refresh call.
  private tryRefresh(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.tokenManager.getRefreshToken();
    if (!refreshToken) return false;

    try {
      // Raw fetch, not request() — avoids recursing into 401 handling
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;

      const data = await response.json();
      if (!data?.data?.accessToken || !data?.data?.refreshToken) return false;

      this.tokenManager.setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  private handleSessionExpired(): never {
    this.tokenManager.clearTokens();
    if (typeof window !== 'undefined') {
      const loginPath = LOGIN_PATHS[this.tokenManager.sessionType];
      if (!window.location.pathname.startsWith(loginPath)) {
        const returnTo = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.href = `${loginPath}?returnTo=${returnTo}`;
      }
    }
    throw new ApiException('Session expired', 401);
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      requireAuth = false,
      isRetry = false,
    } = options;

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add auth token if required
    if (requireAuth) {
      const token = this.tokenManager.getAccessToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Build request config
    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Expired access token: refresh once and retry, else force re-login
      if (response.status === 401 && requireAuth && !isRetry) {
        if (await this.tryRefresh()) {
          return this.request<T>(endpoint, { ...options, isRetry: true });
        }
        this.handleSessionExpired();
      }

      const data = await response.json();

      if (!response.ok) {
        throw new ApiException(
          data.message || 'An error occurred',
          response.status
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      throw new ApiException(
        error instanceof Error ? error.message : 'Network error',
        500
      );
    }
  }

  // Public methods
  async get<T>(endpoint: string, requireAuth = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', requireAuth });
  }

  async post<T>(
    endpoint: string,
    body: any,
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, requireAuth });
  }

  async put<T>(
    endpoint: string,
    body: any,
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, requireAuth });
  }

  async delete<T>(
    endpoint: string,
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', requireAuth });
  }

  async patch<T>(
    endpoint: string,
    body: any,
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body, requireAuth });
  }

  // Upload a single file via FormData
  async uploadFile<T>(
    endpoint: string,
    file: File,
    fieldName = 'file',
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const headers: Record<string, string> = {};
    const token = this.tokenManager.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (response.status === 401 && !isRetry) {
        if (await this.tryRefresh()) {
          return this.uploadFile<T>(endpoint, file, fieldName, true);
        }
        this.handleSessionExpired();
      }
      const data = await response.json();
      if (!response.ok) {
        throw new ApiException(data.message || 'Upload failed', response.status);
      }
      return data;
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException(
        error instanceof Error ? error.message : 'Network error',
        500
      );
    }
  }

  // Upload multiple files via FormData
  async uploadFiles<T>(
    endpoint: string,
    files: File[],
    fieldName = 'files',
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    files.forEach((file) => formData.append(fieldName, file));

    const headers: Record<string, string> = {};
    const token = this.tokenManager.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (response.status === 401 && !isRetry) {
        if (await this.tryRefresh()) {
          return this.uploadFiles<T>(endpoint, files, fieldName, true);
        }
        this.handleSessionExpired();
      }
      const data = await response.json();
      if (!response.ok) {
        throw new ApiException(data.message || 'Upload failed', response.status);
      }
      return data;
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException(
        error instanceof Error ? error.message : 'Network error',
        500
      );
    }
  }
}

// Export singleton instances
export const apiClient = new ApiClient(API_CONFIG.BASE_URL, TokenManager);
export const adminApiClient = new ApiClient(API_CONFIG.BASE_URL, AdminTokenManager);

// Nursery Token Manager — separate session from the regular user one
export const NurseryTokenManager: ITokenManager = {
  sessionType: 'nursery',
  getAccessToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nurseryAccessToken');
    }
    return null;
  },
  getRefreshToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nurseryRefreshToken');
    }
    return null;
  },
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nurseryAccessToken', accessToken);
      localStorage.setItem('nurseryRefreshToken', refreshToken);
    }
  },
  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nurseryAccessToken');
      localStorage.removeItem('nurseryRefreshToken');
      localStorage.removeItem('nurseryUser');
      // Legacy scattered keys written by the old login page
      localStorage.removeItem('nurseryEmail');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      localStorage.removeItem('phone');
      localStorage.removeItem('nurseryName');
      clearSessionCookie('nursery');
    }
  },
  getUser: () => {
    if (typeof window !== 'undefined') {
      try {
        const user = localStorage.getItem('nurseryUser');
        return user ? JSON.parse(user) : null;
      } catch {
        localStorage.removeItem('nurseryUser');
        return null;
      }
    }
    return null;
  },
  setUser: (user: any): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nurseryUser', JSON.stringify(user));
    }
  },
};
export const nurseryApiClient = new ApiClient(API_CONFIG.BASE_URL, NurseryTokenManager);
