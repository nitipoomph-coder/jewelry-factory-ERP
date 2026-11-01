// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Sample Department (routes/sampleDepartment.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Handles logic for Sample Requests (SSA) and Sample Dispatches (SIM).
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// รูปเสิร์ฟจาก network path ผ่าน DocumentLayout (/api/photos/ps|cad/:itemNo) — ใช้ ItemNo จาก d.* โดยตรง

// ─── Table Configuration Helper ───────────────────────────────────────────────
function getSampleTableConfig(docTypeOrNo) {
  const upper = docTypeOrNo.toUpperCase();
  const code = upper.substring(0, 3);

  if (code === 'SSA') {
    return {
      type: 'SSA',
      headerTable: 'dbInventory.dbo.STSamStockHD',
      detailTable: 'dbInventory.dbo.STSamStockDT',
      idCol: 'SamStockID',
      prefix: 'SSA',
      selectFields: 'DocuNo, DocuDate, CustCode, SumGoodQty, SumGoodAmnt, DocuStatus'
    };
  }
  if (code === 'SIM') {
    return {
      type: 'SIM',
      headerTable: 'dbInventory.dbo.STSenSamStockHD',
      detailTable: 'dbInventory.dbo.STSenSamStockDT',
      idCol: 'SenSamStockID',
      prefix: 'SIM',
      selectFields: 'DocuNo, DocuDate, CustCode, SumGoodQty, SumGoodAmnt, DocuStatus'
    };
  }

  throw new Error(`Unsupported sample document identifier: ${docTypeOrNo}`);
}

// ============================================
// GET /api/sample/documents/:docType
// รายการเอกสาร SSA หรือ SIM
// ============================================
router.get('/documents/:docType', async (req, res) => {
  try {
    const docType = req.params.docType.toUpperCase();
    const config = getSampleTableConfig(docType);
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
    console.error('[SAMPLE API Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/sample/document/:docuNo
// ดึงรายละเอียดเอกสาร SSA หรือ SIM (header + detail lines)
// ============================================
router.get('/document/:docuNo', async (req, res) => {
  try {
    const pool = await getPool();
    const docuNo = req.params.docuNo;
    const config = getSampleTableConfig(docuNo);

    // ดึง Header — SELECT * เพื่อให้ได้ทุกคอลัมน์
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

    // ดึง Detail Lines — SELECT d.* + LEFT JOIN photo
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
    console.error('[SAMPLE API Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
