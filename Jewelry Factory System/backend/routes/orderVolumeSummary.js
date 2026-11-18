// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Order List (routes/orderVolumeSummary.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Route:  GET /api/dashboard/sales-orders
// Page:   Order List (/dashboard/sales-customer-detail) — drill-down from Customer Report Matrix
// Data:   order lines from the lean view VW_Web_OrderTrends (read-only, NOLOCK)
// Filter: years / months / date range (buildSalesFilters) + customers or excludeCustomers (General group)
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

const SALES_ANALYTICS_VIEW = 'dbo.VW_Web_OrderTrends';

const { salesDateBasis, buildSalesFilters } = require('../utils/dateFilters');

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
      FROM ${SALES_ANALYTICS_VIEW} v WITH (NOLOCK)
      WHERE ${whereSql}
      ORDER BY v.OrdDate DESC, v.OrdNo, v.OrdLineNo
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-orders:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
