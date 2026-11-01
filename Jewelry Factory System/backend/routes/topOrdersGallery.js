// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Top Item by Customer Gallery (routes/topOrdersGallery.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Fetches the top selling items per customer per year for visual gallery display.
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const { buildDateRangeCondition } = require('../utils/dateFilters');

/*
 * =============================================================================
 * ITEM YEARLY SUMMARY ROUTES OVERVIEW
 * =============================================================================
 * Route                                  | Page/Menu        | Description
 * -------------------------------------- | ---------------- | ------------------------
 * GET /api/items/yearly-summary         | Top Orders       | Batch customer+item comparison
 * GET /api/items/:styleNo/yearly-summary | Item Detail      | Single item yearly trend
 *
 * Filter policy:
 * - years controls the comparison period; months follows the Top Orders period filter.
 * - pairs mode is for visible Top Orders customer+item rows only.
 * - Item values come from OrdHD + OrdDT line data.
 * =============================================================================
 */

const ORDER_BLOCKLIST = "SUBSTRING(h.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')";

function parseYears(value) {
  const years = String(value || '')
    .split(',')
    .map(v => parseInt(v, 10))
    .filter(v => !Number.isNaN(v));

  const unique = Array.from(new Set(years)).sort((a, b) => a - b);
  if (unique.length > 0) return unique;

  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear];
}

function parseMonths(value) {
  return Array.from(new Set(
    String(value || '')
      .split(',')
      .map(v => parseInt(v, 10))
      .filter(v => !Number.isNaN(v) && v >= 1 && v <= 12),
  )).sort((a, b) => a - b);
}

function parseStyles(value) {
  return Array.from(new Set(
    String(value || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean),
  ));
}

