# SQL — Stored Procedures & Indexes (dbGeneration)

SSOT ของ Stored Procedures และ Index ที่ระบบ PO Tracker ใช้ เก็บไว้ใน repo เพื่อกัน "หายตอน restore"
(ก่อนหน้านี้ SP/Index อยู่แต่บนเซิร์ฟเวอร์ พอ restore database ทีก็หายหมด ต้องมานั่งสร้างใหม่)

Target: **SQL Server 2012 Enterprise** · DB `dbGeneration` · server `<DB_HOST>`

> [!IMPORTANT]
> **สถานะจริงบน Database ปัจจุบัน (อัปเดต 2026-10-08)**
> - ✅ **Index 22 ตัว (`indexes.sql`) และ View `VW_Web_SalesDashboard`** — สร้างแล้วและ **ใช้งานอยู่จริง**
> - ❌ **Stored Procedures `PC_Show_OrdTrack_Sum_*`** — **ไม่ได้ใช้เวอร์ชันที่แก้** เพราะทำให้ระบบ VB.NET เดิมพัง → บน DB เป็น SP ตัวเดิม (Baseline รับ 2 params: `@FromDate`, `@ToDate`) และ backend ส่งแค่ 2 params นี้
> - ไฟล์ใน `stored-procedures/` เป็น **แบบร่างที่ยกเลิกแล้ว ห้ามนำไปรัน** — ส่วนที่พูดถึงการแก้ SP ด้านล่างเก็บไว้เป็นประวัติเท่านั้น
> - **นโยบายปัจจุบัน: ไม่แตะ DB 100%** — ห้ามสร้าง/ลบ/แก้ Index, View, SP, Table เพิ่มเติม

## โครงสร้าง

```
sql/
├── ERP_DATA_MAPPING_AND_LOGIC.md   # คู่มืออธิบายฟิลด์ที่กรอกใน ERP และ Business Logic ทั้งหมด
├── indexes.sql                     # 22 covering indexes (9 SP + 13 Web App)
├── views/                          # Database Views สำหรับระบบเว็บ (SSOT)
│   └── VW_Web_SalesDashboard.sql   # Central View สำหรับ Customer Dashboard, Matrix & Order Trends
├── stored-procedures/              # ❌ แบบร่าง SP ที่ยกเลิก (ไม่ได้ใช้บน DB) — ห้ามรัน
│   ├── PC_Show_OrdTrack_Sum_OrdDate.sql      # @FromDate/@ToDate/@Status · 63 cols
│   ├── PC_Show_OrdTrack_Sum_DueDate.sql      # @FromDate/@ToDate/@Status · 63 cols
│   ├── PC_Show_OrdTrack_Sum_CustDueDate.sql  # @FromDate/@ToDate/@Status · 63 cols
│   ├── PC_Show_OrdTrack_Sum_FinDate.sql      # @FromDate/@ToDate/@Status · 63 cols (กรอง FinishDate)
│   └── PC_Show_OrdTrack_Sum_All.sql          # @FromDate/@ToDate/@Status · 63 cols (ไม่มี UNION, ตัด dead view join)
└── _baseline/                      # snapshot ของเดิม (ก่อนแก้) ไว้ rollback + อ้างอิง
    ├── PC_Show_OrdTrack_Sum_*.sql  # definition เดิม (ยังมี GMItemPhoto/ItemPhoto)
    ├── _columns.json               # รายชื่อคอลัมน์จริงของ 6 ตารางหลัก
    └── _indexes_snapshot.json      # index ที่มีอยู่ ณ ตอน dump (มีแค่ PK_GMCust)
```

## Indexes Reference (indexes.sql)

### ส่วนที่ 1: ระบบเดิม (SP Indexes) — 9 ตัว (สร้างแล้ว 2026-07-02)

สำหรับ `PC_Show_OrdTrack_Sum_*` stored procedures ที่เป็น HEAP หลัง restore

