-- STATUS: PLANNED — NOT deployed in production (verified 2026-11-09). Do not run from the app team;
--         index changes are a DBA decision. See docs/dba/index-gap-and-proposal.md

/* ╔═══════════════════════════════════════════════════════════════════════════════╗
   ║        PO Tracker — Master Index Script (dbGeneration)                      ║
   ║        Target: SQL Server 2012 Enterprise, server <DB_HOST>              ║
   ╠═══════════════════════════════════════════════════════════════════════════════╣
   ║                                                                             ║
   ║  ส่วนที่ 1 ▸ ระบบเดิม (SP Indexes)         — 9 ตัว  (planned, not deployed) ║
   ║              สำหรับ PC_Show_OrdTrack_Sum_* stored procedures                 ║
   ║              ตาราง: OrdHD, OrdDT, OrdTrackDT, OrdWeekPlanHD, GMCust         ║
   ║                                                                             ║
   ║  ส่วนที่ 2 ▸ ระบบใหม่ (Web App Indexes)    — 13 ตัว (planned, not deployed)║
   ║              สำหรับ Node.js Backend Routes (query ตรงไม่ผ่าน SP)             ║
   ║              Dashboard, Search, Customer Sales, Item Summary, Order Detail   ║
   ║              ตาราง: OrdHD, OrdDT, GMCust, GMEmp, GMGoodType                 ║
   ║                                                                             ║
   ║  หมายเหตุ: ทุกตัวเป็น NONCLUSTERED COVERING, ONLINE=ON, IF NOT EXISTS       ║
   ║            สามารถรันซ้ำได้โดยไม่ error — ไม่แตะ heap/ไม่สร้าง clustered PK   ║
   ╚═══════════════════════════════════════════════════════════════════════════════╝ */

USE [dbGeneration];
GO

/* ╔═══════════════════════════════════════════════════════════════════════════════╗
   ║  ส่วนที่ 1: ระบบเดิม (SP Indexes) — planned, not deployed                   ║
   ║  สำหรับ PC_Show_OrdTrack_Sum_* stored procedures (9 indexes)                ║
   ║                                                                             ║
   ║  บริบท: หลัง restore ตาราง OrdHD/OrdDT/OrdTrackDT/OrdWeekPlanHD             ║
   ║  กลายเป็น HEAP ไม่มี index เลย (เหลือแค่ PK_GMCust) ทำให้ SP full scan      ║
   ║  บน OrdDT (755k แถว) + correlated subquery ต่อแถว = คอขวดหลัก               ║
   ║  คอลัมน์ตรวจสอบกับ schema จริงแล้ว (sys.columns) ณ 2026-07-02               ║
   ╚═══════════════════════════════════════════════════════════════════════════════╝ */

/* ---- OrdHD : date-range driving indexes (ต่อ 1 SP ต่อ 1 date column) ---- */

