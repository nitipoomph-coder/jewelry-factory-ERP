const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Allow OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session has been terminated by admin (Zero-DB in-memory check)
    const auditService = require('../services/auditService');
    if (auditService.isTokenRevoked(token)) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Session terminated by administrator' });
    }

    // Update active session timestamp and presence activity in memory (Zero-DB)
    const clientIp = (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || req.ip;
    let pagePath = req.headers['x-page-path'] || '';
    if (!pagePath && req.headers['referer']) {
      try {
        const parsedUrl = new URL(req.headers['referer']);
        pagePath = parsedUrl.pathname + parsedUrl.search;
      } catch (e) {}
    }

    auditService.touchSession(token, decoded, clientIp, req.headers['user-agent'], {
      pagePath,
      originalUrl: req.originalUrl,
      method: req.method,
      query: req.query,
    });

    req.user = decoded; // { username, role, iat, exp }
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Token verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No user role found' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
  }
  next();
};

/**
 * Per-user menu permission guard (must run after authMiddleware).
 * Allows the request when the user's allowedMenus contain '*' or any of `menuIds`
 * (pass the page's item id AND its group id — a group permission grants its children,
 * same rule as the frontend Sidebar). Permissions are read live from permissionService,
 * so admin changes take effect immediately for API calls.
 *
 * options.exceptPaths: sub-paths (relative to the mount point) shared with other pages
 * that must not be gated by this menu, e.g. '/holidays'.
 */
/** True when the user's allowedMenus contain '*' or any of `menuIds` (read live from permissionService). */
const hasMenu = (user, menuIds) => {
  if (!user || !user.username) return false;
  const permissionService = require('../services/permissionService');
  const allowed = permissionService.getUserPermissions(user.username, user.role) || [];
  return allowed.includes('*') || menuIds.some(id => allowed.includes(id));
};

const denyMenu = (req, res, reason) => {
  console.warn(`⛔ [MENU DENIED] ${req.user.username} → ${req.method} ${req.originalUrl} (${reason})`);
  return res.status(403).json({ ok: false, error: 'Forbidden: You do not have access to this page' });
};

const requireMenu = (menuIds, options = {}) => {
  const exceptPaths = options.exceptPaths || [];
  return (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (exceptPaths.some(p => req.path === p || req.path.startsWith(p + '/'))) return next();

    if (!req.user || !req.user.username) {
      return res.status(401).json({ ok: false, error: 'Unauthorized: No user found' });
    }
    if (hasMenu(req.user, menuIds)) return next();
    return denyMenu(req, res, `needs one of: ${menuIds.join(', ')}`);
  };
};

/**
 * Per-path menu guard for API prefixes shared by several pages (must run after authMiddleware).
 * `rules` is an ordered list of { match: (path) => boolean, menus: string[] | null };
 * the first matching rule wins. `menus: null` = any signed-in user (non-sensitive metadata).
 * A path that matches no rule is DENIED (fail closed) — add a rule when adding an endpoint.
 */
const requireMenuByPath = (rules, label) => (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (!req.user || !req.user.username) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: No user found' });
  }

  const rule = rules.find(r => r.match(req.path));
  if (!rule) {
    console.warn(`⚠️ [MENU RULE MISSING] ${label}: no menu rule for ${req.method} ${req.path} — denied`);
    return denyMenu(req, res, `no menu rule for ${label}${req.path}`);
  }
  if (rule.menus === null || hasMenu(req.user, rule.menus)) return next();
  return denyMenu(req, res, `needs one of: ${rule.menus.join(', ')}`);
};

module.exports = { authMiddleware, requireRole, requireMenu, requireMenuByPath, hasMenu };