| # | Index Name | Table | วัตถุประสงค์ |
|---|-----------|-------|-------------|
| 1 | `IX_OrdHD_OrdDate` | OrdHD | SP: _OrdDate, _All — กรอง date range |
| 2 | `IX_OrdHD_DueDate` | OrdHD | SP: _DueDate — กรอง DueDate range |
| 3 | `IX_OrdHD_CustDueDate` | OrdHD | SP: _CustDueDate — กรอง CustDueDate range |
| 4 | `IX_OrdHD_FinishDate` | OrdHD | SP: _FinDate — กรอง FinishDate range |
| 5 | `IX_OrdHD_Cust_PO_Kind_Mat` | OrdHD | correlated subquery MIN(OrdDate), STUFF FOR XML |
| 6 | `IX_OrdDT_OrdNo` | OrdDT | aggregate SUM ทุกขั้นตอน + MIN(ItemNo) |
| 7 | `IX_OrdTrackDT_Join` | OrdTrackDT | join key 6 คอลัมน์ |
| 8 | `IX_OrdWeekPlanHD_PlanDate` | OrdWeekPlanHD | join DueDate = PlanDate |
| 9 | `IX_GMCust_CustCode` | GMCust | lookup ชื่อลูกค้า/เซลส์ |

### ส่วนที่ 2: ระบบใหม่ (Web App Indexes) — 13 ตัว (เพิ่ม 2026-07-16)

สำหรับ Node.js Backend Routes ที่ query ตรง (ไม่ผ่าน SP)

| # | Index Name | Table | Route ที่ใช้ | วัตถุประสงค์ |
|---|-----------|-------|-----------|-------------|
| 10 | `IX_OrdHD_OrdDate_Status` | OrdHD | productionDashboard.js | stat cards, trend, month count, YOY |
| 11 | `IX_OrdHD_DueDate_Status` | OrdHD | productionDashboard.js | delay orders, overdue drill-down |
| 12 | `IX_OrdDT_OrdNo_Process` | OrdDT | productionDashboard.js | process distribution, stone/finding |
| 13 | `IX_GMEmp_SalesName` | GMEmp | productionDashboard.js | sales summary JOIN |
| 14 | `IX_OrdHD_PONo` | OrdHD | search.js, poTrackerAdvanced.js | PONo prefix search, by-po lookup |
| 15 | `IX_OrdHD_CustCode` | OrdHD | search.js, poTrackerAdvanced.js, orderVolumeSummary.js | CustCode lookup (wide covering) |
| 16 | `IX_OrdDT_ItemNo` | OrdDT | search.js, topOrdersGallery.js | ItemNo prefix search |
| 17 | `IX_GMCust_CustName` | GMCust | search.js | CustName contains search |
| 18 | `IX_OrdDT_OrdNo_Sales` | OrdDT | customerSummary.js, orderVolumeSummary.js | SUM(ItemQty/ExportQty/Amnt) |
| 19 | `IX_GMGoodType_Code` | GMGoodType | orderVolumeSummary.js | item type name lookup |
| 20 | `IX_OrdHD_Group` | OrdHD | poTrackerAdvanced.js | group endpoint filter (CustCode+Addr+Mat+DueDate) |
| 21 | `IX_OrdDT_OrdNo_Detail` | OrdDT | poTrackerAdvanced.js | detail lines ครบทุก qty/status field |
| 22 | *(covered by above)* | — | topOrdersGallery.js | ใช้ #10+#16+#18 ร่วมกัน |

## การเปลี่ยนแปลงหลัก (2026-07-02)

