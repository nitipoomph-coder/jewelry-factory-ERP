// ============================================
// Procurement & Receiving API Routes
// SPA (สั่งซื้อพลอย), SRA (รับพลอย), SRB (รับพลอย B), SIR (คืนพลอย)
// ============================================
// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Procurement & Receiving (routes/procurementReceiving.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Handles logic for Purchase Orders (SPA), Receipts (SRA, SRB), and Returns (SIR).
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// ─── Cache helpers ────────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    console.log(`[CACHE HIT] ${key}`);
    return entry.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── Table Configuration Helper ───────────────────────────────────────────────
function getTableConfig(docTypeOrNo) {
  const upper = docTypeOrNo.toUpperCase();
  const code = upper.substring(0, 3);

  if (code === 'SPA' || upper.startsWith('SPA')) {
    return {
      type: 'SPA',
      headerTable: 'dbInventory.dbo.STPOStockHD',
      detailTable: 'dbInventory.dbo.STPOStockDT',
      idCol: 'POStockID',
      qtyCol: 'SumGoodQty',
      amtCol: 'SumGoodAmnt',
      prefix: 'SPA',
      detailQtyCol: 'GoodQty',
      detailWeightCol: 'GoodWeight',
      detailPriceCol: 'GoodPrice',
      detailAmntCol: 'GoodAmnt',
      detailUnitCol: 'GoodUnitCode',
      hasPO: true,
      hasRemark: true,
      hasCTPrice: true,
      hasGoodDesc: true
    };
  }
  if (code === 'SRA' || upper.startsWith('SRA')) {
    return {
      type: 'SRA',
      headerTable: 'dbInventory.dbo.STRecStockHD',
      detailTable: 'dbInventory.dbo.STRecStockDT',
      idCol: 'RecStockID',
      qtyCol: 'SumGoodQty',
      amtCol: 'SumGoodAmnt',
      prefix: 'SRA',
      detailQtyCol: 'GoodQty',
      detailWeightCol: 'GoodWeight',
      detailPriceCol: 'GoodPrice',
      detailAmntCol: 'GoodAmnt',
      detailUnitCol: 'GoodUnitCode',
      hasPO: false,
      hasRemark: true,
      hasCTPrice: true,
      hasGoodDesc: false
    };
  }
  if (code === 'SRB' || upper.startsWith('SRB')) {
    return {
      type: 'SRB',
      headerTable: 'dbInventory.dbo.STRecStockHD',
      detailTable: 'dbInventory.dbo.STRecStockDT',
      idCol: 'RecStockID',
      qtyCol: 'SumGoodQty',
      amtCol: 'SumGoodAmnt',
      prefix: 'SRB',
      detailQtyCol: 'GoodQty',
      detailWeightCol: 'GoodWeight',
      detailPriceCol: 'GoodPrice',
      detailAmntCol: 'GoodAmnt',
      detailUnitCol: 'GoodUnitCode',
      hasPO: false,
      hasRemark: true,
      hasCTPrice: true,
      hasGoodDesc: false
    };
  }
  if (code === 'SIR' || upper.startsWith('SIR')) {
    return {
      type: 'SIR',
      headerTable: 'dbInventory.dbo.STRetStockHD',
      detailTable: 'dbInventory.dbo.STRetStockDT',
      idCol: 'RetStockID',
      qtyCol: 'SumGoodQty',
      amtCol: 'SumGoodAmnt',
      prefix: 'SIR',
      detailQtyCol: 'GoodQty',
      detailWeightCol: 'GoodWeight',
      detailPriceCol: 'GoodPrice',
      detailAmntCol: 'GoodAmnt',
      detailUnitCol: 'GoodUnitCode',
      hasPO: false,
      hasRemark: false,
      hasCTPrice: false,
      hasGoodDesc: false
    };
  }

  throw new Error(`Unsupported document identifier: ${docTypeOrNo}`);
}

