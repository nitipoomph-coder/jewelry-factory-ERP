// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Customer Sales Analysis (routes/salesAnalytics.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Handles data fetching for the Order Trends dashboards from the new lean
// view VW_Web_OrderTrends (Volume/Qty only, No Pricing).
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

const SALES_ANALYTICS_VIEW = 'dbo.VW_Web_OrderTrends';

const { salesDateBasis, buildSalesFilters } = require('../utils/dateFilters');

// [SALES MONTHLY ANALYTICS] GET /api/dashboard/sales-monthly-analytics
router.get('/sales-monthly-analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      SELECT
        YEAR(${dateExpr}) AS year,
        MONTH(${dateExpr}) AS month,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        SUM(v.ItemQty) AS qty,
        SUM(v.ExportQty) AS shippedQty,
        SUM(v.OpenQty) AS gapQty,
        SUM(v.ItemAmnt) AS amount,
        SUM(ISNULL(v.ExportQty * v.ItemPrice, 0)) AS shippedAmount,
        CASE WHEN COUNT(DISTINCT v.OrdNo) = 0 THEN 0 ELSE CAST(SUM(v.ItemQty) AS FLOAT) / COUNT(DISTINCT v.OrdNo) END AS avgQtyPerOrder,
        CASE WHEN COUNT(DISTINCT v.OrdNo) = 0 THEN 0 ELSE CAST(SUM(v.ItemAmnt) AS FLOAT) / COUNT(DISTINCT v.OrdNo) END AS avgAmountPerOrder
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      GROUP BY YEAR(${dateExpr}), MONTH(${dateExpr})
      ORDER BY year, month
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-monthly-analytics:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [SALES RISK ANALYTICS] GET /api/dashboard/sales-risk-analytics
router.get('/sales-risk-analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      WITH Lines AS (
        SELECT
          YEAR(${dateExpr}) AS year,
          MONTH(${dateExpr}) AS month,
          v.CustCode AS custCode,
          v.ItemQty AS qty,
          v.OpenQty AS openQty,
          v.ItemAmnt AS amount,
          v.CustDueDate AS custDueDate
        FROM ${SALES_ANALYTICS_VIEW} v
        WHERE ${whereSql} AND v.OpenQty > 0
      )
      SELECT
        year,
        month,
        custCode,
        SUM(openQty) AS wipQty,
        SUM(CASE WHEN qty > 0 THEN (CAST(openQty AS FLOAT) / qty) * amount ELSE 0 END) AS wipAmount,
        SUM(CASE WHEN custDueDate < GETDATE() THEN openQty ELSE 0 END) AS overdueQty,
        SUM(CASE WHEN custDueDate < GETDATE() THEN (CASE WHEN qty > 0 THEN (CAST(openQty AS FLOAT) / qty) * amount ELSE 0 END) ELSE 0 END) AS overdueAmount
      FROM Lines
      GROUP BY year, month, custCode
      ORDER BY year, month, custCode
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-risk-analytics:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [SALES WEEKLY ANALYTICS] GET /api/dashboard/sales-weekly-analytics
router.get('/sales-weekly-analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      SELECT
        YEAR(${dateExpr}) AS year,
        DATEPART(iso_week, ${dateExpr}) AS week,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        SUM(v.ItemQty) AS qty,
        SUM(v.ExportQty) AS shippedQty,
        SUM(v.OpenQty) AS gapQty,
        SUM(v.ItemAmnt) AS amount,
        SUM(ISNULL(v.ExportQty * v.ItemPrice, 0)) AS shippedAmount
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      GROUP BY YEAR(${dateExpr}), DATEPART(iso_week, ${dateExpr})
      ORDER BY year, week
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-weekly-analytics:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [DELIVERY & DEPARTMENT OUTLOOK] GET /api/dashboard/sales-delivery-outlook
router.get('/sales-delivery-outlook', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      -- 1. Delivery Risk Buckets
      SELECT 
        v.DueRiskBucket AS bucket,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        COUNT(1) AS lineCount,
        SUM(v.ItemQty) AS totalQty,
        SUM(v.ExportQty) AS shippedQty,
        SUM(v.OpenQty) AS openQty,
        SUM(v.ItemAmnt) AS totalAmount,
        SUM(ISNULL(v.ExportQty * v.ItemPrice, 0)) AS shippedAmount,
        SUM(CASE WHEN v.ItemQty > 0 THEN v.ItemAmnt * (CAST(v.OpenQty AS FLOAT) / v.ItemQty) ELSE 0 END) AS openAmount
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      GROUP BY v.DueRiskBucket;

      -- 2. Department Breakdown for Open/Pending items
      SELECT 
        v.CurrentDepartment AS department,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        COUNT(1) AS lineCount,
        SUM(v.OpenQty) AS openQty,
        SUM(CASE WHEN v.ItemQty > 0 THEN v.ItemAmnt * (CAST(v.OpenQty AS FLOAT) / v.ItemQty) ELSE 0 END) AS openAmount
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql} AND v.OpenQty > 0 AND v.CurrentDepartment <> 'Shipped'
      GROUP BY v.CurrentDepartment
      ORDER BY openQty DESC;

      -- 3. Customer Code Backlog Summary (Confidential - No CustName)
      SELECT 
        v.CustCode AS custCode,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        SUM(v.ItemQty) AS totalQty,
        SUM(v.ExportQty) AS shippedQty,
        SUM(v.OpenQty) AS openQty,
        SUM(v.ItemAmnt) AS totalAmount,
        SUM(CASE WHEN v.DueRiskBucket = 'Overdue' THEN v.OpenQty ELSE 0 END) AS overdueQty,
        SUM(CASE WHEN v.DueRiskBucket = 'Due in 15 Days' THEN v.OpenQty ELSE 0 END) AS due15Qty
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      GROUP BY v.CustCode
      ORDER BY openQty DESC;
    `);

    res.json({
      ok: true,
      data: {
        buckets: result.recordsets[0] || [],
        departments: result.recordsets[1] || [],
        customers: result.recordsets[2] || []
      }
    });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-delivery-outlook:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [SALES ORDER DETAIL] GET /api/dashboard/sales-orders
router.get('/sales-orders', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    let { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const bucket = req.query.bucket;
    const department = req.query.department;

    if (bucket) {
      request.input('paramBucket', sql.NVarChar, bucket);
      whereSql += ` AND v.DueRiskBucket = @paramBucket`;
    }
    if (department) {
      request.input('paramDept', sql.NVarChar, department);
      whereSql += ` AND v.CurrentDepartment = @paramDept`;
    }

    const result = await request.query(`
      SELECT
        v.OrdWeek AS ordWeek,
        v.OrdNo AS orderNo,
        v.PONo AS poNo,
        v.PO2 AS po2,
        v.OrdDate AS ordDate,
        v.DueDate AS dueDate,
        v.CustDueDate AS custDate,
        v.CustCode AS customerCode,
        v.OrdKind AS ordKind,
        v.Metal AS metal,
        v.ShipTo AS shipTo,
        v.ItemNo AS itemNo,
        LEFT(ISNULL(v.ItemNo, ''), 3) AS productTypeCode,
        v.ItemQty AS orderQty,
        v.ExportQty AS shippedQty,
        v.OpenQty AS openQty,
        v.ItemPrice AS itemPrice,
        v.ItemAmnt AS itemAmnt,
        ISNULL(v.ExportQty * v.ItemPrice, 0) AS shippedAmnt,
        v.DaysToCustDue AS daysToCustDue,
        v.DueRiskBucket AS dueRiskBucket,
        v.CurrentDepartment AS currentDepartment
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      ORDER BY v.OrdDate DESC, v.OrdNo
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-orders:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Legacy routes kept alive to avoid breaking other pages
router.get('/top-items', async (req, res) => {
  res.json({ ok: true, data: [] });
});
router.get('/sales-customer-groups', async (req, res) => {
  res.json({ ok: true, data: [] });
});
router.get('/sales-due-outlook', async (req, res) => {
  res.json({ ok: true, data: [] });
});

module.exports = router;
