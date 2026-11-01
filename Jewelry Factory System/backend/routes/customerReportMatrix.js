// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Customer Report Matrix (routes/customerReportMatrix.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Handles yearly aggregated sales data per customer directly querying OrdHD/OrdDT.
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const { buildSalesFilters, salesDateBasis } = require('../utils/dateFilters');

/*
 * =============================================================================
 * CUSTOMER SUMMARY ROUTES OVERVIEW
 * =============================================================================
 * Route                                  | Page/Menu           | Description
 * -------------------------------------- | ------------------- | ------------------------
 * GET /api/dashboard/customer-summary   | Customer Dashboard  | Sales by customer/year
 * GET /api/dashboard/customer-summary   | Top Orders          | First-load ranking source
 *
 * Filter policy:
 * - years selects the dashboard period; months narrows customer totals and top item ranking.
 * - Uses legacy NOT IN OrdNo blocklist: BBP, BBK, BBS, BBL, BBT, BBD.
 * - Active customers only: CustStatus = 'Y'.
 * =============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════════
// [CUSTOMER DASHBOARD] GET /api/dashboard/customer-summary?years=2024,2025
// ใช้โดย: หน้า Customer Dashboard (CustomerDashboard.tsx)
// หน้าที่: ดึงยอดขายรวม (SumOrdExchAmnt) จับกลุ่มตาม Customer และปี/เดือน
//         เพื่อแสดง Bar Chart, Monthly Breakdown, Breakdown Table
//
// ⚠️ OrdNo Filter: ใช้ NOT IN blocklist ตาม Legacy VB.NET (FrmSalesYear_SumCust)
//    → ไม่นับ BBP, BBK, BBS, BBL, BBT, BBD
//    → กรองเฉพาะ CustStatus = 'Y' (ลูกค้า Active เท่านั้น)
// ═══════════════════════════════════════════════════════════════════════════════
// Customer Summary cards and Top Orders first ranking source.
router.get('/customer-summary', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    const typeParam = req.query.type || 'ALL';
    const { dateExpr: dateColumn } = salesDateBasis(req, '');
    const { whereSql: sargableDateCondition } = buildSalesFilters(req, request, '', dateColumn);
    
    let typeCondition = '';
    if (typeParam !== 'ALL') {
      typeCondition = ` AND ProductType = @productType`;
      request.input('productType', sql.NVarChar, typeParam);
    }

    // ✅ OPTIMIZED: สร้าง Temporary Table และดึงข้อมูล 4 ชุดในคำสั่งเดียว
    const multiQuery = `
      -- 1. กรองข้อมูลเฉพาะช่วงเวลาที่ต้องการมาใส่ Temporary Table (#FilteredSales)
      IF OBJECT_ID('tempdb..#FilteredSales') IS NOT NULL DROP TABLE #FilteredSales;

      SELECT 
        CustCode,
        CustName,
        CustStatus,
        SalesName,
        YEAR(${dateColumn}) AS OrdYear,
        MONTH(${dateColumn}) AS OrdMonth,
        DATEPART(isowk, ${dateColumn}) AS OrdWeek,
        ItemAmnt,
        ItemQty,
        ItemNo,
        ProductType
      INTO #FilteredSales
      FROM VW_Web_SalesDashboard
      WHERE ${sargableDateCondition}
        AND ISNULL(CustStatus, 'Y') = 'Y'
        ${typeCondition};

      -- 2. ดึงข้อมูล 4 ชุด จาก Temporary Table

      -- [Recordset 0] General Sales
      SELECT
        CustCode AS id,
        MAX(CustName) AS name,
        MAX(CustStatus) AS custStatus,
        MAX(SalesName) AS salesName,
        OrdYear AS yr,
        OrdMonth AS mth,
        OrdWeek AS wk,
        SUM(ItemAmnt) AS totalSales,
        SUM(ItemQty) AS totalQty
      FROM #FilteredSales
      GROUP BY CustCode, OrdYear, OrdMonth, OrdWeek;

      -- [Recordset 1] Top Item All-time
      WITH ItemTotals AS (
        SELECT CustCode, ItemNo, SUM(ItemQty) as totalQty
        FROM #FilteredSales
        GROUP BY CustCode, ItemNo
      ),
      RankedItems AS (
        SELECT CustCode, ItemNo, totalQty,
          ROW_NUMBER() OVER(PARTITION BY CustCode ORDER BY totalQty DESC) as rn
        FROM ItemTotals
      )
      SELECT CustCode as id, ItemNo as topItem, totalQty as topItemQty
      FROM RankedItems WHERE rn = 1;

      -- [Recordset 2] Top Item By Year
      WITH ItemTotals AS (
        SELECT CustCode, OrdYear AS yr, ItemNo, SUM(ItemQty) as totalQty
        FROM #FilteredSales
        GROUP BY CustCode, OrdYear, ItemNo
      ),
      RankedItems AS (
        SELECT CustCode, yr, ItemNo, totalQty,
          ROW_NUMBER() OVER(PARTITION BY CustCode, yr ORDER BY totalQty DESC) as rn
        FROM ItemTotals
      )
      SELECT CustCode as id, yr, ItemNo as topItem, totalQty as topItemQty
      FROM RankedItems WHERE rn = 1;

      -- [Recordset 3] Top Item By Year & Type
      WITH ItemTotals AS (
        SELECT CustCode, OrdYear AS yr, ProductType, ItemNo, SUM(ItemQty) as totalQty
        FROM #FilteredSales
        GROUP BY CustCode, OrdYear, ProductType, ItemNo
      ),
      RankedItems AS (
        SELECT CustCode, yr, ProductType, ItemNo, totalQty,
          ROW_NUMBER() OVER(PARTITION BY CustCode, yr, ProductType ORDER BY totalQty DESC) as rn
        FROM ItemTotals
      )
      SELECT CustCode as id, yr, ProductType as productType, ItemNo as topItem, totalQty as topItemQty
      FROM RankedItems WHERE rn = 1;

      -- 3. ลบ Temporary Table
      DROP TABLE #FilteredSales;
    `;

    // ยิง Query ครั้งเดียวจบ
    const multiResult = await request.query(multiQuery);
    
    // ดึง Recordsets ทั้ง 4 ชุดมาใช้งาน
    const resultRows = multiResult.recordsets[0] || [];
    const topItemRows = multiResult.recordsets[1] || [];
    const topItemByYearRows = multiResult.recordsets[2] || [];
    const topItemByYearTypeRows = multiResult.recordsets[3] || [];

    const topItemMap = {};
    topItemRows.forEach(r => {
      topItemMap[r.id] = {
        topItem: r.topItem,
        topItemQty: r.topItemQty
      };
    });

    const topItemsByYearMap = {};
    topItemByYearRows.forEach(r => {
      if (!topItemsByYearMap[r.id]) topItemsByYearMap[r.id] = {};
      topItemsByYearMap[r.id][String(r.yr)] = {
        topItem: r.topItem,
        topItemQty: r.topItemQty
      };
    });

    const topItemsByYearByTypeMap = {};
    topItemByYearTypeRows.forEach(r => {
      if (!topItemsByYearByTypeMap[r.id]) topItemsByYearByTypeMap[r.id] = {};
      if (!topItemsByYearByTypeMap[r.id][String(r.yr)]) topItemsByYearByTypeMap[r.id][String(r.yr)] = {};
      topItemsByYearByTypeMap[r.id][String(r.yr)][r.productType] = {
        topItem: r.topItem,
        topItemQty: r.topItemQty,
        productType: r.productType
      };
    });

    const custMap = {};
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;

    resultRows.forEach(row => {
      if (!custMap[row.id]) {
        custMap[row.id] = {
          id: row.id,
          name: row.name,
          custStatus: row.custStatus,
          salesName: row.salesName,
          data: {},
          monthly: {},
          weekly: {},
          dataQty: {},
          monthlyQty: {},
          weeklyQty: {},
          currentMonthSales: 0,
          topItem: topItemMap[row.id]?.topItem || null,
          topItemQty: topItemMap[row.id]?.topItemQty || 0,
          topItemsByYear: topItemsByYearMap[row.id] || {},
          topItemsByYearByType: topItemsByYearByTypeMap[row.id] || {}
        };
      }

      const yrStr = row.yr.toString();
      const mthStr = row.mth.toString();

      if (!custMap[row.id].data[yrStr]) {
        custMap[row.id].data[yrStr] = 0;
      }
      custMap[row.id].data[yrStr] += row.totalSales;

      if (!custMap[row.id].monthly[yrStr]) {
        custMap[row.id].monthly[yrStr] = {};
      }
      if (!custMap[row.id].monthly[yrStr][mthStr]) {
        custMap[row.id].monthly[yrStr][mthStr] = 0;
      }
      custMap[row.id].monthly[yrStr][mthStr] += row.totalSales;

      if (!custMap[row.id].dataQty[yrStr]) {
        custMap[row.id].dataQty[yrStr] = 0;
      }
      custMap[row.id].dataQty[yrStr] += row.totalQty;

      if (!custMap[row.id].monthlyQty[yrStr]) {
        custMap[row.id].monthlyQty[yrStr] = {};
      }
      if (!custMap[row.id].monthlyQty[yrStr][mthStr]) {
        custMap[row.id].monthlyQty[yrStr][mthStr] = 0;
      }
      custMap[row.id].monthlyQty[yrStr][mthStr] += row.totalQty;

      // Weekly Data
      const wkStr = row.wk ? row.wk.toString() : 'Unknown';
      if (!custMap[row.id].weekly[yrStr]) custMap[row.id].weekly[yrStr] = {};
      if (!custMap[row.id].weekly[yrStr][wkStr]) custMap[row.id].weekly[yrStr][wkStr] = 0;
      custMap[row.id].weekly[yrStr][wkStr] += row.totalSales;

      if (!custMap[row.id].weeklyQty[yrStr]) custMap[row.id].weeklyQty[yrStr] = {};
      if (!custMap[row.id].weeklyQty[yrStr][wkStr]) custMap[row.id].weeklyQty[yrStr][wkStr] = 0;
      custMap[row.id].weeklyQty[yrStr][wkStr] += row.totalQty;

      if (row.yr === curYear && row.mth === curMonth) {
        custMap[row.id].currentMonthSales += row.totalSales;
      }
    });

    // เรียงลำดับ: ยอดเดือนปัจจุบันมากสุดก่อน → ถ้าเท่ากันดูยอดปีรวม
    const curYearStr = curYear.toString();
    const data = Object.values(custMap).sort((a, b) => {
      if (b.currentMonthSales !== a.currentMonthSales) {
        return (b.currentMonthSales || 0) - (a.currentMonthSales || 0);
      }
      return (b.data[curYearStr] || 0) - (a.data[curYearStr] || 0);
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/customer-summary:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
