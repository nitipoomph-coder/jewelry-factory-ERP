const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const { hasMenu } = require('../middleware/authMiddleware');
const { PO_TRACKER_MENUS } = require('../middleware/apiMenuRules');

// รูปเสิร์ฟจาก network path (/api/photos/ps|cad/:itemNo) — search คืน itemNo ให้ frontend ประกอบ URL เอง
// All reads are display-only → WITH (NOLOCK) so the global search never waits on (or deadlocks with)
// the legacy VB.NET writers on OrdHD/OrdDT/GMCust. See docs/debug-history.md (FBE Order Tracker Deadlock).
// PO / Order / Customer results open PO Tracker pages → only searched for users with PO Tracker permission.

router.get('/', async (req, res) => {
  try {
    const { q, type } = req.query;
    const queryText = q ? String(q).trim() : '';
    const searchType = type ? String(type).toLowerCase().trim() : null;

    console.log(`[Search Request] q: "${queryText}", type: "${searchType}"`);
    if (queryText.length < 2) return res.json({ ok: true, data: [] });

    const pool = await getPool();
    const likeQuery = `%${queryText}%`;
    const prefixQuery = `${queryText}%`;
    const results = [];
    const canOpenPoTracker = hasMenu(req.user, PO_TRACKER_MENUS);

    // Search POs (OrdHD by PONo)
    if (canOpenPoTracker && (!searchType || searchType === 'po')) {
      const poResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          WITH FilteredPOs AS (
            SELECT TOP 10 h.OrdNo, h.PONo, h.EXNo, h.CustCode, c.SalesName,
            (SELECT SUM(ISNULL(ItemQty, 0)) FROM OrdDT WITH (NOLOCK) WHERE OrdNo = h.OrdNo) AS Qty
            FROM OrdHD h WITH (NOLOCK)
            LEFT JOIN GMCust c WITH (NOLOCK) ON c.CustCode = h.CustCode
            WHERE h.PONo LIKE @qPrefix OR h.PONo LIKE @q OR h.EXNo LIKE @qPrefix OR h.EXNo LIKE @q
          )
          SELECT 
            ISNULL(f.PONo, ISNULL(f.EXNo, '')) + '-' + f.OrdNo AS id, 
            'po' AS type, 
            'PONo: ' + ISNULL(f.PONo, ISNULL(f.EXNo, '-')) AS title, 
            'Cust: ' + ISNULL(f.CustCode, '') + ' / Qty: ' + CAST(CAST(ISNULL(f.Qty, 0) AS INT) AS VARCHAR) AS sub, 
            '/po-tracker?fPO=' + ISNULL(f.PONo, ISNULL(f.EXNo, f.OrdNo)) AS path,
            d.ItemNo AS itemNo
          FROM FilteredPOs f
          LEFT JOIN OrdDT d WITH (NOLOCK) ON d.OrdNo = f.OrdNo AND d.OrdLineNo = '1'
        `);
      results.push(...poResult.recordset);
    }

    // Search Orders (OrdHD by OrdNo)
    if (canOpenPoTracker && (!searchType || searchType === 'order')) {
      const orderResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          WITH FilteredOrders AS (
            SELECT TOP 10 h.OrdNo, h.PONo, h.CustCode, c.SalesName
            FROM OrdHD h WITH (NOLOCK)
            LEFT JOIN GMCust c WITH (NOLOCK) ON c.CustCode = h.CustCode
            WHERE h.OrdNo LIKE @qPrefix
          )
          SELECT 
            f.OrdNo AS id, 
            'order' AS type, 
            f.OrdNo AS title, 
            'PO: ' + ISNULL(f.PONo, '-') + ' / Cust: ' + ISNULL(f.CustCode, '') AS sub, 
            '/po-tracker/ord/' + f.OrdNo AS path,
            d.ItemNo AS itemNo
          FROM FilteredOrders f
          LEFT JOIN OrdDT d WITH (NOLOCK) ON d.OrdNo = f.OrdNo AND d.OrdLineNo = '1'
        `);
      results.push(...orderResult.recordset);
    }

    // Search Items (OrdDT)
    if (!searchType || searchType === 'item') {
      const itemResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          WITH FilteredItems AS (
            SELECT TOP 10 d.ItemNo, MAX(d.ItemMat) AS ItemMat, MAX(h.CustCode) AS CustCode
            FROM OrdDT d WITH (NOLOCK)
            JOIN OrdHD h WITH (NOLOCK) ON h.OrdNo = d.OrdNo
            WHERE d.ItemNo LIKE @qPrefix OR d.ItemDesc LIKE @qPrefix
            GROUP BY d.ItemNo
          )
          SELECT 
            f.ItemNo AS id, 
            'item' AS type, 
            f.ItemNo AS title, 
            'Mat: ' + ISNULL(f.ItemMat, '-') + ' / Cust: ' + ISNULL(f.CustCode, '') AS sub, 
            '/item-detail/' + f.ItemNo AS path,
            f.ItemNo AS itemNo
          FROM FilteredItems f
        `);
      results.push(...itemResult.recordset);
    }

    // Search Customers (GMCust) — show CustCode only; never expose CustName
    if (canOpenPoTracker && (!searchType || searchType === 'customer')) {
      const custResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          SELECT TOP 10
            c.CustCode AS id,
            'customer' AS type,
            c.CustCode AS title,
            '' AS sub,
            '/po-tracker?fCust=' + c.CustCode AS path
          FROM GMCust c WITH (NOLOCK)
          WHERE c.CustCode LIKE @qPrefix OR c.CustName LIKE @q
        `);
      results.push(...custResult.recordset.map(r => ({ ...r, itemNo: null })));
    }

    res.json({ ok: true, data: results });
  } catch (err) {
    console.error('[Search API Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
