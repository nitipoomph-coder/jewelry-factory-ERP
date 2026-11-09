console.log('=========================================');
console.log('!!! DIAGNOSTIC: SERVER IS STARTING !!!');
console.log('Path:', __filename);
console.log('=========================================');

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Vite) to prevent ERR_ERL_PERMISSIVE_TRUST_PROXY
const PORT = process.env.API_PORT || process.env.PORT || 3001;

// ─── Security Middleware ───────────────────────────────────────────────────────

// Security headers (XSS, clickjacking, MIME sniffing protection)
app.use(helmet());

// CORS — restrict to allowed origins only
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin (for local intranet usage from other IP addresses)
    callback(null, true);
  },
  credentials: true,
}));

// Log each API request during development.
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString('th-TH')}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.json({ limit: '1mb' }));

// ─── IP Jail & Auto-Ban Defense Filter (Front Gate) ───────────────────────────
app.use((req, res, next) => {
  try {
    const auditService = require('./services/auditService');
    const clientIp = (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || req.ip;
    const banInfo = auditService.checkIPBanned(clientIp);
    if (banInfo) {
      return res.status(403).json({
        success: false,
        error: 'IP_TEMPORARILY_BANNED',
        message: `Your IP (${banInfo.ip}) has been blocked due to security violations. Reason: ${banInfo.reason}`,
        bannedAt: banInfo.bannedAt,
        expiresAt: banInfo.expiresAt,
      });
    }
  } catch (err) {}
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { getPool } = require('./db');
    const pool = await getPool();
    const result = await pool.request().query('SELECT GETDATE() AS serverTime');
    res.json({
      ok: true,
      message: 'API is running',
      serverTime: result.recordset[0].serverTime,
    });
  } catch (err) {
    console.error('[HealthCheck DB Error]:', err.message);
    res.status(500).json({ ok: false, error: 'Database connection failed' });
  }
});

// Network photo bridge
const fs = require('fs');

// Helper: validate itemNo to prevent path traversal
function sanitizeItemNo(itemNo, req) {
  const cleaned = (itemNo || '').trim();
  // Block path traversal characters
  if (/[\/\\:*?"<>|]|\.\./g.test(cleaned) || cleaned.length > 100) {
    try {
      const auditService = require('./services/auditService');
      auditService.logEvent({
        category: 'SECURITY',
        action: 'PATH_TRAVERSAL_ATTEMPT',
        actor: req?.user?.username || 'ANONYMOUS',
        ip: req?.ip || req?.headers['x-forwarded-for'],
        status: 'BLOCKED',
        severity: 'CRITICAL',
        details: `Path traversal probe detected in Photo Bridge parameter: "${itemNo}"`,
      });
    } catch (e) {
      // Ignore logging failure in sanitizer
    }
    return null;
  }
  return cleaned;
}

// Photo share folders come from .env (semicolon-separated) so internal paths stay out of source control
function parsePhotoDirs(value) {
  return String(value || '')
    .split(';')
    .map((dir) => dir.trim())
    .filter(Boolean);
}

// Register the Photo Bridge API Route (PS Photo / Cost)
app.get('/api/photos/ps/:itemNo', (req, res) => {
  const itemNo = sanitizeItemNo(req.params.itemNo, req);
  if (!itemNo) {
    return res.status(400).send('Invalid item number');
  }
  console.log(`[PhotoBridge PS] Serving Item: ${itemNo}`);

  const searchDirs = parsePhotoDirs(process.env.PHOTO_PS_DIRS);

  const formats = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
  let foundFile = null;

  for (const baseDir of searchDirs) {
    try {
      for (const ext of formats) {
        const testPath = path.join(baseDir, `${itemNo}${ext}`);
        if (fs.existsSync(testPath)) {
          foundFile = testPath;
          break;
        }
      }
      if (!foundFile && itemNo.length === 8) {
        for (const suffix of ['A', 'B', 'C', 'D', 'E']) {
          for (const ext of formats) {
            const testPath = path.join(baseDir, `${itemNo}${suffix}${ext}`);
            if (fs.existsSync(testPath)) {
              foundFile = testPath;
              break;
            }
          }
          if (foundFile) break;
        }
      }
    } catch (e) {
      // Access denied or offline share - skip silently
    }
    if (foundFile) break;
  }

  if (foundFile) {
    res.setHeader('X-Source-Origin', 'RealServer-PS');
    return res.sendFile(foundFile);
  }

  res.status(404).send('PS Photo not found');
});

// Register the Photo Bridge API Route (CAD Photo / MoldCAD)
app.get('/api/photos/cad/:itemNo', (req, res) => {
  const itemNo = sanitizeItemNo(req.params.itemNo, req);
  if (!itemNo) {
    return res.status(400).send('Invalid item number');
  }
  console.log(`[PhotoBridge CAD] Serving Item: ${itemNo}`);

  const searchDirs = parsePhotoDirs(process.env.PHOTO_CAD_DIRS);

  const formats = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
  let foundFile = null;

  for (const baseDir of searchDirs) {
    try {
      for (const ext of formats) {
        const testPath = path.join(baseDir, `${itemNo}${ext}`);
        if (fs.existsSync(testPath)) {
          foundFile = testPath;
          break;
        }
      }
      if (!foundFile && itemNo.length === 8) {
        for (const suffix of ['A', 'B', 'C', 'D', 'E']) {
          for (const ext of formats) {
            const testPath = path.join(baseDir, `${itemNo}${suffix}${ext}`);
            if (fs.existsSync(testPath)) {
              foundFile = testPath;
              break;
            }
          }
          if (foundFile) break;
        }
      }
    } catch (e) {
      // Access denied or offline share - skip silently
    }
    if (foundFile) break;
  }

  if (foundFile) {
    res.setHeader('X-Source-Origin', 'RealServer-CAD');
    return res.sendFile(foundFile);
  }

  res.status(404).send('CAD Photo not found');
});



// ─── Rate Limiting ─────────────────────────────────────────────────────────────

// Strict rate limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // max 15 attempts per window
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    try {
      const auditService = require('./services/auditService');
      auditService.logEvent({
        category: 'SECURITY',
        action: 'RATE_LIMIT_EXCEEDED',
        actor: req.body?.username || 'ANONYMOUS',
        ip: req.ip || req.headers['x-forwarded-for'],
        status: 'BLOCKED',
        severity: 'HIGH',
        details: 'Exceeded 15 login attempts within 15 minutes',
      });
    } catch (e) {}
    res.status(options.statusCode).json(options.message);
  },
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,                 // max 200 requests per minute
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});


