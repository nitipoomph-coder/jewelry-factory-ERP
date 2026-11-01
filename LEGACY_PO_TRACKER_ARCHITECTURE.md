# PO Tracker & Order Detail — Legacy System Architecture & Data Flow Guide
> **คู่มือสถาปัตยกรรมและการไหลของข้อมูลระบบเดิม (VB.NET PCC Management System ↔ Modern Web ERP)**
> **สถานะเอกสาร:** Single Source of Truth (SSOT) สำหรับการพัฒนาหน้า **PO Tracker (Summary)** และ **Order Detail (Line/Packaging)**
> **อ้างอิงจากโค้ดจริง:** `PC_Face_OrdTrack_Sum.vb`, `PC_Face_OrdTrack_Pack.vb`, `PC_Face_OrdTrack_Pack_Cust.vb`

---

## 1. Executive Summary & ภาพรวมระบบ

ระบบเดิมของโรงงาน (PCC Management System) พัฒนาด้วย **VB.NET (Windows Forms)** เชื่อมต่อกับ **Microsoft SQL Server (ฐานข้อมูล `dbGeneration` บนโฮสต์ `<DB_SERVER>`)**

ในส่วนการติดตามคำสั่งซื้อและการผลิต มี 2 หน้าจอหลักที่ทำงานสอดประสานกัน:
1. **`PC_Face_OrdTrack_Sum` (PO Tracker - Summary):**
   - จอระดับบนสุด (Level 1 — High-Level Overview)
   - รวมข้อมูลระดับ **PO / Group**
   - มีระบบเลือกดูตามกลุ่มลูกค้า (Customer Group Presets: N008, N044, MLT, N051, N098, N083, General)
   - ปัจจุบันถูก Modernize มาเป็นหน้า **`POTrackerAdvanced.tsx`** และ **`OrderTable.tsx`**

2. **`PC_Face_OrdTrack_Pack` / `PC_Face_OrdSum_PO` (Order Tracker - Detail / Packaging):**
   - จอระดับแถวสินค้า (Level 2 — Line Item / SKU Level Detail)
   - ในระบบเก่าเปิดขึ้นมาเมื่อ **Double Click แถวใดแถวหนึ่งในหน้า Summary** หรือเลือกดูสถานะ Packaging Checklist โดยตรง
   - ปัจจุบันถูก Modernize มาเป็นหน้า **`OrderDetailPage.tsx`**, **`OrderLineTable.tsx`**, และ **`LineDetailDrawer.tsx`**

---

## 2. โครงสร้างฐานข้อมูล & Data Model ในระบบเดิม

ระบบเก็บข้อมูลแยกเป็น 3 ชั้น:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Core ERP Tables                               │
│  - OrdHD: ข้อมูลหัวบิล Order (OrdNo, CustCode, PONo, EXNo, DueDate)     │
│  - OrdDT: รายการสินค้าแต่ละ Line (OrdLineNo, ItemNo, ItemQty, ItemPrice) │
│  - GMCust: ข้อมูลลูกค้า (CustCode, CustName, SalesName)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────┴────────────────────────────────────┐
│                    User-Tracked Operational Tables                     │
│  - OrdTrackDT: ตารางที่ฝ่ายผลิต/จัดซื้อ "คีย์ข้อมูลติดตามเอง" ระดับ PO    │
│    (บันทึก TrackTest, SGS, OOR, BookDate, QC1-3, Pack Checklist, Remarks)│
│  - OrdTrack: ตารางที่บันทึก Packaging Checklist ระดับ Item/Line        │
│    (Card, Box, Pouch, Booklet, Sticker, Polybag, Security Tag, Scan)   │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 ตาราง `OrdTrackDT` (ตารางหัวใจของคอลัมน์ User-Input)
ในระบบเก่า เมื่อผู้ใช้เปิดหน้า `PC_Face_OrdTrack_Sum` แล้วกรอกข้อมูลในช่องติดตามงาน เช่น วันตรวจ QC, วัน Booking, สถานะการจัด Card/Box, วันส่ง Pack Scan แล้วกดปุ่ม **Save** (`btnSave_Click`):
ระบบจะสั่ง **`INSERT INTO OrdTrackDT`** หรือ **`UPDATE OrdTrackDT`** โดยใช้ Key 6 ตัว:
```sql
WHERE CustCode = @CustCode
  AND PONo = @PONo
  AND OrdKind = @OrdKind      -- 'NEW' หรือ 'REP'
  AND OrdMat = @OrdMat
  AND CustMultiAddr = @CustMultiAddr
  AND CustDueDate = @CustDueDate
```
> 💡 **ข้อค้นพบสำคัญมาก:** คอลัมน์กว่า 25 คอลัมน์ที่ในเว็บแสดงเป็นสีอำพัน (User Input) ไม่ใช่ข้อมูลที่คำนวณจากสูตรผลิต แต่คือข้อมูลที่ผู้ใช้งานบันทึกเก็บไว้ในตาราง `OrdTrackDT`!
> Stored Procedures `PC_Show_OrdTrack_Sum_*` จะทำการ `LEFT JOIN OrdTrackDT` เข้ามาแสดงร่วมกับยอด SUM ของ `OrdHD`/`OrdDT`