// ============================================
// GET /api/procurement/next-number/:docType
// Generate next document number (Auto-increment)
// Format: PREFIX + YYMM + 3-4 digits (e.g. SPA2605001)
// ============================================
router.get('/next-number/:docType', async (req, res) => {
  const { docType } = req.params;
  try {
    const pool = await getPool();
    const config = getTableConfig(docType);

    // Format: YYMM
    const date = new Date();
    const yy = String(date.getFullYear()).slice(-2);
    let mm = String(date.getMonth() + 1);
    if (mm.length === 1) mm = '0' + mm;
    const prefix = `${config.prefix}${yy}${mm}`;

    const query = `
        SELECT MAX(DocuNo) as maxDoc
        FROM ${config.headerTable}
        WHERE DocuNo LIKE @prefix + '%'
      `;

    const result = await pool.request()
      .input('prefix', sql.VarChar(10), prefix)
      .query(query);

    const maxDoc = result.recordset[0].maxDoc;
    let nextNum = 1;
    if (maxDoc) {
      const numPart = maxDoc.replace(prefix, '');
      const parsedNum = parseInt(numPart, 10);
      if (!isNaN(parsedNum)) {
        nextNum = parsedNum + 1;
      }
    }

    // Default to 3 digits, e.g. 001
    const nextDocNo = `${prefix}${String(nextNum).padStart(3, '0')}`;
    res.json({ ok: true, data: nextDocNo });
  } catch (err) {
    console.error(`❌ [PROC] Error generating next number for ${docType}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/procurement/documents/:docType
// ดึงรายการเอกสาร (Document List) ตาม docType
// docType: SPA | SRA | SRB | SIR
// ============================================
router.get('/documents/:docType', async (req, res) => {
  const { docType } = req.params;
  const validTypes = ['SPA', 'SRA', 'SRB', 'SIR'];

  if (!validTypes.includes(docType.toUpperCase())) {
    return res.json({ ok: false, error: `Invalid document type: ${docType}` });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  const cacheKey = `proc_docs_${docType}_${page}_${limit}_${search}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const pool = await getPool();
    const config = getTableConfig(docType);

    // Count Total
    const countQuery = `
        SELECT COUNT(*) as total
        FROM ${config.headerTable} h
        WHERE h.DocuNo LIKE @prefix + '%'
        ${search ? `AND h.DocuNo LIKE '%' + @search + '%'` : ''}
      `;

    const countResult = await pool.request()
      .input('prefix', sql.VarChar(5), config.prefix)
      .input('search', sql.VarChar(50), search)
      .query(countQuery);

    const total = countResult.recordset[0].total;

    let queryStr = `
        SELECT
          h.DocuNo AS docNumber,
          CONVERT(VARCHAR(10), h.DocuDate, 103) AS docDate,
          ISNULL(h.VendorCode, '') AS supplier,
          ISNULL(v.VendorName, '') AS supplierName,
          ISNULL(h.CurrCode, 'THB') AS currency,
          ISNULL(h.${config.amtCol}, 0) AS totalAmount,
          ISNULL(h.${config.qtyCol}, 0) AS totalQty,
          ISNULL(h.DocuStatus, '') AS status
        FROM ${config.headerTable} h
        LEFT JOIN dbInventory.dbo.GMVendor v ON h.VendorCode = v.VendorCode
        WHERE h.DocuNo LIKE @prefix + '%'
      `;

    if (search) {
      queryStr += ` AND h.DocuNo LIKE '%' + @search + '%'`;
    }

    queryStr += `
        ORDER BY h.DocuNo DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;

    const result = await pool.request()
      .input('prefix', sql.VarChar(5), config.prefix)
      .input('search', sql.VarChar(50), search)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(queryStr);

    const docs = result.recordset;

    const responseData = {
      ok: true,
      data: docs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    setCache(cacheKey, responseData);

    console.log(`[PROC] ${docType} page ${page}: ${docs.length} records`);
    res.json(responseData);
  } catch (err) {
    console.error(`❌ [PROC] Error fetching ${docType} documents:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/procurement/document/:docNo
// ดึงรายละเอียดเอกสาร (Document Detail) ตาม DocNo
// ============================================
router.get('/document/:docNo', async (req, res) => {
  const { docNo } = req.params;
  const cacheKey = `proc_doc_${docNo}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ok: true, data: cached });

  try {
    const pool = await getPool();
    const config = getTableConfig(docNo);

    // Dynamic fields mapping based on document type
    let dueDateSelect = "'' AS dueDate";
    let refSelect = "'' AS refNumber";
    let invSelect = "'' AS invoiceNumber";
    let remarkSelect = "'' AS remark";
    let buyerSelect = "'' AS buyer";

    if (config.type === 'SPA') {
      dueDateSelect = "ISNULL(CONVERT(VARCHAR(10), h.DueDate, 103), '') AS dueDate";
      buyerSelect = "ISNULL(h.BuyName, '') AS buyer";
    } else if (config.type === 'SRA' || config.type === 'SRB') {
      refSelect = "ISNULL(h.RefDocuNo, '') AS refNumber";
      remarkSelect = "ISNULL(h.TransNo, '') AS remark";
    } else if (config.type === 'SIR') {
      refSelect = "ISNULL(h.RefDocuNo, '') AS refNumber";
    }

    // 1. Fetch Header
    const headerQuery = `
        SELECT
          h.DocuNo AS docNumber,
          CONVERT(VARCHAR(10), h.DocuDate, 103) AS docDate,
          ISNULL(CONVERT(VARCHAR(10), h.DocuDate, 103), '') AS purchaseDate,
          ${dueDateSelect},
          '' AS receiveDate,
          ISNULL(h.VendorCode, '') AS supplierCode,
          ISNULL(v.VendorName, '') AS supplierName,
          ${buyerSelect},
          ISNULL(h.CurrCode, 'THB') AS currency,
          ISNULL(h.${config.amtCol}, 0) AS totalAmount,
          ISNULL(h.${config.qtyCol}, 0) AS totalQty,
          ${refSelect},
          '' AS billNumber,
          ${invSelect},
          ${remarkSelect},
          ISNULL(h.ExchRate, 1) AS exchangeRate,
          '' AS category,
          ISNULL(h.DocuStatus, '') AS status
        FROM ${config.headerTable} h
        LEFT JOIN dbInventory.dbo.GMVendor v ON h.VendorCode = v.VendorCode
        WHERE h.DocuNo = @docNo
      `;

    const hdr = await pool.request()
      .input('docNo', sql.VarChar(20), docNo)
      .query(headerQuery);

    if (hdr.recordset.length === 0) {
      return res.json({ ok: false, error: 'Document not found' });
    }
    const orderNumField = config.hasPO ? 'ISNULL(d.GoodPO, \'\')' : 'ISNULL(d.OCode, \'\')';
    const remarkField = config.hasRemark ? 'ISNULL(d.GoodRemark, \'\')' : '\'\'';
    const ctPriceField = config.hasCTPrice ? 'ISNULL(d.GoodCTPrice, 0)' : '0';
    const customerField = config.type === 'SPA' ? 'ISNULL(d.GoodCustPO, \'\')' : '\'\'';
    const descField = config.hasGoodDesc ? 'ISNULL(d.GoodDesc, \'\')' : '\'\'';
    const remark1Field = config.hasGoodDesc ? 'ISNULL(d.GoodDesc, \'\')' : '\'\'';
    const remark2Field = config.hasGoodDesc ? 'ISNULL(d.GoodDescCH, \'\')' : '\'\'';

    const detailQuery = `
        SELECT
          d.ListNo AS seq,
          ISNULL(d.GoodCode, '') AS stoneCode,
          ${descField} AS stoneName,
          ISNULL(d.GoodColorCode, '') AS color,
          ISNULL(d.GoodShapeCode, '') AS shape,
          ISNULL(s.GoodShapeNameEng, '') AS shapeName,
          ISNULL(d.GoodSizeCode, '') AS size,
          ISNULL(d.GoodSpecCode, '') AS characteristic,
          ISNULL(sp.GoodSpecNameEng, '') AS specName,
          ISNULL(d.GoodGradeCode, '') AS grade,
          ISNULL(d.GoodThick, '') AS height,
          ISNULL(d.${config.detailUnitCol}, '') AS unit,
          '' AS warehouse,
          ISNULL(d.${config.detailWeightCol}, 0) AS weight,
          ISNULL(d.${config.detailQtyCol}, 0) AS qty,
          ISNULL(d.${config.detailPriceCol}, 0) AS price,
          ISNULL(d.${config.detailAmntCol}, 0) AS amount,
          ${ctPriceField} AS ctPerPc,
          ${orderNumField} AS orderNumber,
          ${customerField} AS customer,
          '' AS jobNumber,
          '' AS useStone,
          ${remarkField} AS remark,
          ${remark1Field} AS remark1,
          ${remark2Field} AS remark2
        FROM ${config.detailTable} d
        LEFT JOIN dbInventory.dbo.GMGoodShape s ON d.GoodShapeCode = s.GoodShapeCode
        LEFT JOIN dbInventory.dbo.GMGoodSpec sp ON d.GoodSpecCode = sp.GoodSpecCode
        WHERE d.${config.idCol} = (SELECT ${config.idCol} FROM ${config.headerTable} WHERE DocuNo = @docNo)
        ORDER BY d.ListNo
      `;

    const dtl = await pool.request()
      .input('docNo', sql.VarChar(20), docNo)
      .query(detailQuery);

    const data = {
      header: hdr.recordset[0],
      lines: dtl.recordset,
    };

    setCache(cacheKey, data);
    console.log(`[PROC] ${docNo}: ${dtl.recordset.length} lines`);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(`❌ [PROC] Error fetching document ${docNo}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/procurement/summary/:docType
// สรุปภาพรวม — จำนวนเอกสาร, มูลค่ารวม ฯลฯ
// ============================================
router.get('/summary/:docType', async (req, res) => {
  const { docType } = req.params;
  const validTypes = ['SPA', 'SRA', 'SRB', 'SIR'];
  if (!validTypes.includes(docType.toUpperCase())) {
    return res.json({ ok: false, error: `Invalid document type: ${docType}` });
  }

  try {
    const pool = await getPool();
    const config = getTableConfig(docType);

    const queryStr = `
        SELECT
          COUNT(*) AS docCount,
          ISNULL(SUM(${config.amtCol}), 0) AS totalValue,
          ISNULL(SUM(${config.qtyCol}), 0) AS totalQty,
          MIN(CONVERT(VARCHAR(10), DocuDate, 103)) AS earliestDate,
          MAX(CONVERT(VARCHAR(10), DocuDate, 103)) AS latestDate
        FROM ${config.headerTable}
        WHERE DocuNo LIKE @prefix + '%'
      `;

    const result = await pool.request()
      .input('prefix', sql.VarChar(5), config.prefix)
      .query(queryStr);

    res.json({ ok: true, data: result.recordset[0] });
  } catch (err) {
    console.error(`❌ [PROC] Error fetching summary for ${docType}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

// ═══════════════════════════════════════════════════════════════════════════
// เพิ่ม endpoint นี้ใน procurement.js ก่อนบรรทัด: module.exports = router;
// ═══════════════════════════════════════════════════════════════════════════

// ============================================
// PUT /api/procurement/document/:docNo
// อัปเดต header ของเอกสาร (เฉพาะ field ที่แก้ไขได้)
// ============================================
router.put('/document/:docNo', async (req, res) => {
  const { docNo } = req.params;
  const { header } = req.body;

  if (!header) {
    return res.status(400).json({ ok: false, error: 'header is required' });
  }

  try {
    const pool = await getPool();
    const config = getTableConfig(docNo);
    const request = pool.request().input('docNo', sql.VarChar(20), docNo);
    const setClauses = [];

    // ─── Fields ที่ทุก docType แก้ได้ ────────────────
    if (header.docDate) {
      const parsed = new Date(header.docDate);
      if (!isNaN(parsed.getTime())) {
        setClauses.push('DocuDate = @docDate');
        request.input('docDate', sql.DateTime, parsed);
      }
    }
    if (header.supplierCode !== undefined) {
      setClauses.push('VendorCode = @vendorCode');
      request.input('vendorCode', sql.VarChar(20), header.supplierCode || null);
    }
    if (header.currency !== undefined) {
      setClauses.push('CurrCode = @currency');
      request.input('currency', sql.VarChar(10), header.currency || 'THB');
    }
    if (header.exchangeRate !== undefined) {
      const rate = parseFloat(header.exchangeRate);
      if (!isNaN(rate)) {
        setClauses.push('ExchRate = @exchRate');
        request.input('exchRate', sql.Decimal(18, 6), rate);
      }
    }

    // ─── SPA เท่านั้น ─────────────────────────────────
    if (config.type === 'SPA') {
      if (header.dueDate) {
        const parsed = new Date(header.dueDate);
        if (!isNaN(parsed.getTime())) {
          setClauses.push('DueDate = @dueDate');
          request.input('dueDate', sql.DateTime, parsed);
        }
      }
      if (header.buyer !== undefined) {
        setClauses.push('BuyName = @buyName');
        request.input('buyName', sql.VarChar(50), header.buyer || null);
      }
    }

    // ─── SRA / SRB / SIR ──────────────────────────────
    if (config.type === 'SRA' || config.type === 'SRB' || config.type === 'SIR') {
      if (header.refNumber !== undefined) {
        setClauses.push('RefDocuNo = @refDocuNo');
        request.input('refDocuNo', sql.VarChar(20), header.refNumber || null);
      }
    }

    if (setClauses.length === 0) {
      return res.json({ ok: true, message: 'Nothing to update' });
    }

    const updateQuery = `
      UPDATE ${config.headerTable}
      SET ${setClauses.join(', ')}
      WHERE DocuNo = @docNo
    `;

    const result = await request.query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ ok: false, error: 'Document not found' });
    }

    // Invalidate cache เพื่อให้ refetch ได้ข้อมูลใหม่
    cache.delete(`proc_doc_${docNo}`);
    // Invalidate list cache ทั้งหมดของ docType นี้
    for (const key of cache.keys()) {
      if (key.startsWith(`proc_docs_${config.type}`)) {
        cache.delete(key);
      }
    }

    console.log(`[PROC] ✅ Updated ${docNo}: ${result.rowsAffected[0]} row(s), fields: ${setClauses.join(', ')}`);
    res.json({ ok: true, updated: result.rowsAffected[0] });

  } catch (err) {
    console.error(`❌ [PROC] Error updating ${docNo}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});