function normalizeStyle(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeCustomer(value) {
  return String(value || '').trim().toUpperCase();
}

function pairKey(customerCode, styleNo) {
  return `${normalizeCustomer(customerCode)}|${normalizeStyle(styleNo)}`;
}

function parsePairs(value) {
  const unique = new Map();
  String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .forEach(raw => {
      const parts = raw.split('|');
      if (parts.length < 2) return;
      const customerCode = normalizeCustomer(parts[0]);
      const styleNo = normalizeStyle(parts.slice(1).join('|'));
      if (!customerCode || !styleNo) return;
      unique.set(pairKey(customerCode, styleNo), { customerCode, styleNo });
    });
  return Array.from(unique.values());
}

function addIntParams(request, prefix, values) {
  values.forEach((value, index) => request.input(`${prefix}${index}`, sql.Int, value));
  return values.map((_, index) => `@${prefix}${index}`).join(',');
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function pctChange(current, previous) {
  const cur = safeNumber(current);
  const prev = safeNumber(previous);
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

function totals(rows) {
  return rows.reduce(
    (acc, row) => ({
      qty: acc.qty + safeNumber(row.hasData ? row.qty : 0),
      value: acc.value + safeNumber(row.hasData ? row.value : 0),
      orderCount: acc.orderCount + safeNumber(row.hasData ? row.orderCount : 0),
      lineCount: acc.lineCount + safeNumber(row.hasData ? row.lineCount : 0),
    }),
    { qty: 0, value: 0, orderCount: 0, lineCount: 0 },
  );
}

function mapYearlyRows(years, recordset) {
  const byYear = new Map(recordset.map(row => [Number(row.year), row]));

  const rows = years.map(year => {
    const raw = byYear.get(year);
    return {
      year,
      qty: safeNumber(raw?.qty),
      value: safeNumber(raw?.value),
      orderCount: safeNumber(raw?.orderCount),
      lineCount: safeNumber(raw?.lineCount),
      hasData: !!raw,
      status: raw ? 'base' : 'no_data',
      yoyQtyPct: null,
      yoyValuePct: null,
    };
  });

  rows.forEach((row, index) => {
    if (!row.hasData) {
      row.status = 'no_data';
      return;
    }

    const previous = rows[index - 1];
    if (!previous) {
      row.status = 'base';
      return;
    }

    if (!previous.hasData) {
      row.status = 'new';
      return;
    }

    row.status = 'ok';
    row.yoyQtyPct = pctChange(row.qty, previous.qty);
    row.yoyValuePct = pctChange(row.value, previous.value);
  });

  return rows;
}

// Batch yearly summary for Top Orders compare mode.
router.get('/yearly-summary', async (req, res) => {
  try {
    const years = parseYears(req.query.years);
    const months = parseMonths(req.query.months);
    const pairs = parsePairs(req.query.pairs).slice(0, 300);

    // Pair mode compares specific customer+item rows shown in Top Orders.
    if (pairs.length > 0) {
      const pool = await getPool();
      const request = pool.request();
      const pairClauses = pairs.map((pair, index) => {
        request.input(`cust${index}`, sql.NVarChar, pair.customerCode);
        request.input(`pairStyle${index}`, sql.NVarChar, pair.styleNo);
        return `(UPPER(LTRIM(RTRIM(ISNULL(h.CustCode, '')))) = @cust${index} AND (UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))) = @pairStyle${index} OR UPPER(LTRIM(RTRIM(ISNULL(LEFT(d.ItemNo, 8), '')))) = @pairStyle${index}))`;
      }).join(' OR ');
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      const wStart = req.query.wStart ? parseInt(req.query.wStart, 10) : null;
      const wEnd = req.query.wEnd ? parseInt(req.query.wEnd, 10) : null;
      const dateClause = buildDateRangeCondition('h.OrdDate', years, months, startDate, endDate, wStart, wEnd);

      const result = await request.query(`
        SELECT
          UPPER(LTRIM(RTRIM(ISNULL(h.CustCode, '')))) AS customerCode,
          UPPER(LTRIM(RTRIM(ISNULL(LEFT(d.ItemNo, 8), '')))) AS styleNo,
          YEAR(h.OrdDate) AS [year],
          SUM(ISNULL(d.ItemQty, 0)) AS qty,
          SUM(ISNULL(ISNULL(d.ItemExchAmnt, d.ItemAmnt), 0)) AS value,
          COUNT(DISTINCT h.OrdNo) AS orderCount,
          COUNT(*) AS lineCount
        FROM OrdHD h
        INNER JOIN OrdDT d ON d.OrdNo = h.OrdNo
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        WHERE (${pairClauses})
          AND h.OrdDate IS NOT NULL
          AND ${dateClause}
          AND ${ORDER_BLOCKLIST}
          AND (h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%')
          AND ISNULL(c.CustStatus, 'Y') = 'Y'
        GROUP BY UPPER(LTRIM(RTRIM(ISNULL(h.CustCode, '')))), UPPER(LTRIM(RTRIM(ISNULL(LEFT(d.ItemNo, 8), '')))), YEAR(h.OrdDate)
        ORDER BY UPPER(LTRIM(RTRIM(ISNULL(h.CustCode, '')))), UPPER(LTRIM(RTRIM(ISNULL(LEFT(d.ItemNo, 8), '')))), YEAR(h.OrdDate)
      `);

      const recordsByPair = new Map();
      result.recordset.forEach(row => {
        const key = pairKey(row.customerCode, row.styleNo);
        if (!recordsByPair.has(key)) recordsByPair.set(key, []);
        recordsByPair.get(key).push(row);
      });

      const data = pairs.map(pair => {
        const key = pairKey(pair.customerCode, pair.styleNo);
        const yearlyRows = mapYearlyRows(years, recordsByPair.get(key) || []);
        return {
          customerCode: pair.customerCode,
          normalizedCustomerCode: pair.customerCode,
          styleNo: pair.styleNo,
          normalizedStyleNo: pair.styleNo,
          combined: totals(yearlyRows),
          data: yearlyRows,
        };
      });

      return res.json({ ok: true, years, data });
    }

    const styles = parseStyles(req.query.styles).slice(0, 300);
    if (styles.length === 0) {
      return res.status(400).json({ ok: false, error: 'At least one Style No. is required' });
    }

    const pool = await getPool();
    const request = pool.request();
    const styleParams = styles.map((styleNo, index) => {
      request.input(`style${index}`, sql.NVarChar, normalizeStyle(styleNo));
      return `@style${index}`;
    }).join(',');
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const wStart = req.query.wStart ? parseInt(req.query.wStart, 10) : null;
    const wEnd = req.query.wEnd ? parseInt(req.query.wEnd, 10) : null;
    const dateClause = buildDateRangeCondition('h.OrdDate', years, months, startDate, endDate, wStart, wEnd);

    const result = await request.query(`
      SELECT
        UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))) AS styleNo,
        YEAR(h.OrdDate) AS [year],
        SUM(ISNULL(d.ItemQty, 0)) AS qty,
        SUM(ISNULL(ISNULL(d.ItemExchAmnt, d.ItemAmnt), 0)) AS value,
        COUNT(DISTINCT h.OrdNo) AS orderCount,
        COUNT(*) AS lineCount
      FROM OrdHD h
      INNER JOIN OrdDT d ON d.OrdNo = h.OrdNo
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      WHERE (UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))) IN (${styleParams}) OR UPPER(LTRIM(RTRIM(ISNULL(LEFT(d.ItemNo, 8), '')))) IN (${styleParams}))
        AND h.OrdDate IS NOT NULL
        AND ${dateClause}
        AND ${ORDER_BLOCKLIST}
        AND (h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%')
        AND ISNULL(c.CustStatus, 'Y') = 'Y'
      GROUP BY UPPER(LTRIM(RTRIM(ISNULL(LEFT(d.ItemNo, 8), '')))), YEAR(h.OrdDate)
      ORDER BY UPPER(LTRIM(RTRIM(ISNULL(LEFT(d.ItemNo, 8), '')))), YEAR(h.OrdDate)
    `);

    const recordsByStyle = new Map();
    result.recordset.forEach(row => {
      const key = normalizeStyle(row.styleNo);
      if (!recordsByStyle.has(key)) recordsByStyle.set(key, []);
      recordsByStyle.get(key).push(row);
    });

    const data = styles.map(styleNo => {
      const normalizedStyleNo = normalizeStyle(styleNo);
      const yearlyRows = mapYearlyRows(years, recordsByStyle.get(normalizedStyleNo) || []);
      return {
        styleNo,
        normalizedStyleNo,
        combined: totals(yearlyRows),
        data: yearlyRows,
      };
    });

    res.json({ ok: true, years, data });
  } catch (err) {
    console.error('[API ERROR] /api/items/yearly-summary:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});
// Single item yearly summary detail endpoint.
router.get('/:styleNo/yearly-summary', async (req, res) => {
  try {
    const styleNo = String(req.params.styleNo || '').trim();
    if (!styleNo) {
      return res.status(400).json({ ok: false, error: 'Style No. is required' });
    }

    const years = parseYears(req.query.years);
    const months = parseMonths(req.query.months);
    const pool = await getPool();
    const request = pool.request();
    request.input('styleNo', sql.NVarChar, styleNo);
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const wStart = req.query.wStart ? parseInt(req.query.wStart, 10) : null;
    const wEnd = req.query.wEnd ? parseInt(req.query.wEnd, 10) : null;
    const dateClause = buildDateRangeCondition('h.OrdDate', years, months, startDate, endDate, wStart, wEnd);

    const result = await request.query(`
      SELECT
        YEAR(h.OrdDate) AS [year],
        SUM(ISNULL(d.ItemQty, 0)) AS qty,
        SUM(ISNULL(ISNULL(d.ItemExchAmnt, d.ItemAmnt), 0)) AS value,
        COUNT(DISTINCT h.OrdNo) AS orderCount,
        COUNT(*) AS lineCount
      FROM OrdHD h
      INNER JOIN OrdDT d ON d.OrdNo = h.OrdNo
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      WHERE (UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))) = UPPER(@styleNo) OR UPPER(LTRIM(RTRIM(ISNULL(LEFT(d.ItemNo, 8), '')))) = UPPER(@styleNo))
        AND h.OrdDate IS NOT NULL
        AND ${dateClause}
        AND ${ORDER_BLOCKLIST}
        AND (h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%')
        AND ISNULL(c.CustStatus, 'Y') = 'Y'
      GROUP BY YEAR(h.OrdDate)
      ORDER BY YEAR(h.OrdDate)
    `);

    const data = mapYearlyRows(years, result.recordset);
    res.json({
      ok: true,
      styleNo,
      years,
      combined: totals(data),
      data,
    });
  } catch (err) {
    console.error('[API ERROR] /api/items/:styleNo/yearly-summary:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// [TOP ITEM GALLERY] GET /api/items/top-gallery
// Queries VW_Web_SalesDashboard for item-centric ranking, multi-year comparison,
// product type classification, % share of portfolio,
// and monthly/weekly breakdowns.
// ═══════════════════════════════════════════════════════════════════════════════
const CUSTOMER_GROUP_PREFIXES = {
  N008: ['N008', 'N048', 'N065', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'],
  N044: ['N044'],
  N098: ['N098'],
  N051: ['N051'],
  N083: ['N083', 'N086', 'N087', 'N088', 'N089'],
  MLT: ['U411', 'U412', 'U413', 'U414', 'U415', 'U416', 'U417', 'U418', 'U419', 'U420', 'U421', 'U422', 'U423', 'U424', 'U425', 'U426'],
};

const GROUP_LABELS = {
  N008: 'N008 Group',
  N044: 'N044 Group',
  N098: 'N098 Group',
  N051: 'N051 Group',
  N083: 'N083 Group',
  MLT: 'MLT Group',
  General: 'General',
};

function getCustomerGroupId(custCode) {
  const code = String(custCode || '').toUpperCase().trim();
  for (const [groupId, prefixes] of Object.entries(CUSTOMER_GROUP_PREFIXES)) {
    if (prefixes.some(prefix => code.startsWith(prefix))) {
      return groupId;
    }
  }
  return 'General';
}

function classifyProductType(itemNo) {
  const prefix3 = String(itemNo || '').toUpperCase().trim().substring(0, 3);
  if (prefix3 === 'BBS') return 'BBS';
  if (prefix3 === 'BES') return 'BES';
  if (prefix3 === 'BNS') return 'BNS';
  if (prefix3 === 'BRS') return 'BRS';
  if (prefix3 === 'BPD') return 'BPD';
  if (prefix3 === 'BCH') return 'BCH';
  return 'OTH';
}

function getProductTypeLabel(typeKey) {
  switch (typeKey) {
    case 'BBS': return 'Bracelet & Bangle';
    case 'BANGLE': return 'Bangle';
    case 'NON_BANGLE': return 'Bracelet (Soft)';
    case 'BES': return 'Earring';
    case 'BNS': return 'Necklace';
    case 'BRS': return 'Ring';
    case 'BPD': return 'Pendant';
    case 'BCH': return 'Charm';
    default: return 'Others';
  }
}

// [SALESPERSONS LIST] GET /api/items/salespersons
let cachedSalespersons = null;
let cachedSalespersonsTime = 0;
const SALESPERSON_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

router.get('/salespersons', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedSalespersons && (now - cachedSalespersonsTime < SALESPERSON_CACHE_TTL)) {
      return res.json({ ok: true, salespersons: cachedSalespersons });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT LTRIM(RTRIM(SalesName)) AS salesName
      FROM VW_Web_SalesDashboard
      WHERE SalesName IS NOT NULL AND LTRIM(RTRIM(SalesName)) <> ''
      ORDER BY salesName ASC
    `);

    const salespersons = (result.recordset || [])
      .map(r => r.salesName)
      .filter(Boolean);

    cachedSalespersons = salespersons;
    cachedSalespersonsTime = now;

    res.json({ ok: true, salespersons });
  } catch (err) {
    console.error('[API ERROR] /api/items/salespersons:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to fetch salespersons list' });
  }
});

router.get('/top-gallery', async (req, res) => {
  try {
    const years = parseYears(req.query.years);
    const months = parseMonths(req.query.months);
    const baseYear = req.query.baseYear ? parseInt(req.query.baseYear, 10) : years[years.length - 1];
    const compareYear = req.query.compareYear ? parseInt(req.query.compareYear, 10) : (years.length > 1 ? years[0] : null);
    const groupFilter = req.query.groups ? String(req.query.groups).split(',').map(g => g.trim()).filter(Boolean) : [];
    const productTypeFilter = req.query.productType
      ? String(req.query.productType).toUpperCase().split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const metric = String(req.query.metric || 'qty').toLowerCase() === 'amount' ? 'amount' : 'qty';
    const rankBy = String(req.query.rankBy || 'combined').toLowerCase().trim(); // 'combined' | 'base' | 'growth'
    const searchQuery = String(req.query.search || '').toUpperCase().trim();
    const limit = parseInt(req.query.limit || '50', 10);
    // Default date field is DueDate (per user requirement)
    const dateField = req.query.dateField === 'ordDate' ? 'OrdDate' : 'DueDate';

    const pool = await getPool();
    const request = pool.request();

    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const wStart = req.query.wStart ? parseInt(req.query.wStart, 10) : null;
    const wEnd = req.query.wEnd ? parseInt(req.query.wEnd, 10) : null;
    const dateClause = buildDateRangeCondition(dateField, years, months, startDate, endDate, wStart, wEnd);

    const salesNameFilter = String(req.query.salesName || '').trim();
    let salesCondition = '';
    if (salesNameFilter && salesNameFilter.toUpperCase() !== 'ALL') {
      request.input('salesName', sql.NVarChar, salesNameFilter);
      salesCondition = ' AND LTRIM(RTRIM(ISNULL(SalesName, \'\'))) = @salesName';
    }

    const query = `
      SELECT 
        UPPER(LTRIM(RTRIM(ISNULL(LEFT(ItemNo, 8), '')))) AS ItemNo,
        MAX(ISNULL(ItemDesc, '')) AS ItemDesc,
        MAX(ISNULL(ItemType, '')) AS ItemType,
        UPPER(LTRIM(RTRIM(ISNULL(CustCode, '')))) AS CustCode,
        YEAR(${dateField}) AS OrdYear,
        MONTH(${dateField}) AS OrdMonth,
        SUM(ISNULL(ItemQty, 0)) AS TotalQty,
        SUM(ISNULL(ItemAmnt, 0)) AS TotalAmnt
      FROM VW_Web_SalesDashboard
      WHERE ${dateClause}
        AND ItemNo IS NOT NULL AND LTRIM(RTRIM(ItemNo)) <> ''
        ${salesCondition}
      GROUP BY 
        UPPER(LTRIM(RTRIM(ISNULL(LEFT(ItemNo, 8), '')))),
        UPPER(LTRIM(RTRIM(ISNULL(CustCode, '')))),
        YEAR(${dateField}),
        MONTH(${dateField})
    `;

    const result = await request.query(query);
    const rows = result.recordset || [];

    // Grouping & Aggregation Engine
    const itemsMap = new Map();
    let portfolioGrandQty = 0;
    let portfolioGrandAmnt = 0;
    let baseYearGrandQty = 0;
    let baseYearGrandAmnt = 0;
    let compareYearGrandQty = 0;
    let compareYearGrandAmnt = 0;

    for (const r of rows) {
      const itemNo = r.ItemNo;
      const custCode = r.CustCode;
      const groupId = getCustomerGroupId(custCode);

      // Apply customer group filter if provided and not empty
      if (groupFilter.length > 0 && !groupFilter.includes('all') && !groupFilter.includes(groupId)) {
        continue;
      }

      const rawProductType = classifyProductType(itemNo);
      const prefix3 = itemNo.substring(0, 3);

      // Apply product type filter
      if (productTypeFilter.length > 0 && !productTypeFilter.includes('ALL')) {
        if (!productTypeFilter.includes(rawProductType)) continue;
      }

      const yr = Number(r.OrdYear);
      const mth = Number(r.OrdMonth);
      const wk = Number(r.OrdWeek);
      const qty = Number(r.TotalQty) || 0;
      const amnt = Number(r.TotalAmnt) || 0;

      portfolioGrandQty += qty;
      portfolioGrandAmnt += amnt;
      if (yr === baseYear) {
        baseYearGrandQty += qty;
        baseYearGrandAmnt += amnt;
      }
      if (compareYear && yr === compareYear) {
        compareYearGrandQty += qty;
        compareYearGrandAmnt += amnt;
      }

      if (!itemsMap.has(itemNo)) {
        itemsMap.set(itemNo, {
          itemNo,
          itemDesc: r.ItemDesc,
          productType: rawProductType,
          productCategory: prefix3,
          productTypeLabel: getProductTypeLabel(rawProductType),
          totalCombinedQty: 0,
          totalCombinedAmnt: 0,
          baseYearQty: 0,
          baseYearAmnt: 0,
          compareYearQty: 0,
          compareYearAmnt: 0,
          yearlyTotals: {},
          monthlyBreakdown: {},
          weeklyBreakdown: {},
          customerMap: new Map(),
        });
      }

      const it = itemsMap.get(itemNo);
      it.totalCombinedQty += qty;
      it.totalCombinedAmnt += amnt;

      if (yr === baseYear) {
        it.baseYearQty += qty;
        it.baseYearAmnt += amnt;
      }
      if (compareYear && yr === compareYear) {
        it.compareYearQty += qty;
        it.compareYearAmnt += amnt;
      }

      // Yearly Totals
      const yrKey = String(yr);
      if (!it.yearlyTotals[yrKey]) it.yearlyTotals[yrKey] = { qty: 0, amount: 0 };
      it.yearlyTotals[yrKey].qty += qty;
      it.yearlyTotals[yrKey].amount += amnt;

      // Monthly Breakdown
      if (!it.monthlyBreakdown[yrKey]) it.monthlyBreakdown[yrKey] = {};
      const mthKey = String(mth);
      it.monthlyBreakdown[yrKey][mthKey] = (it.monthlyBreakdown[yrKey][mthKey] || 0) + qty;

      // Weekly Breakdown
      if (!it.weeklyBreakdown[yrKey]) it.weeklyBreakdown[yrKey] = {};
      const wkKey = String(wk);
      it.weeklyBreakdown[yrKey][wkKey] = (it.weeklyBreakdown[yrKey][wkKey] || 0) + qty;

      // Customer map
      if (!it.customerMap.has(custCode)) {
        it.customerMap.set(custCode, {
          custCode,
          groupId,
          groupLabel: GROUP_LABELS[groupId] || groupId,
          qty: 0,
          amount: 0,
          baseYearQty: 0,
          baseYearAmnt: 0,
          compareYearQty: 0,
          compareYearAmnt: 0,
        });
      }
      const cEntry = it.customerMap.get(custCode);
      cEntry.qty += qty;
      cEntry.amount += amnt;
      if (yr === baseYear) {
        cEntry.baseYearQty += qty;
        cEntry.baseYearAmnt += amnt;
      }
      if (compareYear && yr === compareYear) {
        cEntry.compareYearQty += qty;
        cEntry.compareYearAmnt += amnt;
      }
    }

    // Convert map to list and compute significance + rankings
    let itemsList = Array.from(itemsMap.values()).map(it => {
      // Find primary customer / group based on perspective
      const isBaseRanking = rankBy === 'base';
      const custList = Array.from(it.customerMap.values()).sort((a, b) => {
        if (isBaseRanking) {
          const valA = metric === 'amount' ? a.baseYearAmnt : a.baseYearQty;
          const valB = metric === 'amount' ? b.baseYearAmnt : b.baseYearQty;
          if (valB !== valA) return valB - valA;
        }
        return metric === 'amount' ? b.amount - a.amount : b.qty - a.qty;
      });
      const primary = custList[0] || { custCode: 'N/A', groupId: 'General', groupLabel: 'General' };

      const diff = it.baseYearQty - it.compareYearQty;
      const yoyGrowthPct = it.compareYearQty > 0 ? ((it.baseYearQty - it.compareYearQty) / it.compareYearQty) * 100 : null;

      const shareOfPortfolioQtyPct = portfolioGrandQty > 0 ? (it.totalCombinedQty / portfolioGrandQty) * 100 : 0;
      const shareOfPortfolioAmntPct = portfolioGrandAmnt > 0 ? (it.totalCombinedAmnt / portfolioGrandAmnt) * 100 : 0;

      const baseYearShareOfPortfolioQtyPct = baseYearGrandQty > 0 ? (it.baseYearQty / baseYearGrandQty) * 100 : 0;
      const baseYearShareOfPortfolioAmntPct = baseYearGrandAmnt > 0 ? (it.baseYearAmnt / baseYearGrandAmnt) * 100 : 0;

      return {
        itemNo: it.itemNo,
        itemDesc: it.itemDesc,
        productType: it.productType,
        productCategory: it.productCategory,
        productTypeLabel: it.productTypeLabel,
        primaryCustCode: primary.custCode,
        primaryGroupId: primary.groupId,
        primaryGroupLabel: primary.groupLabel,
        customersCount: custList.length,
        totalCombinedQty: it.totalCombinedQty,
        totalCombinedAmnt: it.totalCombinedAmnt,
        baseYearQty: it.baseYearQty,
        baseYearAmnt: it.baseYearAmnt,
        compareYearQty: it.compareYearQty,
        compareYearAmnt: it.compareYearAmnt,
        qtyDiff: diff,
        yoyGrowthPct,
        shareOfPortfolioQtyPct: Number(shareOfPortfolioQtyPct.toFixed(2)),
        shareOfPortfolioAmntPct: Number(shareOfPortfolioAmntPct.toFixed(2)),
        baseYearShareOfPortfolioQtyPct: Number(baseYearShareOfPortfolioQtyPct.toFixed(2)),
        baseYearShareOfPortfolioAmntPct: Number(baseYearShareOfPortfolioAmntPct.toFixed(2)),
        yearlyTotals: it.yearlyTotals,
        monthlyBreakdown: it.monthlyBreakdown,
        weeklyBreakdown: it.weeklyBreakdown,
        customerBreakdown: custList.slice(0, 10),
        sortScore: (() => {
          if (rankBy === 'base') return metric === 'amount' ? it.baseYearAmnt : it.baseYearQty;
          if (rankBy === 'growth') return diff;
          return metric === 'amount' ? it.totalCombinedAmnt : it.totalCombinedQty; // 'combined' default
        })(),
      };
    });

    // Apply text search if query provided
    if (searchQuery) {
      itemsList = itemsList.filter(it =>
        it.itemNo.includes(searchQuery) ||
        it.primaryCustCode.includes(searchQuery) ||
        it.primaryGroupLabel.toUpperCase().includes(searchQuery) ||
        it.itemDesc.toUpperCase().includes(searchQuery)
      );
    }

    // Sort by sortScore descending
    itemsList.sort((a, b) => b.sortScore - a.sortScore);

    // Assign final Ranks
    const rankedItems = itemsList.slice(0, limit).map((it, idx) => ({
      rank: idx + 1,
      ...it,
    }));

    const summaryTotalQty = searchQuery ? itemsList.reduce((s, it) => s + it.totalCombinedQty, 0) : portfolioGrandQty;
    const summaryTotalAmnt = searchQuery ? itemsList.reduce((s, it) => s + it.totalCombinedAmnt, 0) : portfolioGrandAmnt;
    const summaryBaseQty = searchQuery ? itemsList.reduce((s, it) => s + it.baseYearQty, 0) : baseYearGrandQty;
    const summaryBaseAmnt = searchQuery ? itemsList.reduce((s, it) => s + it.baseYearAmnt, 0) : baseYearGrandAmnt;
    const summaryCompQty = searchQuery ? itemsList.reduce((s, it) => s + it.compareYearQty, 0) : compareYearGrandQty;
    const summaryCompAmnt = searchQuery ? itemsList.reduce((s, it) => s + it.compareYearAmnt, 0) : compareYearGrandAmnt;

    res.json({
      ok: true,
      years,
      baseYear,
      compareYear,
      summary: {
        totalItemsCount: itemsList.length,
        portfolioTotalQty: summaryTotalQty,
        portfolioTotalAmnt: summaryTotalAmnt,
        baseYearTotalQty: summaryBaseQty,
        baseYearTotalAmnt: summaryBaseAmnt,
        compareYearTotalQty: summaryCompQty,
        compareYearTotalAmnt: summaryCompAmnt,
      },
      items: rankedItems,
    });
  } catch (err) {
    console.error('[API ERROR] /api/items/top-gallery:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

