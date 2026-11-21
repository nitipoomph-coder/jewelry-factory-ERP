// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Order List (routes/orderVolumeSummary.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Route:  GET /api/dashboard/sales-orders
// Page:   Order List (/dashboard/sales-customer-detail) — drill-down from Customer Report Matrix
// Data:   order lines from VW_Web_SalesDashboard (read-only, NOLOCK) — the same view and
//         filters as Sales Summary / Customer Report (/api/dashboard/customer-summary), so the
//         drill-down totals reconcile with the page it was opened from. The view leaves out
//         non-sales prefixes (BBP pre-production, BBL location split of BBC orders, BBT returns,
//         BBS showroom, BBK stock, BBD development samples).
// Filter: years / months / week range / day range / date basis (buildSalesFilters)
//         + customers or excludeCustomers (General group)
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

const SALES_VIEW = 'dbo.VW_Web_SalesDashboard';

const { salesDateBasis, buildSalesFilters } = require('../utils/dateFilters');

// [SALES ORDER DETAIL] GET /api/dashboard/sales-orders
router.get('/sales-orders', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      SELECT
        v.OrdWeek AS ordWeek,
        v.OrdNo AS orderNo,
        v.OrdLineNo AS ordLineNo,
        v.PONo AS poNo,
        v.PO2 AS po2,
        v.OrdDate AS ordDate,
        v.DueDate AS dueDate,
        v.CustDueDate AS custDate,
        v.CustCode AS customerCode,
        v.SalesName AS salesName,
        v.ShipTo AS shipTo,
        v.OrdStamp AS ordStamp,
        v.OrdMaker AS ordMaker,
        v.ItemNo AS itemNo,
        v.[Item SKU] AS itemSku,
        LEFT(ISNULL(v.ItemNo, ''), 3) AS productTypeCode,
        v.[Cust Item] AS custItem,
        v.ItemType AS itemType,
        v.ItemMat AS itemMat,
        v.ItemSize AS itemSize,
        v.ItemStone AS itemStone,
        v.ItemDesc AS itemDesc,
        v.ItemPlate AS itemPlate,
        v.SetType AS setType,
        v.ItemWeight AS itemWeight,
        v.ItemQty AS orderQty,
        v.ExportQty AS shippedQty,
        v.OpenQty AS openQty,
        v.ItemPrice AS itemPrice,
        v.ItemAmnt AS itemAmnt,
        ISNULL(v.ExportQty * v.ItemPrice, 0) AS shippedAmnt
      FROM ${SALES_VIEW} v WITH (NOLOCK)
      WHERE ${whereSql}
      ORDER BY v.OrdDate DESC, v.OrdNo, v.OrdLineNo
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-orders:', err.message);
    res.status(err.statusCode || 500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
