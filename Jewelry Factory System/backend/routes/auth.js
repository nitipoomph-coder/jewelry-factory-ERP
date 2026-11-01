const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username.toUpperCase())
      .query('SELECT UserID, UserName, Password, UserType FROM dbo.PCCUser WHERE UPPER(UserName) = @username');

    let user = result.recordset[0];
    let isAuthenticated = false;
    let role = 'sales';
    let fullName = username;
    let userId = null;

    if (user && password === user.Password) {
      isAuthenticated = true;
      role = user.UserName.toUpperCase() === 'ADMIN' ? 'admin' : 'sales';
      fullName = user.UserName;
      userId = user.UserID;
    } else {
      // Check system_users table (registered users with bcrypt)
      try {
        const sysUserRes = await pool.request()
          .input('sysUsername', sql.NVarChar, username.toUpperCase())
          .query('SELECT id, username, password_hash, full_name, role FROM system_users WHERE UPPER(username) = @sysUsername');
        const sysUser = sysUserRes.recordset[0];
        if (sysUser && sysUser.password_hash) {
          const match = await bcrypt.compare(password, sysUser.password_hash);
          if (match) {
            isAuthenticated = true;
            role = (sysUser.role || 'sales').toLowerCase();
            fullName = sysUser.full_name || sysUser.username;
            userId = sysUser.id;
          }
        }
      } catch (sysErr) {
        // If system_users table is not accessible, proceed to failure
      }
    }

    const clientIp = (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || req.ip;
    const auditService = require('../services/auditService');

    if (!isAuthenticated) {
      const banResult = auditService.recordFailedAttempt(clientIp, username);

      auditService.logEvent({
        category: 'AUTH',
        action: 'LOGIN_FAIL',
        actor: username,
        ip: clientIp,
        status: 'FAILED',
        severity: banResult.autoBanned ? 'CRITICAL' : 'MEDIUM',
        details: banResult.autoBanned
          ? 'Invalid credentials. IP auto-banned for 15 minutes due to 5 repeated failures.'
          : `Invalid username or password (Attempt ${banResult.attemptCount}/5)`,
      });

      if (banResult.autoBanned) {
        return res.status(403).json({
          success: false,
          error: 'IP_TEMPORARILY_BANNED',
          message: 'Too many failed login attempts. Your IP has been temporarily blocked for 15 minutes.',
        });
      }

      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Ensure JWT_SECRET is configured — refuse to run with a weak fallback
    if (!process.env.JWT_SECRET) {
      console.error('[FATAL] JWT_SECRET is not set in .env — refusing to issue tokens');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: userId, username: username.toUpperCase(), role: role, name: fullName },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    const permissionService = require('../services/permissionService');
    const allowedMenus = permissionService.getUserPermissions(username, role);

    // Record active session and log successful login event
    auditService.recordSession(token, { id: userId, username, role, name: fullName }, clientIp, req.headers['user-agent']);
    auditService.logEvent({
      category: 'AUTH',
      action: 'LOGIN_SUCCESS',
      actor: username,
      ip: clientIp,
      status: 'SUCCESS',
      severity: 'LOW',
      details: { role, fullName },
    });

    return res.json({ success: true, role: role, username: username.toUpperCase(), name: fullName, token, allowedMenus });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get currently logged-in user's menu permissions
const { authMiddleware: authPerm } = require('../middleware/authMiddleware');
router.get('/permissions', authPerm, (req, res) => {
  const permissionService = require('../services/permissionService');
  const allowedMenus = permissionService.getUserPermissions(req.user.username, req.user.role);
  res.json({ success: true, username: req.user.username, role: req.user.role, allowedMenus });
});

router.post('/verify-admin', async (req, res) => {
  const { password } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'];
  const auditService = require('../services/auditService');

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  const adminPwd = process.env.APP_ADMIN_PASSWORD;
  if (!adminPwd) {
    return res.status(500).json({ success: false, message: 'Admin password not configured' });
  }
  // Constant-time comparison to prevent timing attacks
  const crypto = require('crypto');
  const a = Buffer.from(password);
  const b = Buffer.from(adminPwd);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
    auditService.logEvent({
      category: 'SECURITY',
      action: 'VERIFY_ADMIN_SUCCESS',
      actor: 'ADMIN_PROSPECT',
      ip: clientIp,
      status: 'SUCCESS',
      severity: 'LOW',
      details: 'Master admin password verified',
    });
    return res.json({ success: true });
  }

  auditService.logEvent({
    category: 'SECURITY',
    action: 'VERIFY_ADMIN_FAIL',
    actor: 'ANONYMOUS',
    ip: clientIp,
    status: 'BLOCKED',
    severity: 'HIGH',
    details: 'Incorrect master admin password entered',
  });
  return res.status(401).json({ success: false, message: 'Invalid Admin Password' });
});

// Register — restricted to admin users only
const { authMiddleware: regAuth, requireRole: regRole } = require('../middleware/authMiddleware');
router.post('/register', regAuth, regRole('admin'), async (req, res) => {
  const { fullName, username, password, department } = req.body;

  if (!fullName || !username || !password || !department) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const pool = await getPool();
    const upperUsername = username.toUpperCase();

    // Check if user exists
    const checkUser = await pool.request()
      .input('username', sql.NVarChar, upperUsername)
      .query('SELECT id FROM system_users WHERE UPPER(username) = @username');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user (default role: sales)
    await pool.request()
      .input('username', sql.NVarChar, upperUsername)
      .input('pwd', sql.NVarChar, passwordHash)
      .input('name', sql.NVarChar, fullName)
      .input('dept', sql.NVarChar, department)
      .input('role', sql.NVarChar, 'sales')
      .query('INSERT INTO system_users (username, password_hash, full_name, department, role) VALUES (@username, @pwd, @name, @dept, @role)');

    return res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