### 1. ตัดรูป base64 ออกจาก SP → ประสิทธิภาพ — ❌ ยกเลิก (SP บน DB เป็นตัวเดิม)
เดิมทุก SP `LEFT JOIN GMItemPhoto` แล้ว `MAX(CAST(ItemPhoto AS VARBINARY(MAX)))` ในทุก aggregate CTE
และ outer query ยัง `GROUP BY` ด้วยก้อน blob อีกชั้น → คอขวด
- ลบ join รูปทั้งหมด แล้วส่ง **`SampleItemNo` = `MIN(OrdDT.ItemNo)`** (ItemNo ตัวแทน 1 ค่า/กลุ่ม) แทน
- Frontend เอา `SampleItemNo`/`ItemNo` ไปประกอบ URL รูปจาก network path (`/api/photos/ps|cad/:itemNo`)
- ยืนยันแล้วว่า `GMItemPhoto` เป็น 1:1 กับ ItemNo → ผลรวม (SumQty/SumItem/SumAmnt) **ไม่เปลี่ยน** (row count เท่าเดิมเป๊ะ)

### 2. สร้าง Index ส่วนที่ 1 (จากที่หายหมดเหลือแค่ PK_GMCust)
ตาราง OrdHD (176k), OrdDT (755k), OrdTrackDT, OrdWeekPlanHD เป็น HEAP ไม่มี index เลย → SP full scan
- `indexes.sql` สร้าง 9 covering index (NONCLUSTERED, `ONLINE=ON` ไม่ล็อกตาราง, `DATA_COMPRESSION=PAGE`)
- **ไม่** สร้าง clustered PK / ไม่แตะ heap (ลดความเสี่ยงต่อระบบ VB.net เดิมที่ใช้ DB ร่วมกัน)
- ไม่สร้าง index บน GMItemPhoto เพราะระบบเลิก join ตารางนี้แล้ว

### 3. เพิ่ม Index ส่วนที่ 2 (2026-07-16) — สำหรับระบบเว็บใหม่
เพิ่ม 13 covering index สำหรับ query ที่ Node.js backend routes ใช้โดยตรง (ไม่ผ่าน SP):
- **Dashboard**: stat cards, trend, process distribution, delay orders, sales summary
- **Search**: OrdHD (OrdNo/PONo/CustCode), OrdDT (ItemNo), GMCust (CustName)
- **Customer Summary/Sales**: aggregate SUM บน OrdDT, GMGoodType lookup, GMEmp join
- **Order Detail/Group/By-PO**: group endpoint composite filter, detail covering ครบ
- **Item Yearly Summary**: ใช้ index จาก Search + Customer Sales ร่วมกัน


### 4. ซ่อม `_All` ที่พังอยู่เดิม — ❌ ยกเลิก (ไม่ได้แก้บน DB)
`_All` เดิม `LEFT JOIN VPC_OrdSum_Detail` ซึ่งเป็น view ที่ binding error (อ้างตาราง MasterFileProduct/Item_Head
ที่หายหลัง restore) ทำให้ ALTER/รันไม่ได้ — view ถูก join แบบ LEFT แต่ไม่มีคอลัมน์ใดถูก SELECT (dead join, no-op
ต่อผลลัพธ์เพราะ GROUP BY ยุบ row ซ้ำ) จึงลบทิ้ง → `_All` กลับมาใช้งานได้

## ❌ [ยกเลิก — ทำให้ระบบ VB.NET พัง] การเปลี่ยนแปลง (2026-07-04) — เติมคอลัมน์ + @Status ครบทุกตัว

> ส่วนนี้เก็บไว้เป็นประวัติเท่านั้น — SP บน DB ไม่มี `@Status` และการกรองสถานะทำใน Node.js/React แทน

ทั้ง 5 SP ตอนนี้คืน **63 คอลัมน์เท่ากัน** (เดิม `_OrdDate`=60, `_All`=57, `_Due/_CustDue/_Fin`=62) และรับ `@Status` ครบ
ทุกการเปลี่ยนเป็นแบบ **"เพิ่ม" อย่างเดียว ไม่ลบ/ไม่แก้ logic เดิม** และ **behavior-preserving สำหรับ `@Status='pending'`**
(นิพจน์ที่ใส่ยุบกลับเป็น `CloseStatus <> 'Y'` เดิมเป๊ะเมื่อ pending) — ทดสอบด้วยการรัน body แบบ read-only เข้า DB จริง
ผ่านครบทั้ง 3 โหมด (pending/finish/All) ทุกไฟล์

