import { fetchWithAuth } from '../utils/fetchWithAuth';

const API_BASE = '/api/admin/audit';

export interface AuditEvent {
  id: string;
  timestamp: string;
  category: 'AUTH' | 'SECURITY' | 'DATA_CHANGE' | 'SYSTEM';
  action: string;
  actor: string;
  ip: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'WARNING' | 'INFO';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, any>;
}

export interface ThreatSummary {
  threatScore: number;
  threatLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'UNDER_ATTACK';
  threatColor: 'emerald' | 'yellow' | 'amber' | 'rose';
  kpis: {
    totalEvents24h: number;
    failedLogins24h: number;
    adminProbes24h: number;
    rateLimitHits24h: number;
    pathTraversals24h: number;
    activeSessionsNow: number;
    bannedIPsNow: number;
  };
  timeline: Array<{
    hour: string;
    total: number;
    threats: number;
    auth: number;
  }>;
  attackVectors: Array<{
    name: string;
    count: number;
    color: string;
  }>;
  recentAlerts: AuditEvent[];
}

export interface BannedIP {
  ip: string;
  reason: string;
  bannedAt: string;
  expiresAt: string;
  bannedBy: string;
  minutesRemaining: number;
}

export interface ActiveSession {
  sessionId: string;
  tokenHash: string;
  userId: number | null;
  username: string;
  name: string;
  role: string;
  ip: string;
  userAgent: string;
  currentPage?: string;
  pageTitle?: string;
  pageIcon?: string;
  currentAction?: string;
  actionType?: string;
  lastEndpoint?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface LogsResponse {
  items: AuditEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminAuditAPI = {
  getSummary: async (): Promise<ThreatSummary> => {
    const res = await fetchWithAuth(`${API_BASE}/summary`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to fetch threat summary');
    return json.data;
  },

  getLogs: async (params: {
    page?: number;
    limit?: number;
    category?: string;
    severity?: string;
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  } = {}): Promise<LogsResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.severity && params.severity !== 'ALL') query.set('severity', params.severity);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);

    const res = await fetchWithAuth(`${API_BASE}/logs?${query.toString()}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to fetch audit logs');
    return json.data;
  },

  clearLogs: async (): Promise<{ ok: boolean; message: string }> => {
    const res = await fetchWithAuth(`${API_BASE}/logs/clear`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || json.error || 'Failed to clear audit logs');
    return json;
  },

  getSessions: async (): Promise<ActiveSession[]> => {
    const res = await fetchWithAuth(`${API_BASE}/sessions`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to fetch active sessions');
    return json.data;
  },

  killSession: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetchWithAuth(`${API_BASE}/sessions/${sessionId}/kill`, {
      method: 'POST',
    });
    const json = await res.json();
    return json;
  },

  simulateThreat: async (type: string): Promise<void> => {
    await fetchWithAuth(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
  },

  getBannedIPs: async (): Promise<BannedIP[]> => {
    const res = await fetchWithAuth(`${API_BASE}/banned-ips`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to fetch banned IPs');
    return json.data;
  },

  unbanIP: async (ip: string): Promise<{ ok: boolean; message: string }> => {
    const res = await fetchWithAuth(`${API_BASE}/banned-ips/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || 'Failed to unban IP');
    return json;
  },

  banIP: async (ip: string, reason?: string, durationMinutes?: number): Promise<{ ok: boolean; message: string }> => {
    const res = await fetchWithAuth(`${API_BASE}/banned-ips/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, reason, durationMinutes }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || 'Failed to ban IP');
    return json;
  },
};
