const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// กำหนดโครงสร้าง 17 ขั้นตอนในสายการผลิต FBE
const PRODUCTION_STEPS = [
    { prefix: 'GR', deptCode: '', en: 'Grind', th: 'ลงหิน' },
    { prefix: 'TB', deptCode: 'TB1', en: 'Tumbling 1', th: 'ร่อน 1' },
    { prefix: 'AS', deptCode: 'AS1', en: 'Assemble 1', th: 'ประกอบ 1' },
    { prefix: 'LS', deptCode: 'LS1', en: 'Laser 1', th: 'เลเซอร์ 1' },
    { prefix: 'FL', deptCode: 'FL1', en: 'Filing 1', th: 'กระดาษทราย 1' },
    { prefix: 'TB', deptCode: 'TB2', en: 'Tumbling 2', th: 'ร่อน 2' },
    { prefix: 'EP', deptCode: '', en: 'Epoxy', th: 'ทาสี' },
    { prefix: 'FL', deptCode: 'FL2', en: 'Filing 2', th: 'กระดาษทราย 2' },
    { prefix: 'LP', deptCode: '', en: 'Lapping', th: 'ตัดเหลี่ยม' },
    { prefix: 'CP', deptCode: '', en: 'Copper', th: 'ชุบทองแดง' },
    { prefix: 'PL', deptCode: 'PL1', en: 'Polish 1', th: 'ขัดเงา 1' },
    { prefix: 'AS', deptCode: 'AS2', en: 'Assemble 2', th: 'ประกอบ 2' },
    { prefix: 'LS', deptCode: 'LS2', en: 'Laser 2', th: 'เลเซอร์ 2' },
    { prefix: 'FL', deptCode: 'FL3', en: 'Filing 3', th: 'กระดาษทราย 3' },
    { prefix: 'PL', deptCode: 'PL2', en: 'Polish 2', th: 'ขัดเงา 2' },
    { prefix: 'IQ', deptCode: '', en: 'IQC', th: 'ตรวจสอบ' },
    { prefix: 'PT', deptCode: '', en: 'Plating', th: 'ชุบ' },
];

/**
 * GET /api/order-tracking/suggest
 * Query params: q (string, minimum 2 chars)
 * 100% READ-ONLY search for Order suggestions in FBE
 */
router.get('/suggest', async (req, res) => {
    const q = (req.query.q || '').trim();

    if (!q || q.length < 2) {
        return res.json({ suggestions: [] });
    }

    try {
        const pool = await getPool();
        const sqlQuery = `
          SELECT DISTINCT TOP 15
            dt.OrdNo,
            dt.OrdLineNo,
            dt.ItemNo,
            hd.CustCode,
            dt.ItemDesc,
            hd.ProFac,
            CASE WHEN hd.ProFac = 'FBD' THEN 0 ELSE 1 END AS FacRank
          FROM OrdDT dt WITH (NOLOCK)
          INNER JOIN OrdHD hd WITH (NOLOCK) ON hd.OrdNo = dt.OrdNo
          WHERE dt.OrdNo LIKE @q + '%'
            AND (hd.OrdDate >= '2024-01-01' OR dt.OrdNo = @q)
          ORDER BY 
            FacRank ASC,
            dt.OrdNo DESC, 
            dt.OrdLineNo ASC
        `;

        const request = pool.request();
        request.input('q', sql.NVarChar, q);

        const result = await request.query(sqlQuery);
        return res.json({ suggestions: result.recordset || [] });
    } catch (err) {
        console.error('Order suggestions query error:', err);
        return res.status(500).json({ error: 'Failed to fetch order suggestions' });
    }
});

/**
 * GET /api/order-tracking/track
 * Query params: ordNo (จำเป็น), ordLineNo (ถ้ามี)
 */
