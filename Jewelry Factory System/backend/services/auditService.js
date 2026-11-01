const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'audit_logs.json');
const REVOKED_FILE = path.join(DATA_DIR, 'revoked_tokens.json');
const BANNED_IPS_FILE = path.join(DATA_DIR, 'banned_ips.json');
const MAX_MEMORY_LOGS = 2000;
const MAX_DISK_LOGS = 5000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours (matching JWT)
const BAN_THRESHOLD = 5; // 5 failed attempts
const BAN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes sliding window
const DEFAULT_BAN_DURATION_MINUTES = 15; // 15 minutes auto-ban

class AuditService {
  constructor() {
    this.memoryLogs = [];
    this.activeSessions = new Map(); // tokenHash -> sessionData
    this.revokedTokens = new Set();
    this.bannedIPs = new Map(); // ip -> { ip, reason, bannedAt, expiresAt, bannedBy }
    this.failedAttempts = new Map(); // ip -> [timestamps]
    this.isFlushing = false;
    this.saveTimeout = null;

    this.ensureDataDir();
    this.loadLogsFromDisk();
    this.loadRevokedTokensFromDisk();
    this.loadBannedIPsFromDisk();
  }

  ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('[AuditService] Failed to create data directory:', err.message);
    }
  }

  loadRevokedTokensFromDisk() {
    try {
      if (fs.existsSync(REVOKED_FILE)) {
        const raw = fs.readFileSync(REVOKED_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.revokedTokens = new Set(parsed);
        }
      }
    } catch (e) {
      this.revokedTokens = new Set();
    }
  }

  saveRevokedTokensToDisk() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(REVOKED_FILE, JSON.stringify(Array.from(this.revokedTokens)), 'utf8');
    } catch (e) {
      console.error('[AuditService] Failed to save revoked tokens:', e.message);
    }
  }

  loadBannedIPsFromDisk() {
    try {
      if (fs.existsSync(BANNED_IPS_FILE)) {
        const raw = fs.readFileSync(BANNED_IPS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          this.bannedIPs = new Map();
          for (const item of parsed) {
            // Only keep non-expired bans
            if (new Date(item.expiresAt).getTime() > now) {
              this.bannedIPs.set(item.ip, item);
            }
          }
        }
      }
    } catch (e) {
      this.bannedIPs = new Map();
    }
  }

  saveBannedIPsToDisk() {
    try {
      this.ensureDataDir();
      const list = Array.from(this.bannedIPs.values());
      fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.error('[AuditService] Failed to save banned IPs:', e.message);
    }
  }

  loadLogsFromDisk() {
    try {
      if (fs.existsSync(LOG_FILE)) {
        const raw = fs.readFileSync(LOG_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.memoryLogs = parsed.slice(-MAX_MEMORY_LOGS);
          console.log(`[AuditService] Loaded ${this.memoryLogs.length} audit logs from local storage.`);
          return;
        }
      }
      this.memoryLogs = [];
      this.scheduleSave();
    } catch (err) {
      console.error('[AuditService] Error loading logs from disk, initializing fresh:', err.message);
      this.memoryLogs = [];
    }
  }

  scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.flushToDisk();
    }, 500); // 500ms debounce
  }

  flushToDisk() {
    try {
      this.ensureDataDir();
      const logsToSave = this.memoryLogs.slice(-MAX_DISK_LOGS);
      const tmpFile = `${LOG_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(logsToSave, null, 2), 'utf8');
      fs.renameSync(tmpFile, LOG_FILE);
    } catch (err) {
      console.error('[AuditService] Error writing logs to disk:', err.message);
    }
  }

  /**
   * Clear all audit logs from memory and disk
   */
  clearLogs(clearedBy = 'ADMIN') {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.memoryLogs = [];
    try {
      this.ensureDataDir();
      fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2), 'utf8');
    } catch (err) {
      console.error('[AuditService] Error clearing logs file:', err.message);
    }

    // Record that logs were cleared
    this.logEvent({
      category: 'SYSTEM',
      action: 'LOGS_CLEARED',
      actor: clearedBy,
      ip: '127.0.0.1',
      status: 'SUCCESS',
      severity: 'MEDIUM',
      details: { message: `All audit logs were cleared by ${clearedBy}` },
    });

    return { success: true, message: 'All audit logs have been successfully cleared.' };
  }

  /**
   * Log an audit or security event
   */
  logEvent({
    category = 'SYSTEM', // 'AUTH' | 'SECURITY' | 'DATA_CHANGE' | 'SYSTEM'
    action = 'UNKNOWN',
    actor = 'SYSTEM',
    ip = '127.0.0.1',
    status = 'INFO',     // 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'WARNING' | 'INFO'
    severity = 'LOW',    // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    details = null,
  }) {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      category: category.toUpperCase(),
      action: action.toUpperCase(),
      actor: typeof actor === 'string' ? actor.toUpperCase() : 'UNKNOWN',
      ip: this.normalizeIP(ip),
      status: status.toUpperCase(),
      severity: severity.toUpperCase(),
      details: typeof details === 'object' && details !== null ? details : { message: String(details || '') },
    };

    this.memoryLogs.unshift(event);
    if (this.memoryLogs.length > MAX_MEMORY_LOGS) {
      this.memoryLogs.pop();
    }

    this.scheduleSave();
    return event;
  }

  /**
   * Query filtered logs with pagination
   */
  getLogs({
    page = 1,
    limit = 50,
    category,
    severity,
    status,
    search,
    fromDate,
    toDate,
  } = {}) {
    let filtered = this.memoryLogs;

    if (category && category !== 'ALL') {
      const catUpper = category.toUpperCase();
      filtered = filtered.filter(l => l.category === catUpper);
    }

    if (severity && severity !== 'ALL') {
      const sevUpper = severity.toUpperCase();
      filtered = filtered.filter(l => l.severity === sevUpper);
    }

    if (status && status !== 'ALL') {
      const stUpper = status.toUpperCase();
      filtered = filtered.filter(l => l.status === stUpper);
    }

    if (fromDate) {
      const fromTime = new Date(fromDate).getTime();
      filtered = filtered.filter(l => new Date(l.timestamp).getTime() >= fromTime);
    }

    if (toDate) {
      const toTime = new Date(toDate).getTime() + 86400000; // inclusive of whole day
      filtered = filtered.filter(l => new Date(l.timestamp).getTime() <= toTime);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(l =>
        l.action.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        l.ip.toLowerCase().includes(q) ||
        JSON.stringify(l.details).toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;
    const items = filtered.slice(offset, offset + limitNum);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Threat radar calculations & summary
   */
  getThreatSummary() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const last24hLogs = this.memoryLogs.filter(l => new Date(l.timestamp).getTime() >= oneDayAgo);
    const last1hLogs = last24hLogs.filter(l => new Date(l.timestamp).getTime() >= oneHourAgo);

    // Counts
    const failedLogins24h = last24hLogs.filter(l => l.action === 'LOGIN_FAIL').length;
    const failedLogins1h = last1hLogs.filter(l => l.action === 'LOGIN_FAIL').length;
    const adminProbes24h = last24hLogs.filter(l => l.action === 'VERIFY_ADMIN_FAIL').length;
    const rateLimitHits24h = last24hLogs.filter(l => l.action === 'RATE_LIMIT_EXCEEDED').length;
    const pathTraversals24h = last24hLogs.filter(l => l.action === 'PATH_TRAVERSAL_ATTEMPT').length;
    const criticalThreats24h = last24hLogs.filter(l => l.severity === 'CRITICAL').length;
    const highThreats24h = last24hLogs.filter(l => l.severity === 'HIGH').length;

    // Calculate Dynamic Threat Score (0 - 100)
    let score = 5; // baseline calm
    if (failedLogins1h >= 3) score += Math.min(30, failedLogins1h * 5);
    if (adminProbes24h > 0) score += Math.min(35, adminProbes24h * 15);
    if (pathTraversals24h > 0) score += Math.min(40, pathTraversals24h * 20);
    if (rateLimitHits24h > 0) score += Math.min(25, rateLimitHits24h * 5);
    if (criticalThreats24h > 0) score += 30;

    const threatScore = Math.min(100, Math.max(0, score));

    let threatLevel = 'NORMAL';
    let threatColor = 'emerald';
    if (threatScore >= 75) {
      threatLevel = 'UNDER_ATTACK';
      threatColor = 'rose';
    } else if (threatScore >= 45) {
      threatLevel = 'HIGH';
      threatColor = 'amber';
    } else if (threatScore >= 20) {
      threatLevel = 'ELEVATED';
      threatColor = 'yellow';
    }

    // 24-hour timeline buckets (last 24 hours)
    const hourlyMap = new Map();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now - i * 3600 * 1000);
      const hourStr = `${String(d.getHours()).padStart(2, '0')}:00`;
      hourlyMap.set(hourStr, { hour: hourStr, total: 0, threats: 0, auth: 0 });
    }

    for (const log of last24hLogs) {
      const d = new Date(log.timestamp);
      const hourStr = `${String(d.getHours()).padStart(2, '0')}:00`;
      if (hourlyMap.has(hourStr)) {
        const item = hourlyMap.get(hourStr);
        item.total += 1;
        if (log.category === 'SECURITY' || log.severity === 'HIGH' || log.severity === 'CRITICAL') {
          item.threats += 1;
        }
        if (log.category === 'AUTH') {
          item.auth += 1;
        }
      }
    }

    const timeline = Array.from(hourlyMap.values());

    // Attack Vectors breakdown
    const attackVectors = [
      { name: 'Brute Force / Login Fail', count: failedLogins24h, color: 'var(--color-chart-2, #f59e0b)' },
      { name: 'Rate Limit Flooding', count: rateLimitHits24h, color: 'var(--color-chart-1, #ef4444)' },
      { name: 'Master Admin Probes', count: adminProbes24h, color: 'var(--color-chart-5, #8b5cf6)' },
      { name: 'Path Traversal Probes', count: pathTraversals24h, color: 'var(--color-chart-6, #ec4899)' },
    ];

    // Clean up expired sessions while calculating summary
    this.cleanupExpiredSessions();

    return {
      threatScore,
      threatLevel,
      threatColor,
      kpis: {
        totalEvents24h: last24hLogs.length,
        failedLogins24h,
        adminProbes24h,
        rateLimitHits24h,
        pathTraversals24h,
        activeSessionsNow: this.activeSessions.size,
        bannedIPsNow: this.bannedIPs.size,
      },
      timeline,
      attackVectors,
      recentAlerts: last24hLogs.filter(l => l.severity === 'HIGH' || l.severity === 'CRITICAL').slice(0, 5),
    };
  }

  // ─── Active Session Management (Zero-DB) ───────────────────────────────────

  createTokenHash(token) {
    if (!token) return 'null';
    // Use last 16 chars + length to identify token without storing raw long secret
    return `${token.slice(-16)}_${token.length}`;
  }

  formatUserActivity(requestMeta = {}) {
    const { pagePath = '', originalUrl = '', method = 'GET', query = {} } = requestMeta;

    // 1. Identify Page Name & Icon
    let pageTitle = 'Factory Overview';
    let pageIcon = 'home';
    const cleanPath = (pagePath || '').split('?')[0] || '';

    if (cleanPath.startsWith('/po-tracker/group') || cleanPath.startsWith('/po-tracker/po') || cleanPath.startsWith('/po-tracker/ord')) {
      pageTitle = 'Order Detail';
      pageIcon = 'file-text';
    } else if (cleanPath.startsWith('/po-tracker')) {
      pageTitle = 'PO Tracker';
      pageIcon = 'layout-list';
    } else if (cleanPath.startsWith('/dashboard/customer/matrix')) {
      pageTitle = 'Customer Matrix';
      pageIcon = 'bar-chart';
    } else if (cleanPath.startsWith('/dashboard/customer')) {
      pageTitle = 'Sales Analytics';
      pageIcon = 'trending-up';
    } else if (cleanPath.startsWith('/dashboard/top-orders')) {
      pageTitle = 'Top Items Gallery';
      pageIcon = 'gem';
    } else if (cleanPath.startsWith('/dashboard/production-summary')) {
      pageTitle = 'Production Summary';
      pageIcon = 'factory';
    } else if (cleanPath.startsWith('/dashboard/production-forecast')) {
      pageTitle = 'Production Forecast';
      pageIcon = 'calendar';
    } else if (cleanPath.startsWith('/admin/users')) {
      pageTitle = 'User Management';
      pageIcon = 'users';
    } else if (cleanPath.startsWith('/admin/security-radar')) {
      pageTitle = 'Security Radar';
      pageIcon = 'shield';
    } else if (cleanPath.startsWith('/admin/audit-logs')) {
      pageTitle = 'Audit Logs';
      pageIcon = 'scroll-text';
    } else if (cleanPath.startsWith('/admin/sessions')) {
      pageTitle = 'Active Sessions';
      pageIcon = 'radio';
    } else if (cleanPath.startsWith('/procurement')) {
      pageTitle = 'Procurement & Receipts';
      pageIcon = 'shopping-cart';
    } else if (cleanPath.startsWith('/orders')) {
      pageTitle = 'Requisition & Issues';
      pageIcon = 'clipboard-list';
    } else if (cleanPath.startsWith('/sample')) {
      pageTitle = 'Sample Department';
      pageIcon = 'flask';
    } else if (cleanPath.startsWith('/subcontract')) {
      pageTitle = 'Subcontract Management';
      pageIcon = 'handshake';
    } else if (cleanPath) {
      pageTitle = cleanPath;
      pageIcon = 'compass';
    }

    // 2. Identify Detailed Data Query Activity (English, No Emojis)
    let actionDesc = `Browsing ${pageTitle}`;
    let actionType = 'view';

    if (originalUrl.includes('/api/orders')) {
      if (query.cust) {
        actionDesc = `Searching Customer: "${query.cust}" (Status: ${query.status || 'ALL'})`;
        actionType = 'search';
      } else if (query.poNo) {
        actionDesc = `Searching PO No: "${query.poNo}"`;
        actionType = 'search';
      } else if (query.ordNo) {
        actionDesc = `Searching Order No: "${query.ordNo}"`;
        actionType = 'search';
      } else if (originalUrl.includes('/group/')) {
        actionDesc = `Viewing Order Line & Packaging Details`;
        actionType = 'order';
      } else {
        actionDesc = `Viewing Production Order Overview (PO Tracker)`;
        actionType = 'order';
      }
    } else if (originalUrl.includes('/api/dashboard/customer/matrix')) {
      actionDesc = `Fetching Customer Report Matrix`;
      actionType = 'chart';
    } else if (originalUrl.includes('/api/dashboard/customer')) {
      actionDesc = `Fetching Sales Analytics Summary`;
      actionType = 'chart';
    } else if (originalUrl.includes('/api/dashboard/top-orders')) {
      actionDesc = `Fetching Top Items Gallery`;
      actionType = 'photo';
    } else if (originalUrl.includes('/api/production-summary')) {
      actionDesc = `Fetching Production Summary Report`;
      actionType = 'chart';
    } else if (originalUrl.includes('/api/production-forecast')) {
      actionDesc = `Fetching Production Forecast`;
      actionType = 'chart';
    } else if (originalUrl.includes('/api/admin/users')) {
      if (method === 'POST') actionDesc = `Creating New System User`;
      else if (method === 'PUT') actionDesc = `Updating User Role Permissions`;
      else actionDesc = `Fetching User Directory List`;
      actionType = 'user';
    } else if (originalUrl.includes('/api/admin/audit/banned-ips')) {
      actionDesc = `Reviewing IP Jail Defense`;
      actionType = 'shield';
    } else if (originalUrl.includes('/api/admin/audit/sessions')) {
      actionDesc = `Monitoring Active User Sessions`;
      actionType = 'shield';
    } else if (originalUrl.includes('/api/admin/audit')) {
      actionDesc = `Monitoring Security Threat Radar`;
      actionType = 'shield';
    } else if (originalUrl.includes('/api/photos')) {
      actionDesc = `Loading CAD / Gemstone Photos`;
      actionType = 'photo';
    } else if (originalUrl.includes('/api/procurement')) {
      actionDesc = `Fetching Procurement & Receipts Data`;
      actionType = 'package';
    } else if (originalUrl.includes('/api/requisition')) {
      actionDesc = `Fetching Gem Requisition & Issue Lines`;
      actionType = 'package';
    } else if (originalUrl.includes('/api/sample')) {
      actionDesc = `Fetching Sample Room Requests`;
      actionType = 'package';
    }

    return { pageTitle, pageIcon, cleanPath: cleanPath || '/', actionDesc, actionType };
  }

  recordSession(token, user, ip, userAgent, requestMeta = {}) {
    const hash = this.createTokenHash(token);
    const activity = this.formatUserActivity(requestMeta);

    const session = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tokenHash: hash,
      userId: user.id || null,
      username: (user.username || 'UNKNOWN').toUpperCase(),
      name: user.name || user.username || 'User',
      role: (user.role || 'sales').toLowerCase(),
      ip: (ip || '').replace(/^.*:/, '') || '127.0.0.1',
      userAgent: userAgent || 'Unknown Client',
      currentPage: activity.cleanPath,
      pageTitle: activity.pageTitle,
      pageIcon: activity.pageIcon,
      currentAction: activity.actionDesc,
      actionType: activity.actionType,
      lastEndpoint: requestMeta.originalUrl ? `${requestMeta.method || 'GET'} ${requestMeta.originalUrl}` : '',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    this.activeSessions.set(hash, session);
    return session;
  }

  touchSession(token, user = null, ip = null, userAgent = null, requestMeta = {}) {
    const hash = this.createTokenHash(token);
    const session = this.activeSessions.get(hash);
    if (session) {
      session.lastActiveAt = new Date().toISOString();
      if (ip) session.ip = (ip || '').replace(/^.*:/, '') || session.ip;

      if (requestMeta && requestMeta.originalUrl) {
        const activity = this.formatUserActivity(requestMeta);
        session.currentPage = activity.cleanPath;
        session.pageTitle = activity.pageTitle;
        session.pageIcon = activity.pageIcon;
        session.currentAction = activity.actionDesc;
        session.actionType = activity.actionType;
        session.lastEndpoint = `${requestMeta.method || 'GET'} ${requestMeta.originalUrl}`;
      }
    } else if (user) {
      // Auto-register session from valid verified JWT request
      this.recordSession(token, user, ip, userAgent, requestMeta);
    }
  }

  getActiveSessions() {
    this.cleanupExpiredSessions();
    return Array.from(this.activeSessions.values()).sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
  }

  isTokenRevoked(token) {
    const hash = this.createTokenHash(token);
    return this.revokedTokens.has(hash);
  }

  killSession(sessionId, killedBy = 'ADMIN') {
    let targetHash = null;
    let targetSession = null;

    for (const [hash, sess] of this.activeSessions.entries()) {
      if (sess.sessionId === sessionId) {
        targetHash = hash;
        targetSession = sess;
        break;
      }
    }

    if (targetHash && targetSession) {
      this.activeSessions.delete(targetHash);
      this.revokedTokens.add(targetHash);
      this.saveRevokedTokensToDisk();

      this.logEvent({
        category: 'SECURITY',
        action: 'KILL_SESSION',
        actor: killedBy,
        ip: targetSession.ip,
        status: 'SUCCESS',
        severity: 'MEDIUM',
        details: {
          killedUser: targetSession.username,
          sessionId: targetSession.sessionId,
          ip: targetSession.ip,
        },
      });

      return { success: true, message: `Terminated session for user ${targetSession.username}` };
    }

    return { success: false, message: 'Session not found or already expired' };
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [hash, session] of this.activeSessions.entries()) {
      const activeAge = now - new Date(session.lastActiveAt).getTime();
      if (activeAge > SESSION_TTL_MS) {
        this.activeSessions.delete(hash);
        this.revokedTokens.delete(hash);
      }
    }
  }

  // ─── IP Jail & Auto-Ban Defense (Zero-DB) ──────────────────────────────────

  normalizeIP(ip) {
    if (!ip) return '127.0.0.1';
    let clean = String(ip).split(',')[0].trim();
    // If IPv6-mapped IPv4 e.g. ::ffff:192.168.5.60
    if (clean.startsWith('::ffff:')) {
      clean = clean.replace('::ffff:', '');
    }
    // If IPv4 with port e.g. 192.168.5.60:54321
    if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(clean)) {
      clean = clean.split(':')[0];
    }
    if (clean === '::1' || clean === '1' || clean === 'localhost' || clean === '') {
      clean = '127.0.0.1';
    }
    return clean.trim();
  }

  isWhitelistedIP(ip) {
    const clean = this.normalizeIP(ip);
    // Never ban loopback / localhost
    return clean === '127.0.0.1' || clean === 'localhost';
  }

  recordFailedAttempt(rawIp, username = 'UNKNOWN') {
    const ip = this.normalizeIP(rawIp);
    const now = Date.now();

    let attempts = this.failedAttempts.get(ip) || [];
    // Keep attempts within the sliding window (10 minutes)
    attempts = attempts.filter(a => now - a.timestamp <= BAN_WINDOW_MS);
    attempts.push({ timestamp: now, username });
    this.failedAttempts.set(ip, attempts);

    if (attempts.length >= BAN_THRESHOLD && !this.isWhitelistedIP(ip)) {
      const reason = `Auto-Ban: Exceeded ${BAN_THRESHOLD} failed login attempts in 10 minutes (${username})`;
      this.banIP(ip, reason, DEFAULT_BAN_DURATION_MINUTES, 'SYSTEM_AUTO_BAN');
      this.failedAttempts.delete(ip);
      return {
        autoBanned: true,
        ip,
        reason,
        expiresInMinutes: DEFAULT_BAN_DURATION_MINUTES,
      };
    }

    return {
      autoBanned: false,
      attemptCount: attempts.length,
      remainingBeforeBan: Math.max(0, BAN_THRESHOLD - attempts.length),
    };
  }

  checkIPBanned(rawIp) {
    const ip = this.normalizeIP(rawIp);
    if (this.isWhitelistedIP(ip)) return null;

    const ban = this.bannedIPs.get(ip);
    if (!ban) return null;

    const now = Date.now();
    if (now >= new Date(ban.expiresAt).getTime()) {
      // Auto-expire ban
      this.bannedIPs.delete(ip);
      this.saveBannedIPsToDisk();
      return null;
    }

    return ban;
  }

  banIP(rawIp, reason = 'Manual ban by administrator', durationMinutes = 15, bannedBy = 'ADMIN') {
    const ip = this.normalizeIP(rawIp);
    if (this.isWhitelistedIP(ip)) {
      return { success: false, message: 'Cannot ban localhost / loopback IP' };
    }

    const duration = parseInt(durationMinutes, 10) || DEFAULT_BAN_DURATION_MINUTES;
    const now = Date.now();
    const expiresAt = new Date(now + duration * 60 * 1000).toISOString();

    const banInfo = {
      ip,
      reason,
      bannedAt: new Date(now).toISOString(),
      expiresAt,
      bannedBy,
    };

    this.bannedIPs.set(ip, banInfo);
    this.saveBannedIPsToDisk();

    this.logEvent({
      category: 'SECURITY',
      action: bannedBy === 'SYSTEM_AUTO_BAN' ? 'IP_AUTO_BANNED' : 'IP_MANUAL_BANNED',
      actor: bannedBy,
      ip,
      status: 'BLOCKED',
      severity: 'CRITICAL',
      details: {
        reason,
        durationMinutes: duration,
        expiresAt,
      },
    });

    return { success: true, message: `IP ${ip} banned for ${duration} minutes`, ban: banInfo };
  }

  unbanIP(rawIp, unbannedBy = 'ADMIN') {
    const ip = this.normalizeIP(rawIp);
    if (!this.bannedIPs.has(ip)) {
      return { success: false, message: `IP ${ip} is not currently in jail` };
    }

    this.bannedIPs.delete(ip);
    this.failedAttempts.delete(ip);
    this.saveBannedIPsToDisk();

    this.logEvent({
      category: 'SECURITY',
      action: 'IP_UNBANNED',
      actor: unbannedBy,
      ip,
      status: 'SUCCESS',
      severity: 'LOW',
      details: { unbannedIP: ip },
    });

    return { success: true, message: `IP ${ip} has been released from jail` };
  }

  getBannedIPs() {
    const now = Date.now();
    const list = [];
    let dirty = false;

    for (const [ip, ban] of this.bannedIPs.entries()) {
      const expTime = new Date(ban.expiresAt).getTime();
      if (now >= expTime) {
        this.bannedIPs.delete(ip);
        dirty = true;
      } else {
        list.push({
          ...ban,
          minutesRemaining: Math.max(1, Math.ceil((expTime - now) / 60000)),
        });
      }
    }

    if (dirty) this.saveBannedIPsToDisk();
    return list.sort((a, b) => new Date(b.bannedAt).getTime() - new Date(a.bannedAt).getTime());
  }
}

// Singleton instance
const auditService = new AuditService();

module.exports = auditService;