| SP | `@Status` param+filter | `EXNo` (PO2) | `BookShip` | `CloseStatus` | `ExportQty/BalQty/ExpPct` |
|----|:---:|:---:|:---:|:---:|:---:|
| `_OrdDate`     | มีอยู่แล้ว | **+เพิ่ม** | **+เพิ่ม** | **+เพิ่ม** | มีอยู่แล้ว |
| `_DueDate`     | **+เพิ่ม** | มีอยู่แล้ว | มีอยู่แล้ว | **+เพิ่ม** | มีอยู่แล้ว |
| `_CustDueDate` | **+เพิ่ม** | มีอยู่แล้ว | มีอยู่แล้ว | **+เพิ่ม** | มีอยู่แล้ว |
| `_FinDate`     | **+เพิ่ม** | มีอยู่แล้ว | มีอยู่แล้ว | **+เพิ่ม** | มีอยู่แล้ว |
| `_All`         | **+เพิ่ม** | **+เพิ่ม** | **+เพิ่ม** | **+เพิ่ม** | **+เพิ่ม** |

รายละเอียดการออกแบบ:
- **`EXNo` (PO2)** — เพิ่มเป็น correlated subquery `(SELECT TOP 1 T2.EXNo ...)` วางหลัง `CustCode, PONo` (ลอก pattern จาก `_DueDate` ที่มีอยู่แล้ว) → **ไม่ต้องใส่ GROUP BY** จึงไม่กระทบ granularity ของกลุ่ม N008
- **`CloseStatus`** — เพิ่มเป็น `MIN(OrdHD.CloseStatus) AS CloseStatus` (aggregate, **ไม่อยู่ใน GROUP BY**) → ไม่แตกแถว N008 ที่รวมหลายออเดอร์. ความหมาย: MIN = "เปิดอยู่ถ้ามีออเดอร์ใดในกลุ่มยังไม่ปิด" (frontend ใช้ทำไฮไลต์แดง 'เลยกำหนด Due')
- **`BookShip`** — เพิ่ม `OrdTrackDT.BookShip`/`CTE_Track.BookShip` หลัง `BookDate` ทั้ง SELECT+GROUP BY (granularity เท่า BookDate เดิม)
- **`@Status`** — 4 ตัวที่ยังไม่มี: เพิ่ม param `@Status Varchar(20) = 'pending'` + ห่อตัวกรอง `CloseStatus <> 'Y'` เดิมทุกจุดด้วยนิพจน์ 3 ทาง
- **`_All`** — เพิ่ม `ExportQty/BalQty/ExpPct` ในทั้ง CTE + outer SELECT + GROUP BY. ⚠️ พฤติกรรม default เปลี่ยน: เดิม `_All` ไม่กรอง status (คืนทุกอย่าง) → ตอนนี้ default `@Status='pending'` (สอดคล้องกับ dateType อื่น; เลือก status='All' เพื่อคืนทุกอย่างเหมือนเดิม)
- **Idempotent header** — ทุกไฟล์ใช้ pattern `IF OBJECT_ID(...) IS NULL EXEC('CREATE ... stub'); GO; ALTER PROCEDURE ...` → rerun ซ้ำได้ ไม่ error (SQL 2012 ไม่มี `CREATE OR ALTER`); ซ่อม `_All` ที่เดิมเป็น `ALTER` เดี่ยว (พังถ้า proc ไม่มี)

