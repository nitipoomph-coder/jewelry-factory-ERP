/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                   PRODUCTION SUMMARY ROUTES                                  ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Route                                  │ Page / Menu                        ║
 * ╟─────────────────────────────────────────┼────────────────────────────────────╢
 * ║  GET /api/production-summary/year       │ Production Summary (Year view)     ║
 * ║  GET /api/production-summary/week       │ Production Summary (Week view)     ║
 * ║  GET /api/production-summary/month      │ Production Summary (Month view)    ║
 * ║  GET /api/production-summary/holidays   │ Company holidays for working days  ║
 * ║  GET /api/production-summary/max-week   │ Max week number for a year         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Data Source: Production department send/receive tables (11 depts × 2 sides)
 * Filter: ProFac = 'FBE', CustCode IN N008-group / N098 / N051
 */

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// ─── Allowlisted step codes (prevent SQL injection via dynamic table names) ──
const VALID_STEPS = ['GR', 'TB', 'AS', 'LS', 'FL', 'LP', 'EP', 'PL', 'CP', 'IQ', 'PT'];

// ─── Customer codes for the 3 groups ─────────────────────────────────────────
const N008_CODES = ['N008', 'N044', 'N048', 'N064', 'N065', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'];
const N098_CODES = ['N098'];
const N051_CODES = ['N051'];
const ALL_CUST_CODES = [...N008_CODES, ...N098_CODES, ...N051_CODES];

// Build a SQL IN clause string for customer codes (safe — no user input)
const CUST_IN_CLAUSE = ALL_CUST_CODES.map(c => `'${c}'`).join(',');

/** Map a CustCode to its group id */
function custGroup(code) {
  if (!code) return null;
  if (N008_CODES.includes(code)) return 'N008';
  if (N098_CODES.includes(code)) return 'N098';
  if (N051_CODES.includes(code)) return 'N051';
  return null;
}

/** Validate & return step code */
function validateStep(step) {
  const s = (step || '').toUpperCase();
  if (!VALID_STEPS.includes(s)) return null;
  return s;
}

/** Build table names from step + mode */
function getTableNames(step, mode) {
  // Receive mode uses RecHD/RecDT; others use SenHD/SenDT
  const side = mode === 'receive' ? 'Rec' : 'Sen';
  const hdTable = `${step}${side}HD`;
  const dtTable = `${step}${side}DT`;
  const idCol = `${step}${side}ID`;
  const qtyCol = mode === 'receive' ? 'RecQty' : 'SenQty';
  return { hdTable, dtTable, idCol, qtyCol };
}

/** Build optional BBS filter clause */
function getBBSFilter(mode) {
  if (mode === 'bbs') return `AND dt.ItemNo LIKE 'BBS%'`;
  if (mode === 'nonbbs') return `AND (dt.ItemNo NOT LIKE 'BBS%' OR dt.ItemNo IS NULL)`;
  return '';
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /year — Yearly production summary (12 months)
// ═════════════════════════════════════════════════════════════════════════════
router.get('/year', async (req, res) => {
  try {
    const step = validateStep(req.query.step);
    if (!step) return res.status(400).json({ ok: false, error: 'Invalid step code' });

    const mode = (req.query.mode || 'good').toLowerCase();
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const { hdTable, dtTable, idCol, qtyCol } = getTableNames(step, mode);
    const bbsFilter = getBBSFilter(mode);

    const pool = await getPool();
    const result = await pool.request()
      .input('yearStart', sql.DateTime, new Date(year, 0, 1))
      .input('yearEnd', sql.DateTime, new Date(year + 1, 0, 1))
      .query(`
        SELECT
          MONTH(hd.DocuDate) AS M,
          oh.CustCode,
          SUM(ISNULL(dt.${qtyCol}, 0)) AS Q
        FROM ${hdTable} hd
          INNER JOIN ${dtTable} dt ON dt.${idCol} = hd.${idCol}
          LEFT OUTER JOIN OrdHD oh ON oh.OrdNo = dt.OrdNo
        WHERE hd.DocuDate >= @yearStart AND hd.DocuDate < @yearEnd
          AND hd.ProFac = 'FBE'
          AND oh.CustCode IN (${CUST_IN_CLAUSE})
          ${bbsFilter}
        GROUP BY MONTH(hd.DocuDate), oh.CustCode
      `);

    // Aggregate into { month, n008, n098, n051 }
    const monthMap = {};
    for (let m = 1; m <= 12; m++) {
      monthMap[m] = { month: m, N008: 0, N098: 0, N051: 0 };
    }
    for (const row of result.recordset) {
      const grp = custGroup(row.CustCode);
      if (grp && monthMap[row.M]) {
        monthMap[row.M][grp] += row.Q;
      }
    }

    res.json({ ok: true, data: Object.values(monthMap) });
  } catch (err) {
    console.error('[ProductionSummary/Year]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /week — Weekly production summary
// ═════════════════════════════════════════════════════════════════════════════
router.get('/week', async (req, res) => {
  try {
    const step = validateStep(req.query.step);
    if (!step) return res.status(400).json({ ok: false, error: 'Invalid step code' });

    const mode = (req.query.mode || 'good').toLowerCase();
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const fromWeek = parseInt(req.query.fromWeek) || 1;
    const toWeek = parseInt(req.query.toWeek) || fromWeek;

    if (toWeek - fromWeek + 1 > 24) {
      return res.status(400).json({ ok: false, error: 'Max 24 weeks allowed' });
    }

    const { hdTable, dtTable, idCol, qtyCol } = getTableNames(step, mode);
    const bbsFilter = getBBSFilter(mode);

    const pool = await getPool();

    // Step 1: Get week → date mapping from OrdWeekPlanHD
    const weekPlanResult = await pool.request()
      .input('planYear', sql.Int, year)
      .input('fromWeek', sql.Int, fromWeek)
      .input('toWeek', sql.Int, toWeek)
      .query(`
        SELECT PlanWeek, CONVERT(date, PlanDate) AS PlanDate
        FROM OrdWeekPlanHD
        WHERE PlanYear = @planYear
          AND PlanWeek >= @fromWeek AND PlanWeek <= @toWeek
        ORDER BY PlanDate
      `);

    // Build date → week mapping (Mon-Fri from table + add Saturday)
    const dateToWeek = {};
    const weekDates = {};  // week → { minDate, maxDate }
    for (const row of weekPlanResult.recordset) {
      const d = new Date(row.PlanDate);
      const dStr = d.toISOString().slice(0, 10);
      dateToWeek[dStr] = row.PlanWeek;

      if (!weekDates[row.PlanWeek]) {
        weekDates[row.PlanWeek] = { min: dStr, max: dStr };
      } else {
        if (dStr < weekDates[row.PlanWeek].min) weekDates[row.PlanWeek].min = dStr;
        if (dStr > weekDates[row.PlanWeek].max) weekDates[row.PlanWeek].max = dStr;
      }

      // Add Saturday (day after Friday = +1)
      if (d.getDay() === 5) { // Friday
        const sat = new Date(d);
        sat.setDate(sat.getDate() + 1);
        const satStr = sat.toISOString().slice(0, 10);
        dateToWeek[satStr] = row.PlanWeek;
        weekDates[row.PlanWeek].max = satStr;
      }
    }

    // Determine date range for query
    let dateFrom, dateTo;
    const allDates = Object.keys(dateToWeek).sort();
    if (allDates.length > 0) {
      dateFrom = new Date(allDates[0]);
      dateTo = new Date(allDates[allDates.length - 1]);
      dateTo.setDate(dateTo.getDate() + 1); // exclusive end
    } else {
      // Fallback: use ISO week calculation
      const jan1 = new Date(year, 0, 1);
      const dayOfWeek = jan1.getDay() || 7; // Mon=1..Sun=7
      const firstMonday = new Date(year, 0, 1 + (dayOfWeek <= 1 ? 0 : 8 - dayOfWeek));
      dateFrom = new Date(firstMonday);
      dateFrom.setDate(dateFrom.getDate() + (fromWeek - 1) * 7);
      dateTo = new Date(firstMonday);
      dateTo.setDate(dateTo.getDate() + toWeek * 7);

      // Build fallback dateToWeek
      for (let w = fromWeek; w <= toWeek; w++) {
        const wStart = new Date(firstMonday);
        wStart.setDate(wStart.getDate() + (w - 1) * 7);
        for (let d = 0; d < 6; d++) { // Mon-Sat
          const dd = new Date(wStart);
          dd.setDate(dd.getDate() + d);
          dateToWeek[dd.toISOString().slice(0, 10)] = w;
        }
      }
    }

    // Step 2: Query production data
    const result = await pool.request()
      .input('dateFrom', sql.DateTime, dateFrom)
      .input('dateTo', sql.DateTime, dateTo)
      .query(`
        SELECT
          CONVERT(date, hd.DocuDate) AS D,
          oh.CustCode,
          SUM(ISNULL(dt.${qtyCol}, 0)) AS Q
        FROM ${hdTable} hd
          INNER JOIN ${dtTable} dt ON dt.${idCol} = hd.${idCol}
          LEFT OUTER JOIN OrdHD oh ON oh.OrdNo = dt.OrdNo
        WHERE hd.DocuDate >= @dateFrom AND hd.DocuDate < @dateTo
          AND hd.ProFac = 'FBE'
          AND oh.CustCode IN (${CUST_IN_CLAUSE})
          ${bbsFilter}
        GROUP BY CONVERT(date, hd.DocuDate), oh.CustCode
      `);

    // Step 3: Aggregate by week
    const weekMap = {};
    for (let w = fromWeek; w <= toWeek; w++) {
      weekMap[w] = { week: w, N008: 0, N098: 0, N051: 0 };
    }

    for (const row of result.recordset) {
      const dStr = new Date(row.D).toISOString().slice(0, 10);
      const week = dateToWeek[dStr];
      if (week && weekMap[week]) {
        const grp = custGroup(row.CustCode);
        if (grp) weekMap[week][grp] += row.Q;
      }
    }

    res.json({
      ok: true,
      data: Object.values(weekMap),
      weekDates,
    });
  } catch (err) {
    console.error('[ProductionSummary/Week]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /month — Daily production summary for a single month
// ═════════════════════════════════════════════════════════════════════════════
router.get('/month', async (req, res) => {
  try {
    const step = validateStep(req.query.step);
    if (!step) return res.status(400).json({ ok: false, error: 'Invalid step code' });

    const mode = (req.query.mode || 'good').toLowerCase();
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

    const { hdTable, dtTable, idCol, qtyCol } = getTableNames(step, mode);
    const bbsFilter = getBBSFilter(mode);

    const pool = await getPool();
    const result = await pool.request()
      .input('dateFrom', sql.DateTime, new Date(year, month - 1, 1))
      .input('dateTo', sql.DateTime, new Date(year, month, 1))
      .query(`
        SELECT
          DAY(hd.DocuDate) AS D,
          oh.CustCode,
          SUM(ISNULL(dt.${qtyCol}, 0)) AS Q
        FROM ${hdTable} hd
          INNER JOIN ${dtTable} dt ON dt.${idCol} = hd.${idCol}
          LEFT OUTER JOIN OrdHD oh ON oh.OrdNo = dt.OrdNo
        WHERE hd.DocuDate >= @dateFrom AND hd.DocuDate < @dateTo
          AND hd.ProFac = 'FBE'
          AND oh.CustCode IN (${CUST_IN_CLAUSE})
          ${bbsFilter}
        GROUP BY DAY(hd.DocuDate), oh.CustCode
      `);

    // Build per-day aggregation
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayMap = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dayMap[d] = { day: d, N008: 0, N098: 0, N051: 0 };
    }
    for (const row of result.recordset) {
      const grp = custGroup(row.CustCode);
      if (grp && dayMap[row.D]) {
        dayMap[row.D][grp] += row.Q;
      }
    }

    res.json({ ok: true, data: Object.values(dayMap), daysInMonth });
  } catch (err) {
    console.error('[ProductionSummary/Month]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /daily — Daily production summary by date range
// ═════════════════════════════════════════════════════════════════════════════
router.get('/daily', async (req, res) => {
  try {
    const step = validateStep(req.query.step);
    if (!step) return res.status(400).json({ ok: false, error: 'Invalid step code' });

    const mode = (req.query.mode || 'good').toLowerCase();
    const startDateStr = req.query.startDate;
    const endDateStr = req.query.endDate;

    if (!startDateStr || !endDateStr) {
      return res.status(400).json({ ok: false, error: 'startDate and endDate are required' });
    }

    const { hdTable, dtTable, idCol, qtyCol } = getTableNames(step, mode);
    const bbsFilter = getBBSFilter(mode);

    // Convert strings to dates, ensuring endDate covers the whole day
    const dateFrom = new Date(startDateStr);
    const dateTo = new Date(endDateStr);
    dateTo.setHours(23, 59, 59, 999);

    const pool = await getPool();
    const result = await pool.request()
      .input('dateFrom', sql.DateTime, dateFrom)
      .input('dateTo', sql.DateTime, dateTo)
      .query(`
        SELECT
          CONVERT(date, hd.DocuDate) AS D,
          oh.CustCode,
          SUM(ISNULL(dt.${qtyCol}, 0)) AS Q
        FROM ${hdTable} hd
          INNER JOIN ${dtTable} dt ON dt.${idCol} = hd.${idCol}
          LEFT OUTER JOIN OrdHD oh ON oh.OrdNo = dt.OrdNo
        WHERE hd.DocuDate >= @dateFrom AND hd.DocuDate <= @dateTo
          AND hd.ProFac = 'FBE'
          AND oh.CustCode IN (${CUST_IN_CLAUSE})
          ${bbsFilter}
        GROUP BY CONVERT(date, hd.DocuDate), oh.CustCode
        ORDER BY D
      `);

    // Grouping by exact date string
    const dateMap = {};

    // Pre-fill map with all dates in range to avoid gaps
    let currentD = new Date(dateFrom);
    const endD = new Date(endDateStr); // use the clean date
    while (currentD <= endD) {
      const dStr = currentD.toISOString().slice(0, 10);
      dateMap[dStr] = { dateStr: dStr, N008: 0, N098: 0, N051: 0 };
      currentD.setDate(currentD.getDate() + 1);
    }

    for (const row of result.recordset) {
      // row.D is a Date object, convert to string YYYY-MM-DD
      const d = new Date(row.D);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // adjust for local time if needed
      const dStr = d.toISOString().slice(0, 10);

      const grp = custGroup(row.CustCode);
      if (grp && dateMap[dStr]) {
        dateMap[dStr][grp] += row.Q;
      }
    }

    res.json({ ok: true, data: Object.values(dateMap) });
  } catch (err) {
    console.error('[ProductionSummary/Daily]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /holidays — Company holidays for a year
// ═════════════════════════════════════════════════════════════════════════════
router.get('/holidays', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const pool = await getPool();
    const result = await pool.request()
      .input('yearStart', sql.DateTime, new Date(year, 0, 1))
      .input('yearEnd', sql.DateTime, new Date(year + 1, 0, 1))
      .query(`
        SELECT CONVERT(date, HolDate) AS HolDate
        FROM GMHoliday
        WHERE HolDate >= @yearStart AND HolDate < @yearEnd
        ORDER BY HolDate
      `);

    const holidays = result.recordset.map(r => new Date(r.HolDate).toISOString().slice(0, 10));
    res.json({ ok: true, data: holidays });
  } catch (err) {
    console.error('[ProductionSummary/Holidays]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /max-week — Maximum week number for a year
// ═════════════════════════════════════════════════════════════════════════════
router.get('/max-week', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const pool = await getPool();
    const result = await pool.request()
      .input('planYear', sql.Int, year)
      .query(`
        SELECT ISNULL(MAX(PlanWeek), 52) AS MaxWeek
        FROM OrdWeekPlanHD
        WHERE PlanYear = @planYear
      `);

    res.json({ ok: true, maxWeek: result.recordset[0].MaxWeek });
  } catch (err) {
    console.error('[ProductionSummary/MaxWeek]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
