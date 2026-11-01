// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Order Lines & Issues (routes/orderLinesIssues.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Handles logic for Requisitions/Orders (SOA) and Issues (SIA, SIB, SIP, SIS).
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// รูปเสิร์ฟจาก network path ผ่าน DocumentLayout (/api/photos/ps|cad/:itemNo) — ใช้ ItemNo จาก detail line โดยตรง

// ─── Table Configuration Helper ───────────────────────────────────────────────
function getTableConfig(docTypeOrNo) {
  const upper = docTypeOrNo.toUpperCase();
  const code = upper.substring(0, 3);

  if (code === 'SOA') {
    return {
      type: 'SOA',
      headerTable: 'dbInventory.dbo.STOrdStockHD',
      detailTable: 'dbInventory.dbo.STOrdStockDT',
      idCol: 'OrdStockID',
      prefix: 'SOA',
      selectFields: 'DocuNo, DocuDate, OrderNo, PONo, CustCode, DueDate, DocuStatus'
    };
  }
  if (code === 'SIA') {
    return {
      type: 'SIA',
      headerTable: 'dbInventory.dbo.STIssStockHD',
      detailTable: 'dbInventory.dbo.STIssStockDT',
      idCol: 'IssStockID',
      prefix: 'SIA',
      selectFields: "DocuNo, DocuDate, '' AS OrderNo, '' AS PONo, CustCode, NULL AS DueDate, DocuStatus"
    };
  }
  if (code === 'SIB') {
    return {
      type: 'SIB',
      headerTable: 'dbInventory.dbo.STRetStockHD',
      detailTable: 'dbInventory.dbo.STRetStockDT',
      idCol: 'RetStockID',
      prefix: 'SIB',
      selectFields: "DocuNo, DocuDate, '' AS OrderNo, '' AS PONo, VendorCode AS CustCode, NULL AS DueDate, DocuStatus"
    };
  }
  if (code === 'SIP') {
    return {
      type: 'SIP',
      headerTable: 'dbInventory.dbo.STRepStockHD',
      detailTable: 'dbInventory.dbo.STRepStockDT',
      idCol: 'RepStockID',
      prefix: 'SIP',
      selectFields: "DocuNo, DocuDate, '' AS OrderNo, '' AS PONo, CustCode, NULL AS DueDate, DocuStatus"
    };
  }
  if (code === 'SIS') {
    return {
      type: 'SIS',
      headerTable: 'dbInventory.dbo.STSenStockHD',
      detailTable: 'dbInventory.dbo.STSenStockDT',
      idCol: 'SenStockID',
      prefix: 'SIS',
      selectFields: "DocuNo, DocuDate, '' AS OrderNo, '' AS PONo, '' AS CustCode, NULL AS DueDate, DocuStatus"
    };
  }

  throw new Error(`Unsupported document identifier: ${docTypeOrNo}`);
}

// ============================================
// GET /api/requisition/next-number/:docType
// Generate next document number (Auto-increment)
// ============================================
router.get('/next-number/:docType', async (req, res) => {
  const { docType } = req.params;
  try {
    const pool = await getPool();
    const config = getTableConfig(docType);
    
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

    const nextDocNo = `${prefix}${String(nextNum).padStart(3, '0')}`;
    res.json({ ok: true, data: nextDocNo });
  } catch (err) {
    console.error(`❌ [REQ] Error generating next number for ${docType}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/requisition/order/:ordNo
// ค้นหาข้อมูลออเดอร์เพื่อเตรียมทำ SOA / เบิก
// ============================================
router.get('/order/:ordNo', async (req, res) => {
  try {
    const pool = await getPool();
    const ordNo = req.params.ordNo;

    // Fetch Header from OrdHD
    const headerResult = await pool.request()
      .input('ordNo', sql.NVarChar, ordNo)
      .query(`
        SELECT 
          OrdNo, OrdDate, DueDate, PONo, CustCode, 
          SumOrdQty, OrdStatus
        FROM OrdHD 
        WHERE OrdNo = @ordNo
      `);

    if (headerResult.recordset.length === 0) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    const header = headerResult.recordset[0];

    // Fetch Details
    const detailResult = await pool.request()
      .input('ordNo', sql.NVarChar, ordNo)
      .query(`
        SELECT 
          d.OrdNo,
          d.OrdLineNo,
          d.ItemNo,
          d.ItemDesc,
          d.ItemQty,
          d.ItemStone
        FROM OrdDT d
        WHERE d.OrdNo = @ordNo
        ORDER BY d.OrdLineNo
      `);

    const lines = detailResult.recordset;

    res.json({ ok: true, header, lines });
  } catch (err) {
    console.error('[REQ API Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/requisition/document/:docuNo
// ดึงข้อมูลเอกสาร (เช่น SOA, SIA)
// ============================================
router.get('/document/:docuNo', async (req, res) => {
  try {
    const pool = await getPool();
    const docuNo = req.params.docuNo;
    const config = getTableConfig(docuNo);

    const headerQuery = await pool.request()
      .input('docuNo', sql.VarChar, docuNo)
      .query(`
        SELECT * 
        FROM ${config.headerTable} 
        WHERE DocuNo = @docuNo
      `);

    if (headerQuery.recordset.length === 0) {
      return res.status(404).json({ ok: false, error: 'Document not found' });
    }

    const header = headerQuery.recordset[0];

    const detailQuery = await pool.request()
      .input('docID', sql.Int, header[config.idCol])
      .query(`
        SELECT d.*
        FROM ${config.detailTable} d
        WHERE d.${config.idCol} = @docID
        ORDER BY d.ListNo
      `);

    const lines = detailQuery.recordset;

    res.json({ ok: true, header, lines });
  } catch (err) {
    console.error('[REQ API Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/requisition/documents/:docType
// List Documents by Type (SOA, SIA, etc.)
// ============================================
router.get('/documents/:docType', async (req, res) => {
  try {
    const docType = req.params.docType.toUpperCase();
    const config = getTableConfig(docType);
    const pool = await getPool();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Count Total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${config.headerTable}
      WHERE DocuNo LIKE @prefix + '%'
      ${search ? `AND DocuNo LIKE '%' + @search + '%'` : ''}
    `;

    const countResult = await pool.request()
      .input('prefix', sql.VarChar(5), config.prefix)
      .input('search', sql.VarChar(50), search)
      .query(countQuery);
      
    const total = countResult.recordset[0].total;

    // Fetch Paginated Data
    let queryStr = `
      SELECT
        ${config.selectFields}
      FROM ${config.headerTable}
      WHERE DocuNo LIKE @prefix + '%'
    `;
    
    if (search) {
      queryStr += ` AND DocuNo LIKE '%' + @search + '%'`;
    }

    queryStr += `
      ORDER BY DocuNo DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const result = await pool.request()
      .input('prefix', sql.VarChar(5), config.prefix)
      .input('search', sql.VarChar(50), search)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(queryStr);

    res.json({ 
      ok: true, 
      data: result.recordset,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('[REQ API Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
