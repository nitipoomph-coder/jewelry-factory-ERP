// src/utils/fetchWithAuth.ts

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
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
  } else if (response.status === 403) {
    try {
      const clone = response.clone();
      clone.json().then(data => {
        if (data?.error === 'IP_TEMPORARILY_BANNED') {
          console.error('[fetchWithAuth] IP Banned! Ejecting user...');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_role');
          localStorage.removeItem('auth_user');
          alert(`[SECURITY JAIL / IP BANNED]\n\n${data.message || 'Your IP has been temporarily blocked.'}`);
          window.location.href = '/login';
        }
      }).catch(() => {});
    } catch (e) {}
  }

  return response;
};
