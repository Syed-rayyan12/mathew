// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 30000,
};

// API Endpoints
export const ENDPOINTS = {
  // Auth
  AUTH: {
    USER_SIGNUP: '/auth/user-signup',
    USER_SIGNIN: '/auth/user-signin',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  // Nurseries
  NURSERIES: {
    LIST: '/nurseries',
    DETAIL: (slug: string) => `/nurseries/${slug}`,
    CREATE: '/nurseries',
    UPDATE: (id: string) => `/nurseries/${id}`,
    DELETE: (id: string) => `/nurseries/${id}`,
  },
  // Reviews
  REVIEWS: {
    LIST: (nurseryId: string) => `/reviews/nursery/${nurseryId}`,
    MY_REVIEWS: '/reviews/my-reviews',
    CREATE: '/reviews',
    APPROVE: (id: string) => `/reviews/${id}/approve`,
    DELETE: (id: string) => `/reviews/${id}`,
  },
  // Articles
  ARTICLES: {
    LIST: '/articles',
    DETAIL: (slug: string) => `/articles/${slug}`,
    CREATE: '/articles',
    UPDATE: (id: string) => `/articles/${id}`,
    DELETE: (id: string) => `/articles/${id}`,
  },
  // Contact
  CONTACT: {
    SUBMIT: '/contact',
    LIST: '/contact',
    MARK_READ: (id: string) => `/contact/${id}/read`,
    DELETE: (id: string) => `/contact/${id}`,
  },
};
