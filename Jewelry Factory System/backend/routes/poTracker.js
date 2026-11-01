// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Production Orders / PO Tracker (routes/poTracker.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Handles data fetching and updates for the Production Order tracking system.
// This file serves the main "PO Tracker" module in the frontend.
//
// ⚠️ MIXED DATA FETCHING:
//    - The main listing endpoint (`GET /`) uses Legacy Stored Procedures.
//    - The detail/grouping endpoints query the DB directly (OrdHD/OrdDT).
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// หมายเหตุ: เลิกใช้รูปแบบ base64 (VARBINARY จาก GMItemPhoto) แล้ว — รูปทั้งหมดเสิร์ฟจาก
// network path ผ่าน Photo Bridge (/api/photos/ps|cad/:itemNo) โดยหน้าเว็บประกอบ URL จาก ItemNo เอง
// SP list คืน SampleItemNo (ItemNo ตัวแทน 1 ค่า/กลุ่ม) แทนก้อนรูป

// --- helper: calculate pending quantities following legacy Stored Procedure ---
function computePendingProcessQuantities(r, isAliased = false) {
  const itemQty = Number(isAliased ? r.Qty : r.ItemQty) || 0;

  const stoneQty = Number(r.StoneQty) || 0;
  const fitQty = Number(isAliased ? r.FindingQty : r.FitQty) || 0;
  const wijQty = Number(isAliased ? r.WaxQty : r.WijQty) || 0;
  const wstQty = Number(isAliased ? r.WaxSetQty : r.WstQty) || 0;
  const castQty = Number(r.CastQty) || 0;
  const controlQty = Number(r.ControlQty) || 0;
  const grindQty = Number(r.GrindQty) || 0;
  const polishQty = Number(r.PolishQty) || 0;
  const plateQty = Number(isAliased ? r.PlatingQty : r.PlateQty) || 0;
  const qcQty = Number(isAliased ? r.FQCQty : r.QCQty) || 0;
  const exportQty = Number(isAliased ? r.GroupQty : r.ExportQty) || 0;
  const finishQty = Number(r.FinishQty) || 0;

  const epoxQty = Number(r.EpoxQty) || 0;
  const filQty = Number(isAliased ? r.FilingQty : r.FilQty) || 0;
  const solQty = Number(r.SolderQty || r.SolQty) || 0;
  const setQty = Number(r.SetQty) || 0;
  const pqcQty = Number(isAliased ? r.PQCQty : r.QPQty) || 0;
  const assemQty = Number(r.AssemQty) || 0;
  const packQty = Number(r.PackQty) || 0;

  // Stored Procedure formulas
  const stonePen = stoneQty - itemQty;
  const fitPen = fitQty - itemQty;
  const wijPen = wijQty - itemQty;
  const wstPen = (wijQty === itemQty ? wstQty - wijQty : wstQty - itemQty);
  const castPen = (wijQty === itemQty ? castQty - wijQty : castQty - itemQty);
  const controlPen = controlQty - itemQty;
  const grindPen = (castQty === itemQty ? grindQty - castQty : grindQty - itemQty);
  const polishPen = (grindQty === itemQty ? polishQty - grindQty : polishQty - itemQty);
  const platePen = (polishQty === itemQty ? plateQty - polishQty : plateQty - itemQty);
  const qcPen = (plateQty === itemQty ? qcQty - plateQty : qcQty - itemQty);

  const epoxPen = epoxQty - itemQty;
  const filPen = filQty - itemQty;
  const solPen = solQty - itemQty;
  const setPen = setQty - itemQty;
  const pqcPen = pqcQty - itemQty;
  const assemPen = assemQty - itemQty;
  const packPen = packQty - itemQty;

  const balPen = exportQty - itemQty;
  const finishPen = finishQty - itemQty;

  return {
    StoneQty: stonePen,
    FindingQty: fitPen,
    WaxQty: wijPen,
    WaxSetQty: wstPen,
    CastQty: castPen,
    ControlQty: controlPen,
    GrindQty: grindPen,
    PolishQty: polishPen,
    PlatingQty: platePen,
    FQCQty: qcPen,
    EpoxQty: epoxPen,
    FilingQty: filPen,
    SolderQty: solPen,
    SetQty: setPen,
    PQCQty: pqcPen,
    AssemQty: assemPen,
    PackQty: packPen,
    GroupQty: exportQty,
    BalQty: balPen,
    ExportQty: exportQty,
    FinishQty: finishQty,
  };
}

// --- In-Memory Cache + Request Coalescing ---
const cache = new Map();
const inFlight = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ปิดการล็อค Cache เพื่อให้ข้อมูลสดใหม่ (Real-time) เสมอจาก Database
function getCached(key) {
  return null;
}
function setCached(key, data) {
  // ไม่ล็อคข้อมูลค้างในหน่วยความจำ
}