### 2.2 ตาราง `OrdTrack` (ตาราง Packaging Line Checklist)
ในหน้า `PC_Face_OrdTrack_Pack` ระบบเก่าจะมีปุ่ม **Reload** ซึ่งจะรัน SP ตระกูล `PC_Gen_OrdTrack_*` เพื่อดึงข้อมูลจาก `OrdHD`/`OrdDT` มา Generate แถวลงตาราง `OrdTrack` จากนั้นเมื่อผู้ใช้ตรวจรับ Ticket, Card, Box, Sticker, Polybag จะทำการกรอกสถานะ `OK` หรือระบุ ETA เข้า แล้วกดปุ่ม **Save** เพื่ออัปเดตกลับไปที่ตาราง `OrdTrack`

---

## 3. กลไกการเชื่อมโยงข้อมูล: จาก Summary สู่ Detail (5-Axis + 1 DueDate)

หลักฐานชัดเจนจากโค้ดเดิม `PC_Face_OrdTrack_Sum.vb` (เหตุการณ์ `dgvOrdItemSum_CellMouseDoubleClick`):

```vb
' เมื่อ Double Click ที่คอลัมน์ OrdWeek, CustCode หรือ PONo
PCOrdSumCust = .Rows.Item(e.RowIndex).Cells("CustCode").Value.ToString
PCOrdSumPO = .Rows.Item(e.RowIndex).Cells("PONo").Value.ToString
PCOrdSumKind = .Rows.Item(e.RowIndex).Cells("OrdKind").Value.ToString
PCOrdSumMat = .Rows.Item(e.RowIndex).Cells("OrdMat").Value.ToString
PCOrdSumMultiAddr = .Rows.Item(e.RowIndex).Cells("CustMultiAddr").Value.ToString

If IsDate(.Rows.Item(e.RowIndex).Cells("CustDueDate").Value) Then
    PCOrdSumDueDate = CDate(.Rows.Item(e.RowIndex).Cells("CustDueDate").Value)
Else
    PCOrdSumDueDate = Nothing
End If

PC_Face_OrdSum_PO.ShowDialog()  ' เปิดหน้าต่าง Detail ประจำกลุ่ม
```

### การ Map เข้ากับ Modern Web Architecture
การจัดกลุ่มของเว็บทั้งใน Backend (`backend/routes/poTracker.js`) และ Frontend (`OrderTable.tsx`) ยึดตามกลไกนี้ 100%:
1. **ในหน้า Summary (`POTrackerAdvanced.tsx`):** รวมข้อมูลที่แตกกระจายจาก SP เข้าด้วยกันด้วย 6 แกน:
   `CustCode | PONo | OrdKind | CustMultiAddr | OrdMat | CustDueDate`
