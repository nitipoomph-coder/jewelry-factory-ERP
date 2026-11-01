const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');

// ─── GET /api/admin/audit/summary ───────────────────────────────────────────
// Returns threat level, dynamic score, KPIs, 24h timeline, attack breakdown
router.get('/summary', (req, res) => {
  try {
    const summary = auditService.getThreatSummary();
    res.json({ ok: true, data: summary });
  } catch (err) {
    console.error('[AdminAudit API] Failed to get summary:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/admin/audit/logs ──────────────────────────────────────────────
// Returns filtered and paginated audit events
router.get('/logs', (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      severity,
      status,
      search,
      fromDate,
      toDate,
    } = req.query;

    const result = auditService.getLogs({
      page,
      limit,
      category,
      severity,
      status,
      search,
      fromDate,
      toDate,
    });

    res.json({ ok: true, data: result });
  } catch (err) {
    console.error('[AdminAudit API] Failed to get logs:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/admin/audit/logs/clear ───────────────────────────────────────
// Clears all historical audit logs
router.post('/logs/clear', (req, res) => {
  try {
    const clearedBy = req.user?.username || 'ADMIN';
    const result = auditService.clearLogs(clearedBy);
    res.json({ ok: true, message: result.message });
  } catch (err) {
    console.error('[AdminAudit API] Failed to clear logs:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/admin/audit/sessions ──────────────────────────────────────────
// Returns currently active in-memory user sessions
router.get('/sessions', (req, res) => {
  try {
    const sessions = auditService.getActiveSessions();
    res.json({ ok: true, data: sessions });
  } catch (err) {
    console.error('[AdminAudit API] Failed to get sessions:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/admin/audit/sessions/:id/kill ────────────────────────────────
// Immediately kills/revokes a user session
router.post('/sessions/:id/kill', (req, res) => {
  try {
    const sessionId = req.params.id;
    const killedBy = req.user?.username || 'ADMIN';
    const result = auditService.killSession(sessionId, killedBy);

    if (!result.success) {
      return res.status(404).json({ ok: false, message: result.message });
    }

    res.json({ ok: true, message: result.message });
  } catch (err) {
    console.error('[AdminAudit API] Failed to kill session:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/admin/audit/simulate ─────────────────────────────────────────
// Allows admin to simulate test attacks (for testing verification)
router.post('/simulate', (req, res) => {
  try {
    const { type = 'BRUTE_FORCE' } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (type === 'BRUTE_FORCE') {
      auditService.logEvent({
        category: 'SECURITY',
        action: 'LOGIN_FAIL',
        actor: 'SIMULATED_ATTACKER',
        ip: clientIp,
        status: 'FAILED',
        severity: 'MEDIUM',
        details: 'Simulated brute-force attempt with invalid password',
      });
    } else if (type === 'ADMIN_PROBE') {
      auditService.logEvent({
        category: 'SECURITY',
        action: 'VERIFY_ADMIN_FAIL',
        actor: 'SIMULATED_PROBER',
        ip: clientIp,
        status: 'BLOCKED',
        severity: 'HIGH',
        details: 'Simulated unauthorized master admin password guess',
      });
    } else if (type === 'PATH_TRAVERSAL') {
      auditService.logEvent({
        category: 'SECURITY',
        action: 'PATH_TRAVERSAL_ATTEMPT',
        actor: 'SIMULATED_SCANNER',
        ip: clientIp,
        status: 'BLOCKED',
        severity: 'CRITICAL',
        details: 'Simulated path traversal probe: /api/photos/ps/..%2f..%2fconfig',
      });
    } else if (type === 'RATE_LIMIT') {
      auditService.logEvent({
        category: 'SECURITY',
        action: 'RATE_LIMIT_EXCEEDED',
        actor: 'SIMULATED_BOT',
        ip: clientIp,
        status: 'BLOCKED',
        severity: 'HIGH',
        details: 'Simulated API flood: Exceeded 200 requests/minute threshold',
      });
    }

    res.json({ ok: true, message: `Simulated ${type} event logged successfully.` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/admin/audit/banned-ips ────────────────────────────────────────
// Returns list of currently active IP bans in jail
router.get('/banned-ips', (req, res) => {
  try {
    const list = auditService.getBannedIPs();
    res.json({ ok: true, data: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/admin/audit/banned-ips/unban ──────────────────────────────────
// Releases an IP from jail
router.post('/banned-ips/unban', (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ ok: false, message: 'IP address is required' });

    const result = auditService.unbanIP(ip, req.user?.username || 'ADMIN');
    res.json({ ok: result.success, message: result.message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/admin/audit/banned-ips/ban ────────────────────────────────────
// Manually bans an IP
router.post('/banned-ips/ban', (req, res) => {
  try {
    const { ip, reason = 'Manual admin ban', durationMinutes = 15 } = req.body;
    if (!ip) return res.status(400).json({ ok: false, message: 'IP address is required' });

    const result = auditService.banIP(ip, reason, durationMinutes, req.user?.username || 'ADMIN');
    res.json({ ok: result.success, message: result.message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
