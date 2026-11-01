const express = require('express');
const router = express.Router();

// In-memory lock registry: Map<docNo, { user, timestamp }>
// Since we don't have user auth yet, we'll use a generic user or let frontend pass a clientId/username
const locks = new Map();
const LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes auto-release

// ─── Acquire Lock ─────────────────────────────────────────────────────────────
router.post('/acquire', (req, res) => {
  const { docNo, user: bodyUser } = req.body;
  const user = req.user?.username || bodyUser || 'Anonymous';
  if (!docNo) return res.status(400).json({ ok: false, error: 'docNo is required' });

  const now = Date.now();
  const existingLock = locks.get(docNo);

  // Clean up expired lock
  if (existingLock && now - existingLock.timestamp > LOCK_TIMEOUT_MS) {
    locks.delete(docNo);
  }

  if (locks.has(docNo)) {
    const lockInfo = locks.get(docNo);
    if (lockInfo.user === user) {
      // Extend own lock
      locks.set(docNo, { user, timestamp: now });
      return res.json({ ok: true, message: 'Lock extended' });
    }
    return res.status(409).json({
      ok: false,
      error: 'Locked by another user',
      lockedBy: lockInfo.user,
      lockedAt: new Date(lockInfo.timestamp).toISOString()
    });
  }

  // Acquire new lock
  locks.set(docNo, { user, timestamp: now });
  res.json({ ok: true, message: 'Lock acquired' });
});

// ─── Release Lock ─────────────────────────────────────────────────────────────
router.post('/release', (req, res) => {
  const { docNo, user: bodyUser } = req.body;
  const user = req.user?.username || bodyUser || 'Anonymous';
  if (!docNo) return res.status(400).json({ ok: false, error: 'docNo is required' });

  const existingLock = locks.get(docNo);
  if (existingLock && existingLock.user === user) {
    locks.delete(docNo);
    return res.json({ ok: true, message: 'Lock released' });
  }

  res.json({ ok: true, message: 'No lock found or not owned by user' });
});

// ─── Check Lock Status ────────────────────────────────────────────────────────
router.get('/status/:docNo', (req, res) => {
  const docNo = req.params.docNo;
  const now = Date.now();
  const existingLock = locks.get(docNo);

  if (existingLock && now - existingLock.timestamp > LOCK_TIMEOUT_MS) {
    locks.delete(docNo);
  }

  if (locks.has(docNo)) {
    res.json({ ok: true, locked: true, lock: locks.get(docNo) });
  } else {
    res.json({ ok: true, locked: false });
  }
});

module.exports = router;