2. **เมื่อคลิกแถวใน `OrderTable.tsx`:** ระบบจะ Navigate ไปยัง:
   ```
   /po-tracker/group/:cust/:addr/:kind/:mat/:duedate?po=:poNo&view=:view
   ```
3. **ในหน้า Detail (`OrderDetailPage.tsx`):** Backend endpoint `GET /api/orders/group/:cust/:addr/:kind/:mat/:duedate` จะทำการ Query เจาะจงด้วยเงื่อนไขทั้ง 6 ตัวนี้โดยตรงจาก `OrdHD JOIN OrdDT JOIN GMCust` เพื่อนำรายการ Line Items ออกมาแสดง

---

## 4. Stored Procedures และการดึงข้อมูล

### 4.1 จอ Summary (PO Tracker List)
ดึงผ่าน Stored Procedures 5 ตัวหลักตามเงื่อนไขวันที่ที่เลือก:
- `dbo.PC_Show_OrdTrack_Sum_OrdDate` — เลือกตาม Order Date
- `dbo.PC_Show_OrdTrack_Sum_DueDate` — เลือกตาม Factory Due Date
- `dbo.PC_Show_OrdTrack_Sum_CustDueDate` — เลือกตาม Customer Due Date
- `dbo.PC_Show_OrdTrack_Sum_FinDate` — เลือกตาม Finish Date
- `dbo.PC_Show_OrdTrack_Sum_All` — เลือกทุกช่วงวันที่

#### 🛑 กฎเหล็กด้าน Parameters (CRITICAL):
- ทุก SP รับเพียง **2 Parameters** เท่านั้น: `@FromDate` (datetime), `@ToDate` (datetime)
- **ห้ามส่ง `@Status` เด็ดขาด** เพราะ SP ถูกใช้ร่วมกับโปรแกรม VB.NET เก่า ถ้าแก้ signature ระบบเดิมของโรงงานจะ Crash ทันที (Parameter Count Mismatch)
- การกรองสถานะ `Pending`, `Finish`, `All` ต้องทำใน Memory (Node.js หรือ React) เท่านั้น

### 4.2 จอ Detail (Line Items)
- ไม่ได้ใช้ SP สรุปผล แต่เป็นการ Query ตรงจาก `OrdHD h LEFT JOIN GMCust c ON c.CustCode = h.CustCode LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo`
- คำนวณยอดค้างกระบวนการผลิต (Stage Delta) ระดับ Line Item ใน Backend Node.js ด้วยสูตรเดียวกับ SP

---

## 5. การแบ่งกลุ่มลูกค้า (Customer Groups) และคอลัมน์เฉพาะกลุ่ม

ในระบบเก่า `PC_Face_OrdTrack_Sum.vb` มี Radio Button ในกรุ๊ป `grbViewSum` สำหรับสลับกลุ่มลูกค้า ซึ่งจะเรียกฟังก์ชัน `SetColDis(CustGrp)` เพื่อจัดระเบียบคอลัมน์และ **เปลี่ยนชื่อหัวตาราง (Header Renaming)** ตามลักษณะเฉพาะของลูกค้ารายนั้น:

### 5.1 ตารางเปรียบเทียบคำจำกัดความของแต่ละกลุ่ม