> ⚠️ **finish/All mode เป็นเส้นทางใหม่ที่ควร verify กับระบบเก่า**: pending (default) preserve พฤติกรรมเดิม 100% แต่
> finish/All บน `_DueDate/_CustDueDate/_FinDate` ยังคง filter `TrackStatus <> 'Y'` ใน CTE_Track ไว้ตามเดิม
> (ออเดอร์ที่ปิดแล้วอาจมี track fields ว่างในกลุ่ม N008) — แนะนำเทียบผลกับ VB.net เดิมก่อนใช้จริง

## Database Views (SSOT สำหรับ Sales & Customer Analytics)

### `dbo.VW_Web_SalesDashboard` (`sql/views/VW_Web_SalesDashboard.sql`)
View กลางตัวเดียว (Single Source of Truth) ที่เชื่อมโยงและคำนวณยอดขาย/จำนวนชิ้นของ 3 โมดูลหลักบน Web Application:
1. **Customer Dashboard (Chart)** (`/dashboard/customer`) — กราฟแนวโน้ม และ KPI การเติบโต YoY
2. **Customer Matrix Report** (`/dashboard/customer/matrix`) — ตาราง Matrix รายเดือนและรายปี
3. **Order Trends** (`/dashboard/customer/trends`) — การวิเคราะห์แนวโน้มออเดอร์ แยก Sales ($) / Qty (PCS) และ Order Details Drilldown

#### 📌 Business Logic & Data Filtering (ตรงตามรายงาน "Yearly Sales Summary By Customer" จริง 100%):
1. **สถานะบิล:** กรองเฉพาะ `ISNULL(OrdStatus, '') <> 'C'` (ตัดบิลยกเลิก)
2. **สถานะลูกค้า:** กรองเฉพาะ `ISNULL(CustStatus, 'Y') = 'Y'` (เฉพาะลูกค้าที่ Active)
3. **Prefix บิล:** กรอง `SUBSTRING(OrdNo, 1, 3) NOT IN ('BBL', 'BBD', 'BBK', 'BBT', 'BBP')` (ตัดบิลสั่งผลิตเฉพาะกิจ / กึ่งสำเร็จรูป / งานภายใน ออกตามมาตรฐานรายงานยอดขาย Finished Goods ของบริษัท)
4. **มาตรฐานยอดเงิน ($ USD):** ใช้ `ISNULL(DT.ItemExchAmnt, DT.ItemAmnt)` เพื่อแปลงสกุลเงินต่างประเทศ (EUR/GBP/etc.) เป็น USD ตามอัตราแลกเปลี่ยนจริง ทำให้ยอดของลูกค้านอก (เช่น U319) ตรงกับรายงานการเงินของบริษัท 100%
5. **Product Type Classification:**
   - `BBS`: Bracelet / Bangle
   - `BES`: Earring
   - `BNS`: Necklace
   - `BRS`: Ring
   - `Others`: สินค้าประเภทอื่นๆ

#### 🎯 ผลการทดสอบความถูกต้อง (Benchmark เทียบรายงาน 2025):
- **N044:** ยอดตรงเป๊ะ 100%
- **N051:** ยอดตรงเป๊ะ 100%
- **N066:** ยอดตรงเป๊ะ 100%
- **U319:** ยอดตรงเป๊ะตาม Exchange Rate
- **N083:** ยอดตรงเป๊ะ 100%

---

## การใช้ไฟล์ในโฟลเดอร์นี้

- `indexes.sql` และ `views/VW_Web_SalesDashboard.sql` — **สร้างบน DB แล้ว** เก็บไว้เป็น SSOT สำหรับกรณี DB ถูก restore แล้วหาย (ให้ผู้ดูแลระบบเป็นคนตัดสินใจรันเท่านั้น — AI ห้ามรันเอง)
- `stored-procedures/` — ❌ **ห้ามรัน** (เคยทดลองแล้วทำให้ระบบ VB.NET เดิมพัง)
- `_baseline/` — definition SP ตัวเดิม = สิ่งที่อยู่บน DB จริงตอนนี้ ใช้อ้างอิงคอลัมน์ที่ SP คืนมา
