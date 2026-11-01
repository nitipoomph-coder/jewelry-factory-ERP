// src/services/authAPI.ts
import { API_BASE_URL } from '../config/api';

const API_BASE = API_BASE_URL;

interface RegistrationRequest {
  fullName: string;
  username: string;
  password: string;
  department: string;
}

export const authAPI = {
  login: async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Connection to server failed' };
    }
  },
  verifyAdmin: async (password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      return await response.json();
    } catch (error) {
      console.error('Verify Admin error:', error);
      return { success: false, message: 'Connection to server failed' };
    }
  },
  register: async (data: RegistrationRequest) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Connection to server failed' };
    }
  }
};