| รหัสกลุ่ม | รหัสลูกค้าที่ครอบคลุม (Prefix) | จอที่ใช้ในระบบเดิม | จุดเด่นเฉพาะของกลุ่ม |
|---|---|---|---|
| **N008** | `N008`, `N048`, `N066`–`N075` | `optVN008` | กลุ่มลูกค้ารายใหญ่ ดูข้อมูลครบทั้ง Customer, Stage Pending, และ Pack Checklist |
| **N044** | `N044`, `N064`, `N065` | `optVN044` | **มีการเปลี่ยนชื่อ Header เฉพาะตัว** (ดูหัวข้อ 5.2) |
| **N051** | `N051` | `optVN051` | เน้นการส่งออก (ExportQty, BalQty, ExpPct) และกระบวนการเตรียม Pack Scan |
| **N098** (KSP) | `N098` | `optVN098` | เรียกอีกชื่อว่ากลุ่ม KSP มีคอลัมน์ Sticker/Card พิเศษและฟอร์ม Pack Scan เฉพาะ |
| **MLT** | `U411`–`U426`, `MLT` | `optVU413` | กลุ่มลูกค้า MLT ดู QC1–2 ครบทั้ง Qty, Date, Fail Qty และ Polybag |
| **N083** | `N083`, `N086`–`N089` | `optVN083` | กลุ่มลูกค้า ENO เน้นการติดตาม QC1–2 และ Production Risky Issue |
| **General** | ลูกค้าอื่นทั้งหมดที่ไม่ใช่กลุ่มด้านบน | `optVOTH` | ดูภาพรวมทั่วไป QC1, Control, Polish, Plating, Shipped, Balance, ExpPct |

---

### 5.2 Header Renaming พิเศษของกลุ่ม N044 (สำคัญมาก)
ในระบบเก่า เมื่อเลือกกลุ่ม **N044** ฟังก์ชัน `SetColDis("N044")` จะทำการเปลี่ยนชื่อหัวคอลัมน์ให้ตรงกับศัพท์เฉพาะที่แผนกแพ็กและ QC ของกลุ่มนี้ใช้:

| คีย์ฟิลด์ในระบบ | ชื่อคอลัมน์มาตรฐาน (กลุ่มทั่วไป) | ชื่อคอลัมน์เฉพาะของกลุ่ม N044 | คำอธิบายความหมายงานจริง |
|---|---|---|---|
| `TrackTest` | QA / BBQ / Testing | **Inspection** | วันที่ตรวจสอบงาน |
| `PackCard` | 1. Card/Box | **BBQ / Top** | สถานะการเตรียมการ์ด/กล่องเฉพาะ |
| `TickOrd` | 2. Order Ticket/Label | **ส่ง Test** | วันที่ส่งทดสอบ |
| `TickRec` | 3. Receive Ticket/Label | **1. สั่ง Ticket** | วันที่สั่งพิมพ์ Ticket |
| `TrackSam` | 4. Sample | **1. จัด Ticket** | วันที่จัดเตรียม Ticket เสร็จ |
| `TrackCT` | 5. Cust C&T | **2. สั่ง Card** | วันที่สั่งการ์ดลูกค้า |
| `TrackMF` | 6. MF | **2. เบิก/จัด Card** | วันที่เบิก/จัดเตรียมการ์ด |
| `PackScanDo` | 7. Day to Do Pack Scan | **3. สั่ง Box** | วันที่สั่งกล่องแพ็ก |
| `PackScanSen` | 8. Pack Scan Send Cust | **3. เบิก/จัด Box** | วันที่เบิก/จัดเตรียมกล่อง |
| `PackScanAppv` | 9. Pack Scan Approved on | **4. สั่ง Pouch** | วันที่สั่งถุงผ้า Pouch |
| `PackScanMF` | 10. Pack Scan Photo on MF | **4. เบิก/จัด Pouch** | วันที่เบิก/จัดเตรียมถุงผ้า |
| `PolyOrd` | 4. Order Polybag | **Remark** | หมายเหตุการสั่งถุง |
| `PolyRec` | 5. Receive Polybag | **Pack Scan** | สถานะ Pack Scan |
| `TagRcyRec` | 6. Receive Recycled Tag U413 | **Upload MF** | วันที่อัปโหลดไฟล์ Master File |

---