router.get('/track', async (req, res) => {
    const { ordNo, ordLineNo } = req.query;

    if (!ordNo || !ordNo.trim()) {
        return res.status(400).json({ error: 'Order No. is required' });
    }

    const cleanOrdNo = ordNo.trim();
    const cleanLineNo = ordLineNo ? ordLineNo.trim() : '';

    try {
        const pool = await getPool();

        // 1) ดึงข้อมูลหัวออเดอร์ (OrdHD + OrdDT)
        let ordSql = `
      SELECT 
        hd.CustCode, hd.OrdDate, hd.DueDate, hd.PONo, hd.ProFac,
        dt.ItemNo, dt.ItemMat, dt.ItemCust, dt.ItemDesc,
        dt.ItemStone, dt.ItemPlate, dt.ItemSize, dt.ItemQty,
        dt.OrdLineNo
      FROM OrdHD hd
      LEFT OUTER JOIN OrdDT dt ON dt.OrdNo = hd.OrdNo
      WHERE hd.OrdNo = @ordNo
    `;
        if (cleanLineNo) {
            ordSql += ` AND dt.OrdLineNo = @ordLineNo`;
        }

        const ordReq = pool.request();
        ordReq.input('ordNo', sql.NVarChar, cleanOrdNo);
        if (cleanLineNo) ordReq.input('ordLineNo', sql.NVarChar, cleanLineNo);

        const ordResult = await ordReq.query(ordSql);

        if (!ordResult.recordset || ordResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Order not found in system' });
        }

        const orderInfo = ordResult.recordset[0];

        // 2) วนลูปอ่านทั้ง 17 ขั้นตอน (Sen = ส่ง, Rec = รับ)
        const stepsData = [];
        const historyTimeline = [];

        for (let i = 0; i < PRODUCTION_STEPS.length; i++) {
            const step = PRODUCTION_STEPS[i];
            const pfx = step.prefix;
            const dept = step.deptCode;

            let senQty = 0, senDocuNo = '', senDocDate = null, senStatus = '';
            let recQty = 0, recDocuNo = '', recDocDate = null;

            // 2.1) ฝั่งส่งงาน {XX}SenHD / {XX}SenDT
            try {
                let senSql = `
          SELECT 
            SUBSTRING(MAX(ISNULL(CONVERT(VARCHAR(8), h.DocuDate, 112), '00000000') + ISNULL(h.DocuNo, '')), 9, 100) AS DocuNo,
            MAX(h.DocuDate) AS DocuDate,
            MAX(h.DocuStatus) AS DocuStatus,
            ISNULL(SUM(d.SenQty), 0) AS SenQty
          FROM ${pfx}SenHD h
          INNER JOIN ${pfx}SenDT d ON h.${pfx}SenID = d.${pfx}SenID
          WHERE h.ProFac = 'FBE' AND d.OrdNo = @ordNo
        `;
                if (cleanLineNo) senSql += ` AND d.OrdLineNo = @ordLineNo`;
                if (dept) senSql += ` AND h.SenDept = @deptCode`;

                const sReq = pool.request();
                sReq.input('ordNo', sql.NVarChar, cleanOrdNo);
                if (cleanLineNo) sReq.input('ordLineNo', sql.NVarChar, cleanLineNo);
                if (dept) sReq.input('deptCode', sql.NVarChar, dept);

                const sRes = await sReq.query(senSql);
                if (sRes.recordset && sRes.recordset.length > 0) {
                    const row = sRes.recordset[0];
                    senQty = Number(row.SenQty || 0);
                    senDocuNo = row.DocuNo || '';
                    senDocDate = row.DocuDate || null;
                    senStatus = row.DocuStatus || '';
                }
            } catch (err) {
                // ข้ามหากตารางไม่มี
            }

            // 2.2) ฝั่งรับงาน {XX}RecHD / {XX}RecDT
            try {
                let recSql = `
          SELECT 
            SUBSTRING(MAX(ISNULL(CONVERT(VARCHAR(8), h.DocuDate, 112), '00000000') + ISNULL(h.DocuNo, '')), 9, 100) AS DocuNo,
            MAX(h.DocuDate) AS DocuDate,
            ISNULL(SUM(d.RecQty), 0) AS RecQty
          FROM ${pfx}RecHD h
          INNER JOIN ${pfx}RecDT d ON h.${pfx}RecID = d.${pfx}RecID
          WHERE h.ProFac = 'FBE' AND d.OrdNo = @ordNo
        `;
                if (cleanLineNo) recSql += ` AND d.OrdLineNo = @ordLineNo`;
                if (dept) recSql += ` AND h.RecDept = @deptCode`;

                const rReq = pool.request();
                rReq.input('ordNo', sql.NVarChar, cleanOrdNo);
                if (cleanLineNo) rReq.input('ordLineNo', sql.NVarChar, cleanLineNo);
                if (dept) rReq.input('deptCode', sql.NVarChar, dept);

                const rRes = await rReq.query(recSql);
                if (rRes.recordset && rRes.recordset.length > 0) {
                    const row = rRes.recordset[0];
                    recQty = Number(row.RecQty || 0);
                    recDocuNo = row.DocuNo || '';
                    recDocDate = row.DocuDate || null;
                }
            } catch (err) {
                // ข้ามหากตารางไม่มี
            }

            // 2.3) กำหนดสถานะ: 2=เสร็จ (เขียว), 1=กำลังทำ (ส้ม), 0=ยังไม่เริ่ม (เทา)
            let status = 0;
            const balance = recQty - senQty;
            if (senQty > 0 || recQty > 0) {
                status = balance <= 0 ? 2 : 1;
            }

            const repDate = senDocDate || recDocDate || null;
            const docNo = senDocuNo || recDocuNo || '';

            const stepObj = {
                stepIndex: i + 1,
                prefix: step.prefix,
                deptCode: step.deptCode,
                nameEN: step.en,
                nameTH: step.th,
                status, // 0=รอ, 1=กำลังทำ, 2=เสร็จ
                recQty,
                senQty,
                balance,
                docNo,
                repDate,
            };

            stepsData.push(stepObj);

            // ถ้ามีกิจกรรม ให้เพิ่มลงในประวัติไทม์ไลน์
            if (senQty > 0 || recQty > 0) {
                historyTimeline.push(stepObj);
            }
        }
        // 3) (ไม่ต้อง sort อีกต่อไป เพราะ historyTimeline ถูก push ตามลำดับ process อยู่แล้ว)    
        historyTimeline.sort((a, b) => a.stepIndex - b.stepIndex);

        // 4) สรุปภาพรวม
        const totalSteps = stepsData.length;
        const doneSteps = stepsData.filter(s => s.status === 2).length;
        const currentSteps = stepsData.filter(s => s.status === 1);
        const inProgressStep = currentSteps.length > 0 ? currentSteps[0] : null;
        const percent = Math.round((doneSteps / totalSteps) * 100);

        return res.json({
            orderInfo,
            steps: stepsData,
            history: historyTimeline,
            summary: {
                totalSteps,
                doneSteps,
                inProgressCount: currentSteps.length,
                currentStepName: inProgressStep ? inProgressStep.nameEN : (doneSteps === totalSteps ? 'Completed' : 'Not Started'),
                percent,
            },
        });

    } catch (err) {
        console.error('Order tracking query error:', err);
        return res.status(500).json({ error: 'Failed to fetch order tracking: ' + err.message });
    }
});

module.exports = router;