// === GET /api/orders =========================================================
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { dateFrom, dateTo, dateType, status, noCache } = req.query;
    const statusFilter = status || 'pending'; // default to pending if not specified

    // Default range: 7 months back -> today
    const defaultFrom = new Date(); defaultFrom.setMonth(defaultFrom.getMonth() - 7);
    const defaultTo = new Date(); defaultTo.setMonth(defaultTo.getMonth() + 0);

    const startDate = dateFrom ? new Date(dateFrom) : defaultFrom;
    const endDate = dateTo ? new Date(dateTo) : defaultTo;


    // --- 1. หาชื่อ SP ให้เรียบร้อยก่อนใช้ทำ Cache Key ---
    // SP name mapping — รองรับค่าจาก Frontend dropdown ทั้งหมด
    let spName = 'dbo.PC_Show_OrdTrack_Sum_OrdDate';
    if (dateType === 'Due Date' || dateType === 'DueDate' || dateType === 'Factory Due Date') {
      spName = 'dbo.PC_Show_OrdTrack_Sum_DueDate';
    } else if (dateType === 'Cust Due Date' || dateType === 'CustDueDate') {
      spName = 'dbo.PC_Show_OrdTrack_Sum_CustDueDate';
    } else if (dateType === 'Finish Date' || dateType === 'FinDate') {
      spName = 'dbo.PC_Show_OrdTrack_Sum_FinDate';
    } else if (dateType === 'All' || dateType === 'All Dates') {
      spName = 'dbo.PC_Show_OrdTrack_Sum_All';
    } else if (dateType === 'Order Date' || !dateType) {
      spName = 'dbo.PC_Show_OrdTrack_Sum_OrdDate';
    }

    const cacheKey = `${spName}|${startDate.toISOString().slice(0, 10)}|${endDate.toISOString().slice(0, 10)}`;

    // 1) Cache hit - return immediately
    if (!noCache) {
      const cached = getCached(cacheKey);
      if (cached) {
        console.log(`[CACHE HIT] ${cacheKey} (${cached.length} rows)`);
        return res.json({ ok: true, data: cached, count: cached.length, cached: true });
      }
    }

    // 2) In-flight check
    if (inFlight.has(cacheKey)) {
      console.log(`[IN-FLIGHT] waiting: ${cacheKey}`);
      const data = await inFlight.get(cacheKey);
      return res.json({ ok: true, data, count: data.length, cached: 'coalesced' });
    }

    // 3) Execute Stored Procedure
    const fetchPromise = (async () => {
      console.log(`[EXEC SP] ${spName} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`);
      const request = pool.request();

      // === [พารามิเตอร์ที่ใช้เรียกใช้งาน Stored Procedure (SP) ในฐานข้อมูล (Baseline 2 ตัว)] ===
      // 1) FromDate -> ตรงกับตัวแปร @FromDate ใน SP (กำหนดขอบเขตวันที่เริ่มต้น)
      request.input('FromDate', sql.DateTime, startDate);
      // 2) ToDate -> ตรงกับตัวแปร @ToDate ใน SP (กำหนดขอบเขตวันที่สิ้นสุด)
      request.input('ToDate', sql.DateTime, endDate);

      const result = await request.execute(spName);

      let rawData = result.recordset || [];

      // ดึง SampleItemNo สำหรับรูปภาพสินค้า (Read-Only SELECT จาก OrdDT ผ่าน OrdHD โดยไม่แตะต้องหรือแก้ SP)
      const uniquePos = Array.from(new Set(rawData.map(r => r.PONo).filter(p => p && p !== 'Group PO By ShipTo')));
      const poItemMap = new Map();
      if (uniquePos.length > 0) {
        try {
          for (let i = 0; i < uniquePos.length; i += 400) {
            const batch = uniquePos.slice(i, i + 400);
            const q = pool.request();
            const inClause = batch.map((p, idx) => {
              const param = `po_${idx}`;
              q.input(param, sql.NVarChar, p);
              return `@${param}`;
            }).join(',');
            const itemRes = await q.query(`
              SELECT h.PONo, MIN(d.ItemNo) AS SampleItemNo
              FROM OrdHD h WITH (NOLOCK)
              JOIN OrdDT d WITH (NOLOCK) ON d.OrdNo = h.OrdNo
              WHERE h.PONo IN (${inClause})
              GROUP BY h.PONo
            `);
            itemRes.recordset.forEach(row => {
              if (row.PONo && row.SampleItemNo) {
                poItemMap.set(row.PONo, row.SampleItemNo);
              }
            });
          }
        } catch (err) {
          console.error('[POTracker] Could not load SampleItemNo mapping:', err.message);
        }
      }

      // === [ADDED: มัดรวม 5 แกนหลักด้วย Node.js] ===
      // 2. มัดรวมออเดอร์ที่กระจัดกระจาย โดยยึด 5 แกนหลัก + 1 วันกำหนดส่ง
      const groupedMap = new Map();

      rawData.forEach(r => {
        if (!r.SampleItemNo && poItemMap.has(r.PONo)) {
          r.SampleItemNo = poItemMap.get(r.PONo);
        }

        // สร้างกุญแจ 6 เงื่อนไข (รวม CustDueDate เพื่อป้องกันไม่ให้ข้อมูลต่างกำหนดส่งถูกรวมทับกัน)
        const key = `${r.CustCode}|${r.PONo}|${r.OrdKind}|${r.CustMultiAddr}|${r.OrdMat}|${r.CustDueDate || ''}`;

        if (!groupedMap.has(key)) {
          // ถ้ายังไม่เคยมัดรวม ให้บันทึกเป็นก้อนใหม่
          groupedMap.set(key, {
            ...r,
            OrdNos: new Set(r.OrdNo ? r.OrdNo.split('/').map(x => x.trim()) : [])
          });
        } else {
          // ถ้าเจอกุญแจซ้ำ ให้อัปเดตก้อนเดิม (ยุบรวม)
          const existing = groupedMap.get(key);

          if (r.OrdNo) {
            r.OrdNo.split('/').forEach(x => existing.OrdNos.add(x.trim()));
          }

          // รวมจำนวน Qty ต่างๆ
          const qtyFields = [
            'SumItem', 'SumQty', 'StonePenQty', 'FitPenQty', 'WijPenQty',
            'WstPenQty', 'CastPenQty', 'ControlPenQty', 'GrindPenQty',
            'PolishPenQty', 'PlatePenQty', 'QCPenQty', 'UnFinishQty',
            'FinishQty', 'ExportQty', 'BalQty', 'SumAmnt'
          ];
          qtyFields.forEach(f => {
            // ใช้ค่าผลรวมที่ถูก pre-aggregated จาก SP โดยตรง (ป้องกันการบวกเบิ้ลกรณี SP return หลาย row ซ้ำกันเพราะ DueDate ต่าง)
            existing[f] = r[f] || 0;
          });

          // คำนวณเปอร์เซ็นต์ส่งออกใหม่
          if (existing.SumQty > 0) {
            existing.ExpPct = Math.round((existing.ExportQty / existing.SumQty) * 100);
          }

          // วันที่ DueDate ให้ยึดวันที่เร็วที่สุด
          if (r.DueDate && (!existing.DueDate || new Date(r.DueDate) < new Date(existing.DueDate))) {
            existing.DueDate = r.DueDate;
          }
          if (r.CustDueDate && (!existing.CustDueDate || new Date(r.CustDueDate) < new Date(existing.CustDueDate))) {
            existing.CustDueDate = r.CustDueDate;
          }

          // ItemNo ตัวแทน (SampleItemNo): ถ้าก้อนเดิมยังไม่มี ให้ยึดของแถวใหม่
          if (!existing.SampleItemNo && r.SampleItemNo) {
            existing.SampleItemNo = r.SampleItemNo;
          }
        }
      });

      // 3. แปลงร่างกลับเป็น Array ปกติส่งให้ React (SampleItemNo ไหลผ่าน ...rest ไปให้ frontend ประกอบ URL รูปเอง)
      const data = Array.from(groupedMap.values()).map(r => {
        const { OrdNos, ItemPhoto, ...rest } = r;
        return {
          ...rest,
          OrdNo: Array.from(OrdNos).filter(Boolean).join('/ '),
        };
      });
      // === [END ADDED] ===
      setCached(cacheKey, data);
      console.log(`[EXEC SP] Done: ${data.length} rows - cached`);
      return data;
    })();

    inFlight.set(cacheKey, fetchPromise);
    try {
      const data = await fetchPromise;
      res.json({ ok: true, data, count: data.length });
    } finally {
      inFlight.delete(cacheKey);
    }

  } catch (err) {
    console.error('[API ERROR]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// === Helper to build detail filters from query params ===
function buildDetailFilters(reqQuery, sqlReq, isSinglePo = false) {
  const { dateFrom, dateTo, dateType, status, prefix } = reqQuery;
  let filters = '';

  // 1. Date Filter
  if (dateFrom && dateTo && dateType && dateType !== 'All') {
    let dateCol = 'h.OrdDate';
    if (dateType === 'Due Date') dateCol = 'h.DueDate';
    else if (dateType === 'Cust Due Date') dateCol = 'h.CustDueDate';
    else if (dateType === 'Finish Date') dateCol = 'h.FinDate';

    filters += ` AND ${dateCol} BETWEEN @dateFrom AND @dateTo`;
    sqlReq.input('dateFrom', reqQuery.dateFrom); // Note: using input with implicit type is fine for simple strings/dates, or we can use sql.DateTime
    sqlReq.input('dateTo', reqQuery.dateTo);
  }

  // 2. Prefix Filter — ให้ตรงกับ SP: _All ใช้ชุด prefix กว้างกว่า (รวม BBQ/BBK) ส่วน dateType อื่นใช้ชุดแคบ
  if (prefix && prefix !== 'ALL') {
    filters += ` AND SUBSTRING(h.OrdNo, 1, 3) = @prefix`;
    sqlReq.input('prefix', prefix);
  } else if (dateType === 'All') {
    filters += ` AND SUBSTRING(h.OrdNo, 1, 3) IN ('BBC','BBQ','BBP','BBK','BBS','BBE','BBL','BBR','BBT')`;
  } else {
    filters += ` AND SUBSTRING(h.OrdNo, 1, 3) IN ('BBC','BBS','BBE','BBL','BBR','BBT','BBP')`;
  }

  // 3. Status Filter
  const filterStatus = (status || 'PENDING').toUpperCase();
  if (filterStatus === 'PENDING') {
    filters += ` AND h.CloseStatus <> 'Y'`;
  } else if (filterStatus === 'FINISH') {
    filters += ` AND h.CloseStatus = 'Y'`;
  } else if (filterStatus === 'EXPORT') {
    filters += ` AND h.OrdStatus = 'E'`;
  }

  // 4. Default Exclusions
  filters += ` AND h.PONo NOT IN ('','TOP','Test','Testing','Stock','STOCK')`;

  if (isSinglePo) {
    filters += ` AND h.CustCode NOT IN ('N008','N044','N048','N066','N067','N068','N069','N070','N071','N072','N073','N074','N075')`;
  }

  return filters;
}

// === GET /api/orders/group/:cust/:addr/:kind/:mat/:duedate ===
router.get('/group/:cust/:addr/:kind/:mat/:duedate', async (req, res) => {
  try {
    const pool = await getPool();
    const { cust, addr, kind, mat, duedate } = req.params;
    const decodedAddr = addr === '-' ? null : decodeURIComponent(addr);
    const decodedKind = kind === '-' ? null : decodeURIComponent(kind);

    console.log(`[GET /api/orders/group] Fetching for ${cust} at ${decodedAddr}`);

    const sqlReq = pool.request()
      .input('cust', sql.NVarChar, cust)
      .input('addr', sql.NVarChar, decodedAddr)
      .input('kind', sql.NVarChar, decodedKind)
      .input('mat', sql.NVarChar, mat === '-' ? null : mat)
      .input('duedate', sql.DateTime, duedate === '-' ? null : duedate);

    let poFilter = '';
    if (req.query.po !== undefined) {
      const decodedPo = decodeURIComponent(String(req.query.po));
      if (decodedPo === 'Group PO By ShipTo') {
        poFilter = `
          AND h.PONo IN (
            SELECT PONo
            FROM OrdHD
            WHERE CustCode = h.CustCode
            GROUP BY PONo
            HAVING COUNT(OrdNo) = 1
          )
        `;
      } else {
        poFilter = ' AND ISNULL(h.PONo, \'\') = @po';
        sqlReq.input('po', sql.NVarChar, decodedPo);
      }
    }

    const extraFilters = buildDetailFilters(req.query, sqlReq, false);

    const result = await sqlReq.query(`
        SELECT
          h.OrdMaker,
          h.OrdNo, h.OrdDate, h.DueDate, h.CustDueDate, h.CustQCDate,
          h.CustCode, c.CustName, h.PONo, h.OrdMat, h.OrdStatus, h.CloseStatus, h.OrdKind,
          h.SumOrdQty AS TotalQty, h.SumOrdAmnt AS TotalAmount, h.CurrCode,
          h.CustMultiAddr, c.SalesName AS Sales,
          h.ExpInvNo, h.CenInvNo, h.ExpInvDate, h.CenInvDate, h.ExpAWBNo, h.CenAWBNo,
          d.OrdLineNo, d.ItemNo, d.ItemDesc, d.ItemMat, d.ItemSize,
          d.ItemStone, d.ItemPlate, d.ItemCust, d.ItemRemark,
          d.ItemQty, d.ItemPrice, d.ItemAmnt,
          d.SilverWeight AS ItemSilverWt, d.ItemWeight AS ItemFinishWt,
          d.FinishQty, d.FinishStatus, d.ItemStatus,
          d.StoneQty, d.FitQty, d.WijQty, d.WstQty,
          d.CastQty, d.FCastStatus, d.GrindQty, d.FGrindStatus,
          d.EpoxQty, d.FEpoxStatus, d.FilQty, d.SolQty,
          d.ControlQty, d.SetQty, d.FSetStatus,
          d.PolishQty, d.FPolishStatus, d.QPQty, d.FQPStatus,
          d.PlateQty, d.FPlateStatus, d.AssemQty, d.FAssemStatus,
          d.QCQty, d.FQCStatus, d.PackQty, d.FPackStatus,
          d.ExportQty,
          d.Recvmark, d.Enamark, d.Crysmark, d.Assemmark,
          d.Shelfmark, d.Packmark, d.Prodmark
        FROM OrdHD h
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
        WHERE h.CustCode = @cust
          AND ISNULL(h.CustMultiAddr, '') = ISNULL(@addr, '')
          AND (
            (@kind = 'Replen' AND h.OrdKind <> 'NEW') OR
            (@kind = 'New' AND h.OrdKind = 'NEW') OR
            (ISNULL(h.OrdKind, '') = ISNULL(@kind, ''))
          )
          AND ISNULL(h.OrdMat, '') = ISNULL(@mat, '')
          AND (
            (@duedate IS NULL AND h.CustDueDate IS NULL) OR
            (CAST(h.CustDueDate AS DATE) = CAST(@duedate AS DATE))
          )
          ${poFilter}
          ${extraFilters}
        ORDER BY h.OrdNo, d.OrdLineNo
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ ok: false, error: 'Group data not found' });

    // Aggregate Header — คำนวณจาก OrdDT lines จริง (ตรงกับ SP ที่ใช้ SUM(OrdDT.ItemQty))
    const first = result.recordset[0];
    const uniqueOrds = new Set();
    const uniquePOs = new Set();
    let sumQty = 0, sumAmnt = 0;
    result.recordset.forEach(r => {
      uniqueOrds.add(r.OrdNo);
      if (r.PONo) uniquePOs.add(r.PONo.trim());
      sumQty += (r.ItemQty || 0);     // ใช้ OrdDT.ItemQty (ยอด line จริง) ไม่ใช่ OrdHD.SumOrdQty
      sumAmnt += (r.ItemAmnt || 0);   // ใช้ OrdDT.ItemAmnt (ยอด line จริง) ไม่ใช่ OrdHD.SumOrdAmnt
    });

    const header = {
      PONo: req.query.po ? decodeURIComponent(req.query.po) : (uniquePOs.size > 0 ? 'Group PO By ShipTo' : ''),
      OrdNos: Array.from(uniqueOrds),
      OrdNo: first.OrdNo,
      OrdDate: first.OrdDate,
      DueDate: first.DueDate,
      CustCode: first.CustCode,
      CustName: first.CustName,
      OrdMat: first.OrdMat,
      OrdKind: first.OrdKind,
      TotalQty: sumQty,
      TotalAmount: sumAmnt,
      Destination: first.CustMultiAddr,
      Sales: first.Sales
    };

    const lines = result.recordset.map(r => {
      const p = computePendingProcessQuantities(r, false);
      return {
        OrdNo: r.OrdNo, LineNo: r.OrdLineNo, ItemNo: r.ItemNo,
        ItemDesc: r.ItemDesc, ItemMat: r.ItemMat, ItemSize: r.ItemSize,
        Stone: r.ItemStone, Plating: r.ItemPlate, CustItem: r.ItemCust,
        OrdRemark: r.ItemRemark,
        Qty: r.ItemQty, Price: r.ItemPrice, Amount: r.ItemAmnt,        SilverWt: r.ItemSilverWt, FinishWt: r.ItemFinishWt,
        FinishQty: p.FinishQty, FinishStatus: r.FinishStatus, ItemStatus: r.ItemStatus,
        OrdDate: r.OrdDate,
        DueDate: r.DueDate,
        QCDate: r.CustQCDate,
        CustDueDate: r.CustDueDate,
        Destination: r.CustMultiAddr,
        Sales: r.Sales,
        CustCode: r.CustCode, // Added
        PONo: r.PONo,
        PONo2: '', // Map this if available from DB
        InvoiceNo: r.ExpInvNo || r.CenInvNo || '',
        InvoiceDate: r.ExpInvDate || r.CenInvDate || '',
        AWB: r.ExpAWBNo || r.CenAWBNo || '',
        StoneQty: p.StoneQty, FindingQty: p.FindingQty,
        WaxQty: p.WaxQty, WaxSetQty: p.WaxSetQty,
        CastQty: p.CastQty, GrindQty: p.GrindQty,
        EpoxQty: p.EpoxQty, FilingQty: p.FilingQty, SolderQty: p.SolderQty,
        ControlQty: p.ControlQty, SetQty: p.SetQty,
        PolishQty: p.PolishQty, PQCQty: p.PQCQty,
        PlatingQty: p.PlatingQty, AssemQty: p.AssemQty,
        FQCQty: p.FQCQty, PackQty: p.PackQty,
        GroupQty: p.GroupQty, BalQty: p.BalQty, ExportQty: p.ExportQty,
        RecRemark: r.Recvmark, EnaRemark: r.Enamark,
        CryRemark: r.Crysmark, AsmRemark: r.Assemmark,
        ShfRemark: r.Shelfmark, PkRemark: r.Packmark, ProdRemark: r.Prodmark,
        GroupText: r.OrdMaker || '',
      };
    });

    res.json({ ok: true, header, lines, lineCount: lines.length, ordCount: uniqueOrds.size });
  } catch (err) {
    console.error('[API ERROR] group-detail:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// หมายเหตุ: เลิกใช้ endpoint GET /api/orders/photo/:itemNo (base64 จาก GMItemPhoto) แล้ว
// รูปเสิร์ฟจาก network path ผ่าน /api/photos/ps|cad/:itemNo (Photo Bridge ใน server.js) แทน

// === GET /api/orders/by-po/:poNo (MUST be BEFORE /:ordNo) ====================
router.get('/by-po/:poNo', async (req, res) => {
  try {
    const pool = await getPool();
    const poNo = decodeURIComponent(req.params.poNo);
    console.log('[GET /api/orders/by-po/' + poNo + ']');

    const sqlReq = pool.request().input('poNo', sql.NVarChar, poNo);
    const extraFilters = buildDetailFilters(req.query, sqlReq, true);

    const result = await sqlReq.query(`
        SELECT
          h.OrdMaker,
          h.OrdNo, h.OrdDate, h.DueDate, h.CustQCDate, h.CustDueDate,
          h.CustCode, c.CustName, c.SalesName AS Sales,
          h.PONo, h.OrdMat, h.OrdKind, h.OrdStatus, h.CloseStatus,
          h.SumOrdQty AS TotalQty, h.SumOrdAmnt AS TotalAmount, h.CurrCode,
          h.OrdWeek AS Week, h.CustMultiAddr AS Destination,
          d.OrdLineNo, d.ItemNo, d.ItemDesc, d.ItemMat, d.ItemSize,
          d.ItemStone AS Stone, d.ItemPlate AS Plating, d.ItemCust AS CustItem,
          d.ItemQty AS Qty, d.ItemPrice AS Price, d.ItemAmnt AS Amount,
          d.ItemRemark AS OrdRemark,
          d.SilverWeight AS SilverWt, d.ItemWeight AS FinishWt,
          d.FinishQty, d.FinishStatus, d.ItemStatus,
          d.StoneQty, d.FitQty AS FindingQty, d.WijQty AS WaxQty,
          d.WstQty AS WaxSetQty, d.CastQty, d.FCastStatus,
          d.GrindQty, d.FGrindStatus, d.EpoxQty, d.FEpoxStatus,
          d.FilQty AS FilingQty, d.PolishQty, d.FPolishStatus,
          d.SetQty, d.FSetStatus, d.PlateQty AS PlatingQty, d.FPlateStatus,
          d.AssemQty, d.FAssemStatus, d.QCQty AS FQCQty, d.FQCStatus,
          d.PackQty, d.FPackStatus, d.QPQty AS PQCQty, d.FQPStatus,
          d.ExportQty AS GroupQty, d.FinishQty AS BalQty,
          d.Recvmark AS RecRemark, d.Enamark AS EnaRemark,
          d.Crysmark AS CryRemark, d.Assemmark AS AsmRemark,
          d.Shelfmark AS ShfRemark, d.Packmark AS PkRemark,
          d.Prodmark AS ProdRemark
        FROM OrdHD h
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
        WHERE h.PONo = @poNo
        ${extraFilters}
        ORDER BY h.OrdNo, d.OrdLineNo
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ ok: false, error: 'PO not found' });

    // Aggregate Header — คำนวณจาก OrdDT lines จริง (ตรงกับ SP)
    const first = result.recordset[0];
    const uniqueOrds = new Set();
    let sumQty = 0, sumAmnt = 0;
    result.recordset.forEach(r => {
      uniqueOrds.add(r.OrdNo);
      sumQty += (r.Qty || 0);       // ใช้ OrdDT.ItemQty (alias Qty) ไม่ใช่ OrdHD.SumOrdQty
      sumAmnt += (r.Amount || 0);    // ใช้ OrdDT.ItemAmnt (alias Amount) ไม่ใช่ OrdHD.SumOrdAmnt
    });

    const header = {
      PONo: first.PONo, OrdNos: [...uniqueOrds], OrdNo: first.OrdNo,
      OrdDate: first.OrdDate, DueDate: first.DueDate,
      CustQCDate: first.CustQCDate, CustDueDate: first.CustDueDate,
      CustCode: first.CustCode, CustName: first.CustName,
      OrdMat: first.OrdMat, OrdKind: first.OrdKind,
      OrdStatus: first.OrdStatus, CloseStatus: first.CloseStatus,
      TotalQty: sumQty, TotalAmount: sumAmnt,
      CurrCode: first.CurrCode, Week: first.Week,
    };

    const lines = result.recordset.map(r => {
      const p = computePendingProcessQuantities(r, true);
      return {
        OrdNo: r.OrdNo, LineNo: r.OrdLineNo, ItemNo: r.ItemNo,
        ItemDesc: r.ItemDesc, ItemMat: r.ItemMat, ItemSize: r.ItemSize,
        Stone: r.Stone, Plating: r.Plating, CustItem: r.CustItem,
        OrdRemark: r.OrdRemark,
        Qty: r.Qty, Price: r.Price, Amount: r.Amount,        SilverWt: r.SilverWt, FinishWt: r.FinishWt,
        FinishQty: p.FinishQty, FinishStatus: r.FinishStatus, ItemStatus: r.ItemStatus,
        OrdDate: r.OrdDate,
        DueDate: r.DueDate,
        QCDate: r.CustQCDate,
        CustDueDate: r.CustDueDate,
        Destination: r.Destination,
        Sales: r.Sales,
        PONo: r.PONo,
        StoneQty: p.StoneQty, FindingQty: p.FindingQty,
        WaxQty: p.WaxQty, WaxSetQty: p.WaxSetQty,
        CastQty: p.CastQty, GrindQty: p.GrindQty,
        EpoxQty: p.EpoxQty, FilingQty: p.FilingQty, SolderQty: p.SolderQty,
        ControlQty: p.ControlQty, SetQty: p.SetQty,
        PolishQty: p.PolishQty, PQCQty: p.PQCQty,
        PlatingQty: p.PlatingQty, AssemQty: p.AssemQty,
        FQCQty: p.FQCQty, PackQty: p.PackQty,
        GroupQty: p.GroupQty, BalQty: p.BalQty, ExportQty: p.ExportQty,
        RecRemark: r.RecRemark, EnaRemark: r.EnaRemark,
        CryRemark: r.CryRemark, AsmRemark: r.AsmRemark,
        ShfRemark: r.ShfRemark, PkRemark: r.PkRemark, ProdRemark: r.ProdRemark,
        GroupText: r.OrdMaker || '',
      };
    });

    res.json({ ok: true, header, lines, lineCount: lines.length, ordCount: uniqueOrds.size });
  } catch (err) {
    console.error('[API ERROR] by-po:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === GET /api/orders/:ordNo ==================================================
router.get('/:ordNo', async (req, res) => {
  try {
    const pool = await getPool();
    const { ordNo } = req.params;
    console.log(`[GET /api/orders/${ordNo}] Fetching detail...`);

    // Handle "Group PO" case where ordNo is "BBC123/ BBC456"
    const ordList = ordNo.split('/').map(s => s.trim()).filter(Boolean);
    const request = pool.request();
    let whereClause = "";

    if (ordList.length > 1) {
      whereClause = `h.OrdNo IN (${ordList.map((_, i) => `@ord${i}`).join(',')})`;
      ordList.forEach((ord, i) => request.input(`ord${i}`, sql.NVarChar, ord));
    } else {
      // Single string: check OrdNo or PONo
      whereClause = `(h.OrdNo = @val OR h.PONo = @val)`;
      request.input('val', sql.NVarChar, ordList[0]);
    }

    const result = await request.query(`
        SELECT
          h.OrdMaker,
          h.OrdNo, h.OrdDate, h.DueDate, h.CustQCDate, h.CustDueDate,
          h.CustCode, c.CustName, c.SalesName AS Sales,
          h.PONo, h.OrdMat, h.OrdKind, h.OrdStatus, h.CloseStatus,
          h.SumOrdQty AS TotalQty, h.SumOrdAmnt AS TotalAmount, h.CurrCode,
          h.CustMultiAddr,
          d.OrdLineNo, d.ItemNo, d.ItemDesc, d.ItemMat, d.ItemSize,
          d.ItemStone, d.ItemPlate, d.ItemCust, d.ItemRemark,
          d.ItemQty, d.ItemPrice, d.ItemAmnt,
          d.SilverWeight AS ItemSilverWt, d.ItemWeight AS ItemFinishWt,
          d.FinishQty, d.FinishStatus, d.ItemStatus,
          d.StoneQty, d.FitQty, d.WijQty, d.WstQty,
          d.CastQty, d.FCastStatus, d.GrindQty, d.FGrindStatus,
          d.EpoxQty, d.FEpoxStatus, d.FilQty, d.SolQty,
          d.ControlQty, d.SetQty, d.FSetStatus,
          d.PolishQty, d.FPolishStatus, d.QPQty, d.FQPStatus,
          d.PlateQty, d.FPlateStatus, d.AssemQty, d.FAssemStatus,
          d.QCQty, d.FQCStatus, d.PackQty, d.FPackStatus,
          d.ExportQty,
          d.Recvmark, d.Enamark, d.Crysmark, d.Assemmark,
          d.Shelfmark, d.Packmark, d.Prodmark,
          h.ExpInvNo, h.CenInvNo, h.ExpInvDate, h.CenInvDate, h.ExpAWBNo, h.CenAWBNo
        FROM OrdHD h
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
        WHERE ${whereClause}
        ORDER BY h.OrdNo, d.OrdLineNo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    // Aggregate Header if multiple orders
    const first = result.recordset[0];

    // Sum up totals across unique orders
    const uniqueOrders = new Map();
    result.recordset.forEach(r => {
      if (!uniqueOrders.has(r.OrdNo)) {
        uniqueOrders.set(r.OrdNo, { qty: r.TotalQty || 0, amnt: r.TotalAmount || 0 });
      }
    });

    let sumTotalQty = 0;
    let sumTotalAmnt = 0;
    for (const v of uniqueOrders.values()) {
      sumTotalQty += v.qty;
      sumTotalAmnt += v.amnt;
    }

    const uniquePOs = new Set();
    result.recordset.forEach(r => {
      if (r.PONo) uniquePOs.add(r.PONo.trim());
    });

    const header = {
      OrdNo: ordList.length > 1 ? ordNo : first.OrdNo,
      OrdDate: first.OrdDate,
      DueDate: first.DueDate,
      CustCode: first.CustCode,
      CustName: first.CustName,
      PONo: ordList.length > 1 ? Array.from(uniquePOs).filter(Boolean).join(' / ') : first.PONo,
      OrdMat: first.OrdMat,
      OrdStatus: first.OrdStatus,
      CloseStatus: first.CloseStatus,
      TotalQty: sumTotalQty,
      TotalAmount: sumTotalAmnt,
      CurrCode: first.CurrCode,
    };

    const lines = result.recordset.map(r => {
      const p = computePendingProcessQuantities(r, false);
      return {
        OrdNo: r.OrdNo, LineNo: r.OrdLineNo, ItemNo: r.ItemNo,
        ItemDesc: r.ItemDesc, ItemMat: r.ItemMat, ItemSize: r.ItemSize,
        Stone: r.ItemStone, Plating: r.ItemPlate, CustItem: r.ItemCust,
        OrdRemark: r.ItemRemark,
        Qty: r.ItemQty, Price: r.ItemPrice, Amount: r.ItemAmnt,        SilverWt: r.ItemSilverWt, FinishWt: r.ItemFinishWt,
        FinishQty: p.FinishQty, FinishStatus: r.FinishStatus, ItemStatus: r.ItemStatus,
        OrdDate: r.OrdDate,
        DueDate: r.DueDate,
        QCDate: r.CustQCDate,
        CustDueDate: r.CustDueDate,
        Destination: r.CustMultiAddr,
        Sales: r.Sales,
        PONo: r.PONo,
        InvoiceNo: r.ExpInvNo || r.CenInvNo || '',
        InvoiceDate: r.ExpInvDate || r.CenInvDate || '',
        AWB: r.ExpAWBNo || r.CenAWBNo || '',
        StoneQty: p.StoneQty, FindingQty: p.FindingQty,
        WaxQty: p.WaxQty, WaxSetQty: p.WaxSetQty,
        CastQty: p.CastQty, GrindQty: p.GrindQty,
        EpoxQty: p.EpoxQty, FilingQty: p.FilingQty, SolderQty: p.SolderQty,
        ControlQty: p.ControlQty, SetQty: p.SetQty,
        PolishQty: p.PolishQty, PQCQty: p.PQCQty,
        PlatingQty: p.PlatingQty, AssemQty: p.AssemQty,
        FQCQty: p.FQCQty, PackQty: p.PackQty,
        GroupQty: p.GroupQty, BalQty: p.BalQty, ExportQty: p.ExportQty,
        RecRemark: r.Recvmark, EnaRemark: r.Enamark,
        CryRemark: r.Crysmark, AsmRemark: r.Assemmark,
        ShfRemark: r.Shelfmark, PkRemark: r.Packmark, ProdRemark: r.Prodmark,
        GroupText: r.OrdMaker || '',
      };
    });

    res.json({ ok: true, header, lines, lineCount: lines.length });
  } catch (err) {
    console.error('[API ERROR] Detail:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === POST /api/orders/remarks ====================================================
router.post('/remarks', async (req, res) => {
  try {
    const pool = await getPool();
    const { OrdNo, LineNo, RecRemark, EnaRemark, CryRemark, AsmRemark, ShfRemark, PkRemark, ProdRemark } = req.body;

    if (!OrdNo || LineNo == null) {
      return res.status(400).json({ ok: false, error: 'OrdNo and LineNo are required' });
    }

    // ─── Zero-DB Audit: Capture previous remarks to record exact Diff ─────────
    let prevRemarks = {};
    try {
      const prevCheck = await pool.request()
        .input('ordNo', sql.NVarChar, String(OrdNo))
        .input('lineNo', sql.NVarChar, String(LineNo))
        .query(`
          SELECT Recvmark, Enamark, Crysmark, Assemmark, Shelfmark, Packmark, Prodmark
          FROM OrdDT
          WHERE OrdNo = @ordNo AND OrdLineNo = @lineNo
        `);
      prevRemarks = prevCheck.recordset[0] || {};
    } catch (e) {
      // Non-blocking query failure
    }

    await pool.request()
      .input('ordNo', sql.NVarChar, String(OrdNo))
      .input('lineNo', sql.NVarChar, String(LineNo))
      .input('rec', sql.NVarChar, RecRemark || '')
      .input('ena', sql.NVarChar, EnaRemark || '')
      .input('cry', sql.NVarChar, CryRemark || '')
      .input('asm', sql.NVarChar, AsmRemark || '')
      .input('shf', sql.NVarChar, ShfRemark || '')
      .input('pck', sql.NVarChar, PkRemark || '')
      .input('prod', sql.NVarChar, ProdRemark || '')
      .query(`
        UPDATE OrdDT
        SET Recvmark = @rec,
            Enamark = @ena,
            Crysmark = @cry,
            Assemmark = @asm,
            Shelfmark = @shf,
            Packmark = @pck,
            Prodmark = @prod
        WHERE OrdNo = @ordNo AND OrdLineNo = @lineNo
      `);

    // ─── Zero-DB Audit: Log changes to local JSON storage ─────────────────────
    try {
      const changes = {};
      const fields = [
        { key: 'RecRemark', oldVal: prevRemarks.Recvmark, newVal: RecRemark },
        { key: 'EnaRemark', oldVal: prevRemarks.Enamark, newVal: EnaRemark },
        { key: 'CryRemark', oldVal: prevRemarks.Crysmark, newVal: CryRemark },
        { key: 'AsmRemark', oldVal: prevRemarks.Assemmark, newVal: AsmRemark },
        { key: 'ShfRemark', oldVal: prevRemarks.Shelfmark, newVal: ShfRemark },
        { key: 'PkRemark', oldVal: prevRemarks.Packmark, newVal: PkRemark },
        { key: 'ProdRemark', oldVal: prevRemarks.Prodmark, newVal: ProdRemark },
      ];

      for (const f of fields) {
        const o = (f.oldVal || '').trim();
        const n = (f.newVal || '').trim();
        if (o !== n) {
          changes[f.key] = { old: o, new: n };
        }
      }

      if (Object.keys(changes).length > 0) {
        const auditService = require('../services/auditService');
        auditService.logEvent({
          category: 'DATA_CHANGE',
          action: 'PO_REMARK_UPDATE',
          actor: req.user?.username || 'ANONYMOUS',
          ip: req.ip || req.headers['x-forwarded-for'],
          status: 'SUCCESS',
          severity: 'LOW',
          details: {
            ordNo: OrdNo,
            lineNo: LineNo,
            diff: changes,
          },
        });
      }
    } catch (auditErr) {
      console.error('[AuditService Warning] Failed to log remark change:', auditErr.message);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[API ERROR] Update Remarks:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
// Trigger nodemon restart
// trigger nodemon
