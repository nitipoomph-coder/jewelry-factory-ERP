import { fetchWithAuth } from '../utils/fetchWithAuth';

const API_BASE = '/api/admin/users';

export interface ManagedUser {
  id: number | string;
  username: string;
  fullName: string;
  department: string;
  role: 'admin' | 'sales';
  createdAt: string | null;
  lastLogin: string | null;
  source: 'system' | 'legacy' | 'pcc';
  allowedMenus?: string[];
}

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  department: string;
  role: 'admin' | 'sales';
}

export const adminUsersAPI = {
  getUsers: async (showAll = false): Promise<ManagedUser[]> => {
    const res = await fetchWithAuth(`${API_BASE}${showAll ? '?all=true' : ''}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to fetch users');
    return json.data;
  },

  createUser: async (payload: CreateUserPayload): Promise<{ ok: boolean; message: string; userId: number }> => {
    const res = await fetchWithAuth(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || json.error || 'Failed to create user');
    return json;
  },

  updateRole: async (id: number | string, role: 'admin' | 'sales'): Promise<{ ok: boolean; message: string }> => {
    const res = await fetchWithAuth(`${API_BASE}/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || json.error || 'Failed to update role');
    return json;
  },

  resetPassword: async (id: number | string, newPassword: string): Promise<{ ok: boolean; message: string }> => {
    const res = await fetchWithAuth(`${API_BASE}/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || json.error || 'Failed to reset password');
    return json;
  },

  getUserPermissions: async (username: string): Promise<string[]> => {
    const res = await fetchWithAuth(`${API_BASE}/${encodeURIComponent(username)}/permissions`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || 'Failed to get permissions');
    return json.allowedMenus || [];
  },

  updateUserPermissions: async (username: string, allowedMenus: string[]): Promise<{ ok: boolean; message: string; allowedMenus: string[] }> => {
    const res = await fetchWithAuth(`${API_BASE}/${encodeURIComponent(username)}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowedMenus }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || 'Failed to update permissions');
    return json;
  },
};
