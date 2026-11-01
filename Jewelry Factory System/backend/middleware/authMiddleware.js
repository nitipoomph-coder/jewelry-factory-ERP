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

module.exports = { authMiddleware, requireRole };