### 5.3 Packaging Checklist (T1–T4 และ C1–C8) ในหน้า `PC_Face_OrdTrack_Pack`
ในจอ Detail ของระบบเดิม มีการติดตามของแพ็กอย่างละเอียด แบ่งเป็น 2 หมวดใหญ่:
1. **Tickets (T1–T4):**
   - **T1:** `TickUPCLabel` (UPC Label), `TickUPCLabelMent` (ETA เข้า), `TickLabel` (Sort จัดเสร็จ)
   - **T2:** `TickPolyLabel` (Polybag Label), `TickPolyLabelMent` (ETA เข้า), `TickPoly` (Sort จัดเสร็จ)
   - **T3:** `TickCustStick` (Customer Sticker), `CustTick` (Sort จัดเสร็จ)
   - **T4:** `TickOtherLabel` (Other Label), `TickOther` (Sort จัดเสร็จ)
   - **สถานะสรุป:** `GoodTick` = Ticket OK หรือ WAIT
2. **Cards & Packaging Materials (C1–C8):**
   - **C1:** `PackCardType` (Card Type), `PackCard` (Insert/String Tag), `PackCardMark` (ETA เข้า), `PackCardMent` (Sort จัดเสร็จ)
   - **C2:** `PackBox` (Box), `PackBoxMark` (ETA เข้า), `PackBoxMent` (Sort จัดเสร็จ)
   - **C3:** `PackPouch` (Pouch), `PackPouchMent` (Sort จัดเสร็จ)
   - **C4:** `PackCareCard` (Booklet/Care Card — สำหรับ KSP เรียก Sticker 1), `PackCareCardMent` (Sort จัดเสร็จ)
   - **C5:** `StickSize` (Size Sticker — สำหรับ KSP เรียก Sticker 2), `StickSizeMent` (Sort จัดเสร็จ)
   - **C6:** `StickTriLogo` (Triman Sticker — สำหรับ KSP เรียก Sticker 3), `StickTriLogoMent` (Sort จัดเสร็จ)
   - **C7:** `PolySize` (Polybag Size — สำหรับ KSP เรียก Other Card 1), `PolySizeMent` (Sort จัดเสร็จ)
   - **C8:** `SecurTag` (Security Tag — สำหรับ KSP เรียก Other Card 2), `SecurTagMent` (Sort จัดเสร็จ)
   - **สถานะสรุป:** `GoodPack` = Card OK หรือ WAIT
3. **อุปกรณ์เสริม (Accessories A1–A4):**
   - **A1:** `AccPoly` (CLL Polybag)
   - **A2:** `AccBubble` (Bubble Wrap)
   - **A3:** `AccAntiTar` (Anti Tarnish Paper)
   - **A4:** `AccFoam` (Foam / Other)

---

## 6. สูตรการคำนวณ Stage Delta (Pending Process Quantities)

ในระบบเดิม ตัวเลขที่แสดงในคอลัมน์ขั้นตอนการผลิต (`PST`, `PC1`, `PWA`, `PCA`, `PC2`, `PF`, `PL`, `PPL` ฯลฯ) จะ **แสดงเป็นจำนวนติดลบ** ซึ่งหมายถึง **"จำนวนชิ้นงานที่ยังค้างอยู่ในแผนกนั้นๆ"**

### สูตรทางคณิตศาสตร์จาก Stored Procedure:
ให้ `itemQty` คือจำนวนสั่งผลิตรวมของบรรทัดนั้น:
- **Stone (PST):** `StoneQty - itemQty`
- **Finding (PC1):** `FindingQty - itemQty`
- **Wax (PWA):** `WaxQty - itemQty`
- **Wax Set (PAU):** `(WaxQty == itemQty ? WaxSetQty - WaxQty : WaxSetQty - itemQty)`
- **Cast (PCA):** `(WaxQty == itemQty ? CastQty - WaxQty : CastQty - itemQty)`
- **Control (PC2):** `ControlQty - itemQty`
- **Grind (PF):** `(CastQty == itemQty ? GrindQty - CastQty : GrindQty - itemQty)`
- **Polish (PL):** `(GrindQty == itemQty ? PolishQty - GrindQty : PolishQty - itemQty)`
- **Plating (PPL):** `(PolishQty == itemQty ? PlateQty - PolishQty : PlateQty - itemQty)`
- **QC (FQC):** `(PlateQty == itemQty ? QCQty - PlateQty : QCQty - itemQty)`
- **Balance:** `ExportQty - itemQty`
- **Finish:** `FinishQty - itemQty`

