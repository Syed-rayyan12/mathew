import { API_CONFIG } from './config';

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

// Token Management
export const TokenManager = {
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
    }
  },

  getUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
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
export const AdminTokenManager = {
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
}

// API Client Class
class ApiClient {
  private baseUrl: string;
  private tokenManager: typeof TokenManager;

  constructor(baseUrl: string, tokenManager: typeof TokenManager = TokenManager) {
    this.baseUrl = baseUrl;
    this.tokenManager = tokenManager;
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
}

// Export singleton instances
export const apiClient = new ApiClient(API_CONFIG.BASE_URL, TokenManager);
export const adminApiClient = new ApiClient(API_CONFIG.BASE_URL, AdminTokenManager);