app.use('/api/', apiLimiter);

// ─── Routes ────────────────────────────────────────────────────────────────────
const { authMiddleware, requireRole, requireMenu, requireMenuByPath } = require('./middleware/authMiddleware');

// Per-user menu guards — API → menu map lives in middleware/apiMenuRules.js (ids match frontend menuConfig).
const { PRODUCTION_GROUP, DASHBOARD_MENU_RULES, TOP_ITEMS_MENUS } = require('./middleware/apiMenuRules');
const dashboardGuard = [authMiddleware, requireMenuByPath(DASHBOARD_MENU_RULES, '/api/dashboard')];

app.use('/api/auth', authLimiter, require('./routes/auth'));   // Login API (rate limited)
app.use('/api/admin/audit', authMiddleware, requireRole('admin'), require('./routes/adminAudit')); // 🛡️ Zero-DB Admin Security & Audit
app.use('/api/admin/users', authMiddleware, requireRole('admin'), require('./routes/adminUsers')); // 👥 Admin User Management
app.use('/api/orders', authMiddleware, requireMenu(['po-tracker', PRODUCTION_GROUP]), require('./routes/poTracker'));
app.use('/api/dashboard', dashboardGuard, require('./routes/productionDashboard'));
app.use('/api/dashboard', dashboardGuard, require('./routes/customerReportMatrix'));
app.use('/api/dashboard', dashboardGuard, require('./routes/orderVolumeSummary'));
app.use('/api/production-summary', authMiddleware, requireMenu(['pro-sum', PRODUCTION_GROUP], { exceptPaths: ['/holidays'] }), require('./routes/productionSummary')); // /holidays is shared with CCTV Report
app.use('/api/production-forecast', authMiddleware, requireMenu(['pro-forecast', PRODUCTION_GROUP]), require('./routes/productionForecast'));
app.use('/api/order-tracking', authMiddleware, requireRole('admin', 'sales'), requireMenu(['fbe-order-track', PRODUCTION_GROUP]), require('./routes/orderTracking'));
app.use('/api/items', authMiddleware, requireMenu(TOP_ITEMS_MENUS), require('./routes/topOrdersGallery'));
app.use('/api/search', authMiddleware, require('./routes/search')); // results filtered per user inside the route (hasMenu)
app.use('/api/procurement', authMiddleware, requireRole('admin'), require('./routes/procurementReceiving'));
app.use('/api/requisition', authMiddleware, requireRole('admin'), require('./routes/orderLinesIssues')); // Requisition routes (SOA, SIA, SIB, SIP, SIS)
app.use('/api/sample', authMiddleware, requireRole('admin'), require('./routes/sampleDepartment'));            // Sample Room routes (SSA, SIM)
app.use('/api/lock', authMiddleware, require('./routes/lock'));                // Document locking

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.stack);
  res.status(500).json({ ok: false, error: 'Internal Server Error' });
});

// Start server (Express 5 returns a Promise from app.listen)
(async () => {
  try {
    await app.listen(PORT);
    console.log(`API Server running at http://localhost:${PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();