-- SP: _OrdDate และ _All
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_OrdDate' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_OrdDate ON dbo.OrdHD (OrdDate)
  INCLUDE (OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, DueDate, CustDueDate, CustQCDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- SP: _DueDate
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_DueDate' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_DueDate ON dbo.OrdHD (DueDate)
  INCLUDE (OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, OrdDate, CustDueDate, CustQCDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- SP: _CustDueDate
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_CustDueDate' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_CustDueDate ON dbo.OrdHD (CustDueDate)
  INCLUDE (OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, OrdDate, DueDate, CustQCDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- SP: _FinDate (กรองด้วยคอลัมน์ FinishDate)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_FinishDate' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_FinishDate ON dbo.OrdHD (FinishDate)
  INCLUDE (OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, OrdDate, DueDate, CustDueDate, CustQCDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- OrdHD : รองรับ correlated subquery MIN(OrdDate), STUFF FOR XML, และ outer join ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_Cust_PO_Kind_Mat' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_Cust_PO_Kind_Mat ON dbo.OrdHD (CustCode, PONo, OrdKind, OrdMat)
  INCLUDE (OrdNo, OrdDate, DueDate, CustDueDate, CustMultiAddr, CloseStatus)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- OrdDT (755k แถว) : covering index สำหรับ aggregate SUM ทุกขั้นตอน + MIN(ItemNo) ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdDT_OrdNo' AND object_id = OBJECT_ID('dbo.OrdDT'))
CREATE NONCLUSTERED INDEX IX_OrdDT_OrdNo ON dbo.OrdDT (OrdNo)
  INCLUDE (ItemNo, ItemQty, StoneQty, FitQty, WijQty, WstQty, CastQty, ControlQty,
           GrindQty, PolishQty, PlateQty, QCQty, FinishQty, ExportQty, ItemExchAmnt)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- OrdTrackDT (เล็ก) : join key (CustCode,PONo,OrdMat,OrdKind,CustDueDate,CustMultiAddr) ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdTrackDT_Join' AND object_id = OBJECT_ID('dbo.OrdTrackDT'))
CREATE NONCLUSTERED INDEX IX_OrdTrackDT_Join ON dbo.OrdTrackDT (CustCode, PONo, OrdMat, OrdKind, CustDueDate, CustMultiAddr)
  INCLUDE (OrdTrackID)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- OrdWeekPlanHD (เล็ก) : join OrdHD.DueDate = OrdWeekPlanHD.PlanDate ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdWeekPlanHD_PlanDate' AND object_id = OBJECT_ID('dbo.OrdWeekPlanHD'))
CREATE NONCLUSTERED INDEX IX_OrdWeekPlanHD_PlanDate ON dbo.OrdWeekPlanHD (PlanDate)
  INCLUDE (PlanYear, PlanWeek)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- GMCust : lookup ชื่อลูกค้า/เซลส์ (ใช้ในหน้า detail) ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GMCust_CustCode' AND object_id = OBJECT_ID('dbo.GMCust'))
CREATE NONCLUSTERED INDEX IX_GMCust_CustCode ON dbo.GMCust (CustCode)
  INCLUDE (CustName, SalesName, CustStatus)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

PRINT '✅ ส่วนที่ 1: ระบบเดิม (SP Indexes) — 9 indexes ensured.';
GO


/* ╔═══════════════════════════════════════════════════════════════════════════════╗
   ║  ส่วนที่ 2: ระบบใหม่ (Web App Indexes) — เพิ่ม 2026-07-16                   ║
   ║  สำหรับ Node.js Backend Routes ที่ query ตรง (ไม่ผ่าน SP) (13 indexes)      ║
   ║                                                                             ║
   ║  ครอบคลุม routes:                                                           ║
   ║    • Dashboard       (routes/dashboard.js)       — stat cards, charts       ║
   ║    • Sales Dashboard  (routes/dashboard.js)       — sales-summary           ║
   ║    • Search           (routes/search.js)          — OrdHD/OrdDT/GMCust      ║
   ║    • Customer Summary (routes/customerSummary.js) — yearly customer data    ║
   ║    • Customer Sales   (routes/customerSales.js)   — sales analytics         ║
   ║    • Item Summary     (routes/itemYearlySummary.js) — yearly item trend     ║
   ║    • Order Detail     (routes/orders.js)          — group/by-po/remarks     ║
   ║                                                                             ║
   ║  ตาราง: OrdHD, OrdDT, GMCust, GMEmp, GMGoodType                            ║
   ╚═══════════════════════════════════════════════════════════════════════════════╝ */

/* ─────────────────────────────────────────────────────────────────────────────
   DASHBOARD ROUTES (routes/dashboard.js)
   - Stat Cards, Trend, Process Distribution, Material, Top Customers,
     Delay Orders, Recent Orders, Stone/Finding, Detail Drill-down
   ────────────────────────────────────────────────────────────────────────── */

-- Dashboard: OrdHD กรองตาม OrdDate + OrdStatus + CloseStatus (query หลักของ stat cards, trend, month count)
-- ครอบคลุม: statsResult, weekResult, avgResult, monthResult, yoyResult, trendResult,
--           matResult, kindResult, recentResult + detail/:cardType monthly counts
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_OrdDate_Status' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_OrdDate_Status ON dbo.OrdHD (OrdDate, OrdStatus, CloseStatus)
  INCLUDE (OrdNo, CustCode, PONo, OrdKind, OrdMat, SumOrdQty, SumOrdAmnt, DueDate, SumOrdExchAmnt, FinishDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Dashboard: DueDate < GETDATE() กรอง Delay Orders + Overdue stat card
-- ครอบคลุม: delayResult, overdue cardType detail drill-down
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_DueDate_Status' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_DueDate_Status ON dbo.OrdHD (DueDate, OrdStatus, CloseStatus)
  INCLUDE (OrdNo, CustCode, PONo, SumOrdQty, OrdDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Dashboard: Process Distribution + Stone/Finding — OrdDT JOIN OrdHD บน OrdNo
--   กรอง OrdHD.OrdStatus + CloseStatus แล้ว join OrdDT ดู casting/grind/polish ฯลฯ
-- ครอบคลุม: procResult, sfResult (dashboard.js lines 198-363)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdDT_OrdNo_Process' AND object_id = OBJECT_ID('dbo.OrdDT'))
CREATE NONCLUSTERED INDEX IX_OrdDT_OrdNo_Process ON dbo.OrdDT (OrdNo)
  INCLUDE (CastQty, GrindQty, PolishQty, PlateQty, AssemQty, QCQty, PackQty,
           StoneQty, FitQty, FStoneStatus, FFitStatus, ItemQty)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ─────────────────────────────────────────────────────────────────────────────
   SALES DASHBOARD (routes/dashboard.js → sales-summary)
   JOIN: OrdHD → GMCust → GMEmp บน CustCode/SalesName
   ────────────────────────────────────────────────────────────────────────── */

-- Sales: GMCust lookup ด้วย CustCode — ต้องการ SalesName สำหรับ JOIN GMEmp
-- (เพิ่มจาก IX_GMCust_CustCode ที่ INCLUDE CustName,SalesName,CustStatus อยู่แล้ว — ซ้ำกัน ข้ามได้)

-- Sales: GMEmp lookup ด้วย SalesName
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GMEmp_SalesName' AND object_id = OBJECT_ID('dbo.GMEmp'))
CREATE NONCLUSTERED INDEX IX_GMEmp_SalesName ON dbo.GMEmp (SalesName)
  INCLUDE (EmpType, SalesLV)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Sales: OrdHD กรองตาม OrdDate(year) + OrdStatus + CloseStatus แล้ว SUM(SumOrdExchAmnt)
-- IX_OrdHD_OrdDate_Status ด้านบน INCLUDE SumOrdExchAmnt อยู่แล้ว — ครอบคลุม

/* ─────────────────────────────────────────────────────────────────────────────
   SEARCH (routes/search.js)
   - OrdHD: OrdNo LIKE, PONo LIKE, CustCode LIKE
   - OrdDT: ItemNo LIKE, ItemDesc LIKE
   - GMCust: CustCode LIKE, CustName LIKE
   ────────────────────────────────────────────────────────────────────────── */

-- Search: OrdHD PONo prefix search (LIKE @qPrefix)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_PONo' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_PONo ON dbo.OrdHD (PONo)
  INCLUDE (OrdNo, CustCode)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Search: OrdHD CustCode prefix search
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_CustCode' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_CustCode ON dbo.OrdHD (CustCode)
  INCLUDE (OrdNo, PONo, OrdDate, DueDate, CustDueDate, OrdMat, OrdKind, OrdStatus,
           CloseStatus, SumOrdQty, SumOrdAmnt, SumOrdExchAmnt, CustMultiAddr, CurrCode,
           OrdWeek, CustQCDate, FinishDate, SoldTo,
           ExpInvNo, CenInvNo, ExpInvDate, CenInvDate, ExpAWBNo, CenAWBNo, OrdMaker)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Search: OrdDT ItemNo prefix search + OrdNo join
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdDT_ItemNo' AND object_id = OBJECT_ID('dbo.OrdDT'))
CREATE NONCLUSTERED INDEX IX_OrdDT_ItemNo ON dbo.OrdDT (ItemNo)
  INCLUDE (OrdNo, OrdLineNo, ItemDesc, ItemMat)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Search: GMCust CustName LIKE (contains search)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GMCust_CustName' AND object_id = OBJECT_ID('dbo.GMCust'))
CREATE NONCLUSTERED INDEX IX_GMCust_CustName ON dbo.GMCust (CustName)
  INCLUDE (CustCode, CustStatus, SalesName, Country)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOMER SUMMARY / SALES ANALYSIS
   (routes/customerSummary.js, routes/customerSales.js)
   - OrdHD กรองตาม OrdDate(year,month) + CustCode + LEFT(OrdNo,3)
   - OrdDT aggregate: ItemQty, ExportQty, ItemExchAmnt, ItemAmnt, ExportAmnt
   ────────────────────────────────────────────────────────────────────────── */

-- Customer Sales: OrdDT covering for aggregate SUM(ItemQty/ExportQty/ItemExchAmnt/ItemAmnt/ExportAmnt)
-- ครอบคลุม: customerSummary top items, customerSales groups/monthly/type/orders/top-items
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdDT_OrdNo_Sales' AND object_id = OBJECT_ID('dbo.OrdDT'))
CREATE NONCLUSTERED INDEX IX_OrdDT_OrdNo_Sales ON dbo.OrdDT (OrdNo)
  INCLUDE (ItemNo, ItemDesc, ItemQty, ExportQty, ItemAmnt, ItemExchAmnt,
           ExportAmnt, ItemType, OrdLineNo, ExportDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Customer Sales: GMGoodType lookup สำหรับ item type name
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GMGoodType_Code' AND object_id = OBJECT_ID('dbo.GMGoodType'))
CREATE NONCLUSTERED INDEX IX_GMGoodType_Code ON dbo.GMGoodType (GoodTypeCode)
  INCLUDE (GoodTypeName, GoodTypeNameEng)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ─────────────────────────────────────────────────────────────────────────────
   ORDER DETAIL / GROUP / BY-PO (routes/orders.js)
   - /:ordNo     → OrdHD WHERE OrdNo = @val OR PONo = @val
   - /by-po/:po  → OrdHD WHERE PONo = @poNo
   - /group/...  → OrdHD WHERE CustCode + CustMultiAddr + OrdKind + OrdMat + CustDueDate
   - /remarks    → OrdDT UPDATE WHERE OrdNo + OrdLineNo
   ────────────────────────────────────────────────────────────────────────── */

-- Order Detail: OrdHD lookup by PONo → IX_OrdHD_PONo ด้านบนครอบคลุมแล้ว
-- Order Detail: OrdHD.CustCode+CustMultiAddr+OrdKind+OrdMat+CustDueDate (group endpoint)
-- IX_OrdHD_Cust_PO_Kind_Mat ที่มีอยู่ (SP section) ครอบคลุมบางส่วน
-- เพิ่ม index สำหรับ group endpoint ที่ filter CustCode+CustMultiAddr+OrdMat+CustDueDate
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_Group' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_Group ON dbo.OrdHD (CustCode, CustMultiAddr, OrdMat, CustDueDate)
  INCLUDE (OrdNo, PONo, OrdKind, OrdDate, DueDate, OrdStatus, CloseStatus,
           SumOrdQty, SumOrdAmnt, CurrCode, CustQCDate, OrdMaker,
           ExpInvNo, CenInvNo, ExpInvDate, CenInvDate, ExpAWBNo, CenAWBNo)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Order Detail: OrdDT covering for detail lines (all qty/status fields)
-- IX_OrdDT_OrdNo (SP section) covers aggregate qty fields
-- เพิ่ม index ที่ INCLUDE detail fields ครบสำหรับ detail endpoint
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdDT_OrdNo_Detail' AND object_id = OBJECT_ID('dbo.OrdDT'))
CREATE NONCLUSTERED INDEX IX_OrdDT_OrdNo_Detail ON dbo.OrdDT (OrdNo, OrdLineNo)
  INCLUDE (ItemNo, ItemDesc, ItemMat, ItemSize, ItemStone, ItemPlate, ItemCust, ItemRemark,
           ItemQty, ItemPrice, ItemAmnt, SilverWeight, ItemWeight,
           FinishQty, FinishStatus, ItemStatus,
           StoneQty, FitQty, WijQty, WstQty, CastQty, FCastStatus,
           GrindQty, FGrindStatus, EpoxQty, FEpoxStatus, FilQty, SolQty,
           ControlQty, SetQty, FSetStatus, PolishQty, FPolishStatus,
           QPQty, FQPStatus, PlateQty, FPlateStatus,
           AssemQty, FAssemStatus, QCQty, FQCStatus, PackQty, FPackStatus,
           ExportQty, Recvmark, Enamark, Crysmark, Assemmark,
           Shelfmark, Packmark, Prodmark)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Remarks UPDATE: OrdDT(OrdNo, OrdLineNo) → IX_OrdDT_OrdNo_Detail ด้านบนครอบคลุมแล้ว

/* ─────────────────────────────────────────────────────────────────────────────
   ITEM YEARLY SUMMARY (routes/itemYearlySummary.js)
   - OrdDT JOIN OrdHD ON OrdNo, filter YEAR(OrdDate), GROUP BY ItemNo+Year
   ────────────────────────────────────────────────────────────────────────── */
-- IX_OrdDT_ItemNo + IX_OrdDT_OrdNo_Sales ด้านบนครอบคลุมแล้ว
-- IX_OrdHD_OrdDate_Status ด้านบนครอบคลุม OrdDate filter

PRINT '✅ ส่วนที่ 2: ระบบใหม่ (Web App Indexes) — 13 indexes ensured.';
GO

PRINT '';
PRINT '════════════════════════════════════════════════════════════';
PRINT '  ✅ ทั้งหมดเสร็จสิ้น: 9 (SP) + 13 (Web App) = 22 indexes';
PRINT '════════════════════════════════════════════════════════════';
GO
