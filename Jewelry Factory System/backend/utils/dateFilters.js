const { sql } = require('../db');

function parseCsvInts(value, fallback = []) {
  const parsed = String(value || '')
    .split(',')
    .map(v => parseInt(v, 10))
    .filter(v => !Number.isNaN(v));
  return parsed.length > 0 ? parsed : fallback;
}

function parseCsvStrings(value) {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function addInParams(request, prefix, values, type) {
  values.forEach((value, index) => request.input(`${prefix}${index}`, type, value));
  return values.map((_, index) => `@${prefix}${index}`).join(',');
}

function salesDateBasis(req, viewAlias = 'v') {
  // If dateField is passed, use it, else default to orddate
  const dateField = (req.query.dateField || 'ordDate').toLowerCase();
  if (dateField === 'duedate') {
    return { basis: 'duedate', dateExpr: viewAlias ? viewAlias + '.DueDate' : 'DueDate' };
  }
  return { basis: 'orddate', dateExpr: viewAlias ? viewAlias + '.OrdDate' : 'OrdDate' };
}

function buildDateRangeCondition(col, yearList, monthList, startDate, endDate, wStart, wEnd) {
  // 1. Day / Custom Mode (Exact dates)
  if (startDate && endDate) {
    if (!yearList || yearList.length === 0) {
      return `(${col} >= '${startDate} 00:00:00' AND ${col} <= '${endDate} 23:59:59')`;
    }
    
    const startY = parseInt(startDate.substring(0, 4), 10);
    const endY = parseInt(endDate.substring(0, 4), 10);
    const startMD = startDate.substring(5);
    const endMD = endDate.substring(5);
    const yearDiff = endY - startY;
    
    const dayConditions = yearList.map(y => {
      const mappedStartY = y - yearDiff;
      const mappedEndY = y;
      return `(${col} >= '${mappedStartY}-${startMD} 00:00:00' AND ${col} <= '${mappedEndY}-${endMD} 23:59:59')`;
    });
    
    return '(' + dayConditions.join(' OR ') + ')';
  }
  
  // 2. Week Mode (ISO Week)
  // For weeks, we usually want to restrict to the selected year(s) AND the week range
  if (wStart !== null && wEnd !== null && !isNaN(wStart) && !isNaN(wEnd)) {
    const yearCondition = (!yearList || yearList.length === 0) 
      ? '1=1' 
      : '(' + yearList.map(y => `YEAR(${col}) = ${y}`).join(' OR ') + ')';
    return `(${yearCondition} AND DATEPART(isowk, ${col}) >= ${wStart} AND DATEPART(isowk, ${col}) <= ${wEnd})`;
  }
  
  // 3. Year / Month / YTD Mode
  if (!yearList || yearList.length === 0) return '1=1';
  if (!monthList || monthList.length === 0) {
    return '(' + yearList.map(y => `(${col} >= '${y}-01-01' AND ${col} < '${y + 1}-01-01')`).join(' OR ') + ')';
  }
  const conditions = [];
  for (const y of yearList) {
    for (const m of monthList) {
      const sM = m.toString().padStart(2, '0');
      const eM_val = m + 1;
      const eY = eM_val > 12 ? y + 1 : y;
      const eM = (eM_val > 12 ? 1 : eM_val).toString().padStart(2, '0');
      conditions.push(`(${col} >= '${y}-${sM}-01' AND ${col} < '${eY}-${eM}-01')`);
    }
  }
  return '(' + conditions.join(' OR ') + ')';
}

/**
 * Shared filtering logic for Sales and Top Orders dashboards.
 * Supports Years, Months, Custom Date Range (startDate/endDate), and Week Range (wStart/wEnd).
 */
function buildSalesFilters(req, request, viewAlias = 'v', customDateExpr = null) {
  const years = parseCsvInts(req.query.years, [new Date().getFullYear()]);
  const months = parseCsvInts(req.query.months);
  const customers = parseCsvStrings(req.query.customers);
  const types = parseCsvStrings(req.query.types).map(v => v.toUpperCase());
  
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const wStart = req.query.wStart ? parseInt(req.query.wStart, 10) : null;
  const wEnd = req.query.wEnd ? parseInt(req.query.wEnd, 10) : null;
  
  const effectiveDateExpr = customDateExpr || salesDateBasis(req, viewAlias).dateExpr;

  const sargableDateCondition = buildDateRangeCondition(effectiveDateExpr, years, months, startDate, endDate, wStart, wEnd);

  const filters = [
    sargableDateCondition,
  ];

  if (customers.length > 0) {
    // Determine the customer code column (legacy matrix uses CustCode directly, new views might have viewAlias)
    // For backwards compatibility, if viewAlias is empty, we just use CustCode
    const custCol = viewAlias ? `${viewAlias}.CustCode` : 'CustCode';
    const customerParams = addInParams(request, 'sc', customers, sql.NVarChar);
    filters.push(`${custCol} IN (${customerParams})`);
  }

  if (types.length > 0) {
    // Same for item types
    const itemCol = viewAlias ? `${viewAlias}.ItemNo` : 'ItemNo';
    const typeParams = addInParams(request, 'st', types, sql.NVarChar);
    filters.push(`LEFT(ISNULL(${itemCol}, ''), 3) IN (${typeParams})`);
  }

  return { years, months, customers, types, wStart, wEnd, startDate, endDate, whereSql: filters.join('\n        AND '), effectiveDateExpr };
}

module.exports = {
  parseCsvInts,
  parseCsvStrings,
  addInParams,
  salesDateBasis,
  buildDateRangeCondition,
  buildSalesFilters
};
