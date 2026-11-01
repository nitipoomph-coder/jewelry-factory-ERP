const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// Groups mapping from VB code
const CUST_GROUPS = {
  'N008': ['N008', 'N044', 'N048', 'N064', 'N065', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'],
  'N098': ['N098'],
  'N051': ['N051'],
  'N092': ['N082', 'N092'],
  'N089': ['N083', 'N086', 'N087', 'N088', 'N089'],
  'U414': ['U411', 'U412', 'U413', 'U414', 'U415', 'U416', 'U417', 'U418', 'U419', 'U420', 'U421', 'U422', 'U423', 'U424', 'U425', 'U426']
};

const ALL_CODES = Object.values(CUST_GROUPS).flat();

function getCustFilter(groupId) {
  if (groupId === 'All Customer') return '';
  if (groupId === 'General') {
    const codes = ALL_CODES.map(c => `'${c}'`).join(',');
    return `AND RTRIM(hd.CustCode) NOT IN (${codes})`;
  }
  const codes = CUST_GROUPS[groupId];
  if (!codes) return '';
  const inStr = codes.map(c => `'${c}'`).join(',');
  return `AND RTRIM(hd.CustCode) IN (${inStr})`;
}

function getFactoryFilter(factory) {
  if (!factory || factory.toUpperCase() === 'ALL') return '';
  const f = factory.toUpperCase();
  if (f === 'FBE' || f === 'FBD') {
    return `AND (RTRIM(hd.ProFac) = 'FBD' OR RTRIM(hd.ProFac) = 'FBE')`;
  }
  if (f === 'CLL') {
    return `AND (RTRIM(hd.ProFac) = 'CLL' OR hd.ProFac IS NULL OR RTRIM(hd.ProFac) = '')`;
  }
  return '';
}

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, group = 'All Customer', viewMode = 'day', factory = 'ALL' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ ok: false, error: 'startDate and endDate are required' });
    }

    const pool = await getPool();
    let query = `
      SELECT 
        LEFT(dt.ItemNo, 3) AS IT3,
        SUM(ISNULL(dt.ItemQty, 0)) AS OrderQty,
        SUM(
          CASE 
            WHEN RTRIM(ISNULL(hd.CloseStatus,'')) = 'Y' THEN ISNULL(dt.ItemQty, 0) 
            ELSE ISNULL(dt.FinishQty, 0) 
          END
        ) AS DoneQty,
        SUM(
          CASE 
            WHEN RTRIM(ISNULL(hd.CloseStatus,'')) = 'Y' THEN 0 
            WHEN ISNULL(dt.ItemQty, 0) > ISNULL(dt.FinishQty, 0) THEN ISNULL(dt.ItemQty, 0) - ISNULL(dt.FinishQty, 0) 
            ELSE 0 
          END
        ) AS RemainQty,
    `;

    // Grouping logic based on viewMode
    if (viewMode === 'year') {
      query += ` YEAR(hd.CustDueDate) AS PeriodKey, CAST(YEAR(hd.CustDueDate) AS VARCHAR) AS PeriodLabel`;
    } else if (viewMode === 'month') {
      query += ` YEAR(hd.CustDueDate) AS YYYY, MONTH(hd.CustDueDate) AS MM, 
                 CAST(YEAR(hd.CustDueDate) AS VARCHAR) + '-' + RIGHT('0' + CAST(MONTH(hd.CustDueDate) AS VARCHAR), 2) AS PeriodLabel`;
    } else if (viewMode === 'week') {
      query += ` YEAR(hd.CustDueDate) AS YYYY, DATEPART(isowk, hd.CustDueDate) AS WW, 
                 CAST(YEAR(hd.CustDueDate) AS VARCHAR) + '-W' + RIGHT('0' + CAST(DATEPART(isowk, hd.CustDueDate) AS VARCHAR), 2) AS PeriodLabel`;
    } else {
      // Default day
      query += ` CONVERT(date, hd.CustDueDate) AS PeriodKey, CONVERT(varchar(10), hd.CustDueDate, 120) AS PeriodLabel`;
    }

    query += `
      FROM OrdDT dt WITH (NOLOCK)
      INNER JOIN OrdHD hd WITH (NOLOCK) ON hd.OrdNo = dt.OrdNo
      WHERE hd.CustDueDate >= @startDate AND hd.CustDueDate <= @endDate
        AND LEFT(hd.OrdNo, 3) NOT IN ('BBL', 'BBD', 'BBI', 'BBP')
        ${getFactoryFilter(factory)}
        ${getCustFilter(group)}
    `;

    // Group BY
    if (viewMode === 'year') {
      query += ` GROUP BY YEAR(hd.CustDueDate), LEFT(dt.ItemNo, 3)`;
    } else if (viewMode === 'month') {
      query += ` GROUP BY YEAR(hd.CustDueDate), MONTH(hd.CustDueDate), LEFT(dt.ItemNo, 3)`;
    } else if (viewMode === 'week') {
      query += ` GROUP BY YEAR(hd.CustDueDate), DATEPART(isowk, hd.CustDueDate), LEFT(dt.ItemNo, 3)`;
    } else {
      query += ` GROUP BY CONVERT(date, hd.CustDueDate), CONVERT(varchar(10), hd.CustDueDate, 120), LEFT(dt.ItemNo, 3)`;
    }
    
    // Order BY
    if (viewMode === 'year') {
      query += ` ORDER BY YEAR(hd.CustDueDate) ASC`;
    } else if (viewMode === 'month') {
      query += ` ORDER BY YEAR(hd.CustDueDate) ASC, MONTH(hd.CustDueDate) ASC`;
    } else if (viewMode === 'week') {
      query += ` ORDER BY YEAR(hd.CustDueDate) ASC, DATEPART(isowk, hd.CustDueDate) ASC`;
    } else {
      query += ` ORDER BY CONVERT(date, hd.CustDueDate) ASC`;
    }

    const result = await pool.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(query);

    // Group Items Categories as per VB code
    const CATS = ["BBS", "BES+BCS", "BNS+BPS", "BTS", "BRS", "OTHER"];
    const getCat = (it3) => {
      if (!it3) return "OTHER";
      const i = it3.trim().toUpperCase();
      if (i === "BBS") return "BBS";
      if (i === "BES" || i === "BCS") return "BES+BCS";
      if (i === "BNS" || i === "BPS") return "BNS+BPS";
      if (i === "BTS") return "BTS";
      if (i === "BRS") return "BRS";
      return "OTHER";
    };

    const data = result.recordset;
    
    // Process into structured format for UI
    const periodMap = {}; // { periodLabel: { orderMap: { BBS: 100, ... }, totalOrder: 100, totalDone: 50, totalRemain: 50 } }

    data.forEach(row => {
      const pl = row.PeriodLabel;
      if (!periodMap[pl]) {
        periodMap[pl] = {
          periodLabel: pl,
          orderMap: {},
          doneMap: {},
          totalOrder: 0,
          totalDone: 0,
          totalRemain: 0
        };
        CATS.forEach(c => {
          periodMap[pl].orderMap[c] = 0;
          periodMap[pl].doneMap[c] = 0;
        });
      }

      const cat = getCat(row.IT3);
      const ord = row.OrderQty || 0;
      const done = row.DoneQty || 0;
      const remain = row.RemainQty || 0;

      periodMap[pl].orderMap[cat] += ord;
      periodMap[pl].doneMap[cat] += done;
      
      periodMap[pl].totalOrder += ord;
      periodMap[pl].totalDone += done;
      periodMap[pl].totalRemain += remain;
    });

    const formattedData = Object.values(periodMap);

    res.json({ ok: true, data: formattedData });
  } catch (err) {
    console.error('[Production Forecast Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