### กฎการแสดงผลบนหน้าจอ:
- ถ้าค่าเป็น **ลบ (< 0)**: ถือว่าเป็นค่างานค้าง (Pending) → แสดงสีแดง (`var(--color-danger-600)`)
- ถ้าค่าเป็น **0 หรือ null**: ให้ **เว้นว่าง** ไม่ใส่ขีดหรือเลข 0 เพื่อให้ตารางสะอาด อ่านข้อมูลความหนาแน่นสูงได้ง่าย
- เมื่อแผนกถัดไปเสร็จสมบูรณ์ แผนกก่อนหน้าจะถูกปรับยอดค้างให้ยุบไปตามกระบวนการไหลของงาน

---

## 7. กฎความปลอดภัยและการบันทึกข้อมูล (Write Policy)

### 7.1 ฐานข้อมูลเป็น READ-ONLY 100%
- ห้ามรัน `ALTER`, `CREATE`, `DROP`, `UPDATE`, `INSERT`, `DELETE`, `TRUNCATE` บนตารางระบบหลัก
- ห้ามดัดแปลงแก้ไข Stored Procedures เดิมของระบบโรงงานเด็ดขาด

### 7.2 จุดที่อนุญาตให้แก้ไข (Application-Level Controlled Write)
1. **Remarks ใน `OrdDT` ผ่าน Endpoint `POST /api/orders/remarks`:**
   - แก้ไขได้เฉพาะ 7 ฟิลด์หมายเหตุของฝ่ายผลิต:
     - `Recvmark` (Receive Work)
     - `Enamark` (Enamel / Painting)
     - `Crysmark` (Crystal Setting)
     - `Assemmark` (Assembly)
     - `Shelfmark` (Shelf)
     - `Packmark` (Pack)
     - `Prodmark` (Production Remark)
   - ฟิลด์ `OrdRemark` เป็นของฝ่ายขาย/หัวเอกสาร **ห้ามเขียนทับ (Read-Only)**

---

## 8. คู่มือสำหรับ AI Assistant ในการบำรุงรักษาและพัฒนาต่อ

1. **อย่าสร้าง View หรือ Function ใหม่ใน SQL Server:** ให้ประมวลผล (Transform / Group / Aggregate / Filter) บนชั้น Node.js หรือ React ในหน่วยความจำเสมอ
2. **รักษาความสอดคล้องของ Color Tokens:**
   - ใช้ CSS variable tokens จาก `index.css` เท่านั้น
   - พื้นหัวตารางปกติ: `var(--color-surface-1)`
   - พื้นหัวตารางช่อง User Input (Remarks / Checklist): `color-mix(in srgb, var(--color-warning-500) 16%, var(--color-surface-1))`
   - ตัวหนังสือหัวตาราง: `var(--color-text-primary)`
   - เส้นขอบตาราง: `var(--color-border-strong)` และ `var(--color-border-light)`
   - ยอดค้างติดลบ: `var(--color-danger-600)`
3. **รูปภาพสินค้า (Item Photo):**
   - เลิกใช้ VARBINARY(MAX) จาก `GMItemPhoto` ถาวร
   - ให้สร้าง URL เรียกภาพผ่าน Photo Bridge (`/api/photos/ps/:itemNo` และ fallback ไป `/api/photos/cad/:itemNo`) โดยส่งเพียง `SampleItemNo` หรือ `ItemNo`
4. **เมื่อเพิ่มฟีเจอร์หรือแก้ไขบั๊ก:**
   - ตรวจสอบความถูกต้องด้วย `npx tsc --noEmit` ใน `Jewelry Factory System/frontend`
   - ตรวจสอบ Color Linting ด้วย `npm run lint:colors`
   - บันทึกประวัติการแก้ลงใน `debug-history.md`
