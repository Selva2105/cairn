export const API_ROUTES = {
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    GOOGLE: '/auth/google',
    GOOGLE_CALLBACK: '/auth/google/callback',
    SESSION: '/auth/session',
  },
  HOUSEHOLDS: {
    BASE: '/households',
    MEMBERS: (id: string) => `/households/${id}/members`,
    INVITE: (id: string) => `/households/${id}/invite`,
  },
  PIPELINE: {
    RUN: '/internal/pipeline/run',
  },
  HEALTH: '/health',
} as const;
