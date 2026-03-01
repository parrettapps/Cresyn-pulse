import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { useAuthStore } from '../store/auth.store';
import type { JWTPayload } from '@cresyn/types';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// Decode JWT payload (no verification — server already verified it)
function decodeJWT(token: string): JWTPayload {
  const base64 = token.split('.')[1]!;
  return JSON.parse(atob(base64)) as JWTPayload;
}

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // Send httpOnly refresh token cookie
  });

  // ---- Request interceptor: inject auth headers ----
  client.interceptors.request.use((config) => {
    const authState = useAuthStore.getState();
    const { accessToken, tenantId, isAuthenticated } = authState;

    console.log('[API Client] Request to:', config.url);
    console.log('[API Client] Auth state:', {
      hasToken: !!accessToken,
      tokenPreview: accessToken?.substring(0, 20) + '...',
      tenantId,
      isAuthenticated,
    });

    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
      console.log('[API Client] Added Authorization header');
    } else {
      console.warn('[API Client] No access token available!');
    }

    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
      console.log('[API Client] Added X-Tenant-ID header:', tenantId);
    } else {
      console.warn('[API Client] No tenant ID available!');
    }

    return config;
  });

  // ---- Response interceptor: handle 401 → refresh token ----
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as typeof error.config & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Queue requests while refresh is in progress
          return new Promise((resolve) => {
            refreshQueue.push((token) => {
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
              }
              resolve(client(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const response = await axios.post<{ accessToken: string }>(
            `${API_URL}/api/v1/auth/refresh`,
            {},
            { withCredentials: true },
          );

          const { accessToken } = response.data;
          const payload = decodeJWT(accessToken);
          useAuthStore.getState().setAuth(accessToken, payload);

          // Flush queued requests
          refreshQueue.forEach((cb) => cb(accessToken));
          refreshQueue = [];

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          }
          return client(originalRequest);
        } catch {
          // Refresh failed — clear auth and redirect to login
          useAuthStore.getState().clearAuth();
          window.location.href = '/auth/login';
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}

// Singleton instance
export const apiClient = createApiClient();
