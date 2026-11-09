// src/utils/fetchWithAuth.ts
import { buildLoginPath, clearStoredAuth } from './authRedirect';

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Attach current frontend page path for real-time presence audit
  if (typeof window !== 'undefined' && window.location) {
    headers.set('x-page-path', window.location.pathname + window.location.search);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token is missing, invalid, or expired
    console.error('[fetchWithAuth] Unauthorized! Redirecting to login...');
    clearStoredAuth();
    // Keep the current page so the user returns here after signing in again
    window.location.href = buildLoginPath(window.location.pathname + window.location.search + window.location.hash);
  } else if (response.status === 403) {
    try {
      const clone = response.clone();
      clone.json().then(data => {
        if (data?.error === 'IP_TEMPORARILY_BANNED') {
          console.error('[fetchWithAuth] IP Banned! Ejecting user...');
          clearStoredAuth();
          alert(`[SECURITY JAIL / IP BANNED]\n\n${data.message || 'Your IP has been temporarily blocked.'}`);
          window.location.href = '/login';
        }
      }).catch(() => { /* non-JSON 403 body: not an IP ban, nothing to do */ });
    } catch {
      // response.clone() can throw if the body was already consumed; the caller still gets the response
    }
  }

  return response;
};
