# PO Tracker — Revamp Plan (Display-First)

> **สถานะ:** 🟢 Phase 1 เสร็จ (4 ก.ค. 2026) — display-first build เสร็จ + tsc ผ่าน · รอ Phase 2 (SQL)
> **ขอบเขต:** หน้า PO Tracker list view เท่านั้น (`POTrackerAdvanced.tsx` + `OrderTable.tsx`)
> **เป้าหมายเฟสแรก:** ตัดระบบ "คีย์งาน" ออก → แสดงข้อมูลที่มีใน DB ให้ครบตามระบบเก่าก่อน
> อ้างอิง stage mapping: [`production_stages_mapping_log.md`](production_stages_mapping_log.md)

---

## 1. Key Finding — ข้อมูลมีอยู่แล้ว แค่ยังไม่ได้ดึงมาโชว์

**SP `PC_Show_OrdTrack_Sum_*` ส่งข้อมูล Production เกือบครบทุกคอลัมน์ของระบบเก่ามาให้อยู่แล้ว** แต่ถูกทิ้งที่ชั้น mapping — `orderAPI.ts` map แค่ ~22 field จากที่ SP ส่งมา ~40+ field ทำให้:

- ตารางตอนนี้มีแค่ ~17 คอลัมน์ฝั่ง Customer + 4 คอลัมน์ Production ที่ **ผูก field ผิด → โชว์ `-` ทุกแถว**
- คอลัมน์ `PC2 / PL / PPL` เป็นคอลัมน์ที่ผูก `(o as any).xxx` ที่ไม่มีจริง (จริง ๆ คือ legacy header ของ Control / Polish / Plating)
- `CloseStatus`, `CustName` **ไม่ได้อยู่ใน SELECT ของ SP** → `o.CloseStatus` เป็น null เสมอ (ทำให้ไฮไลต์ "late" ในตารางไม่ทำงาน + เชื่อมกับปัญหา Status toggle)

> 👉 งานหลักคือ **map ข้อมูลที่ SP ส่งมาอยู่แล้ว + สร้างคอลัมน์ให้ครบ** ไม่ใช่การไปดึงข้อมูลใหม่จาก DB

---

## 2. Decisions (ล็อกแล้ว)

| ประเด็น | ข้อสรุป | หลักฐาน |
|---|---|---|
| **PO2** มาจากไหน | = `OrdHD.EXNo` | ตัวอย่างฟิลด์: PO 4500683528 → EXNo `STF_SAMPLE_JULY` ตรงกับ PO2 ในจอเก่า |
| **Wax** = Wij หรือ Wst | = **`WijQty` → `WijPenQty`** | `production_stages_mapping_log.md` (PWA=Wax=Wij) + PO 4520681070 PWA -3934 = WijPenQty -3934 |
| Wax Set | = `WstQty` → `WstPenQty` (คนละคอลัมน์กับ Wax) | mapping log ลำดับ 4 (PAU) |
| ลำดับรูป ↔ กลุ่ม | รูป 1–6 = N008, N044, MLT, N051, N083, General | user confirm |
| `PC2 / PL / PPL` | คอลัมน์ผูก field ผิด → **ลบทิ้ง** แล้วแทนด้วย Control / Polish / Plating ที่ผูกถูก | mapping log (PC2=Control, PPL=Plating) |

---

## 3. Column → Field Mapping (SSOT สำหรับ build)

> คอลัมน์ always-on (ไม่อยู่ใน picker): `No.`, `Week`, `Cust`, `PO No.`, `arrow`

### 3.1 Customer Data

| ระบบเก่า | Web Label | key | SP field | สถานะ |
|---|---|---|---|---|
| PO2 | PO2 | `po2` | `EXNo` | 🆕 ⚠️ มีเฉพาะ SP `_Due/_Fin/_CustDue` — ต้องเพิ่มใน `_OrdDate`/`_All` |
| Order No. | Order No. | `ordno` | `OrdNo` | 🆕 (มีใน data แล้ว) |
| New/Replen | New/Replen | `newReplen` | `OrdKind` | ✅ มี |
| Metal | Metal | `metal` | `OrdMat` | 🆕 (map แล้ว แต่ไม่มีคอลัมน์) |
| Ship To | Ship To | `shipto` | `CustMultiAddr` | ✅ มี |
| Photo | Picture | `photo` | `SampleItemNo` | ✅ มี |
| Order Date | Order Date | `orddate` | `OrdDate` | ✅ มี |
| Factory Due | Factory Due | `due` | `DueDate` | ✅ มี |
| QA/BBQ/Testing | QA/BBQ/Testing | `qa` | `TrackTest` | ✅ มี |
| SGS | SGS | `sgs` | `OrdSGS` | ✅ มี |
| QC Date | QC Date | `qcdate` | `CustQCDate` | ✅ มี |
| Cust Due Date | Cust Due | `custdue` | `CustDueDate` | ✅ มี |
| OOR Date | OOR Date | `oor` | `OORDate` | ✅ มี |
| No. of SKU | No. of SKU | `sku` | `SumItem` | ✅ มี |
| Qty | Qty | `qty` | `SumQty` | ✅ มี |
| Amount | Amount | `amount` | `SumAmnt` | ✅ มี |
| Remark | Remark | `remark` | `TrackRemark` | ✅ มี |

### 3.2 Production — Book / QC (ทั้งหมด 🆕)

| ระบบเก่า | key | SP field | หมายเหตุ |
|---|---|---|---|
| Book Inspect | `bookInspect` | `BookDate` | |
| Book Ship | `bookShip` | `BookShip` | ⚠️ มีเฉพาะ `_Due/_Fin/_CustDue` |
| 1. QC Qty / Date / Fail Qty | `qc1qty` `qc1date` `qc1fail` | `QC1_Qty` `QC1_Date` `QC1_Fail` | |
| 2. QC Qty / Date / Fail Qty | `qc2qty` `qc2date` `qc2fail` | `QC2_Qty` `QC2_Date` `QC2_Fail` | |
| 3. QC Qty / Date | `qc3qty` `qc3date` | `QC3_Qty` `QC3_Date` | |

### 3.3 Production — Pack / Tag

| ระบบเก่า | key | SP field | สถานะ |
|---|---|---|---|
| 1. Card/Box | `cardBox` | `PackCard` | 🔧 เดิม bind ผิด |
| 2. Order Ticket/Label | `orderTicket` | `TickOrd` | 🔧 เดิม bind ผิด |
| 3. Receive Ticket/Label | `receiveTicket` | `TickRec` | 🔧 เดิม bind ผิด |
| 4. Sample | `sample` | `TrackSam` | 🆕 |
| 5. Cust CT | `custCT` | `TrackCT` | 🆕 |
| 6. MF | `mf` | `TrackMF` | 🆕 |
| 7. Day to Do Pack Scan | `packScanDo` | `PackScanDo` | 🆕 |
| 8. Pack Scan Send Cust | `packScanSen` | `PackScanSen` | 🆕 |
| 9. Pack Scan Approved on | `packScan` | `PackScanAppv` | 🔧 เดิม bind ผิด |
| 10. Pack Scan Photo on MF | `packScanMF` | `PackScanMF` | 🆕 |
| 4. Order Polybag | `polyOrd` | `PolyOrd` | 🆕 |
| 5. Receive Polybag | `polyRec` | `PolyRec` | 🆕 |
| 6. Receive Recycled Tag U413 | `tagRcyRec` | `TagRcyRec` | 🆕 |

### 3.4 Production — Stage Qty (Pending) + Summary

| ระบบเก่า | key | SP field | สถานะ |
|---|---|---|---|
| Stone | `stonePen` | `StonePenQty` | 🆕 |
| Finding | `fitPen` | `FitPenQty` | 🆕 |
| **Wax** | `wijPen` | **`WijPenQty`** | 🆕 ✅ ล็อกแล้ว |
| Cast | `castPen` | `CastPenQty` | 🆕 |
| Control | `controlPen` | `ControlPenQty` | 🆕 (แทน `PC2`) |
| Grind | `grindPen` | `GrindPenQty` | 🆕 |
| Polish | `polishPen` | `PolishPenQty` | 🆕 (แทน `PL`) |
| Plating | `platePen` | `PlatePenQty` | 🆕 (แทน `PPL`) |
| Shipped | `exportQty` | `ExportQty` | 🆕 ⚠️ `_All` ไม่ส่งค่านี้ |
| Balance | `balQty` | `BalQty` | 🆕 ⚠️ `_All` ไม่ส่งค่านี้ |
| % Shipped | `expPct` | `ExpPct` | 🆕 ⚠️ `_All` ไม่ส่งค่านี้ |
| Production Risky Issue | `prodRisk` | `ProdRiskIssue` | 🔧 เดิม bind `ProductionRemark` ผิด |
| PQC Plan Ship | `pqc` | `PQCPlanShip` | 🔧 เดิม bind ผิด |

> 🔴 ค่า Stage Qty ที่ค้างจะเป็นเลขติดลบ (เช่น -10) ตามตรรกะระบบเก่า — **ช่องที่ไม่มีข้อมูลให้เว้นว่าง ไม่ต้องใส่ `-`** (ตามที่ผู้ใช้ระบุ)

---

## 4. Default Columns ต่อกลุ่ม (จากรูป 6 ใบ — ⚠️ รอ user ยืนยันครั้งสุดท้าย)

> ทุกกลุ่มมี always-on: No, Week, Cust, PO No., + arrow

- **N008** — Customer: New/Replen, ShipTo, Photo, OrderDate, FactoryDue, QA, SGS, QCDate, CustDue, OOR, SKU, Qty, Amount, Remark · Production: Card/Box, OrderTicket, ReceiveTicket, Sample, CustCT, PackScanApproved, Control, Polish, Plating, %Shipped, ProdRisk, PQC
- **N044** — Customer: PO2, New/Replen, Metal, ShipTo, Photo, OrderDate, FactoryDue, QA, QCDate, CustDue, OOR, SKU, Qty, Amount, Remark · Production: BookInspect, BookShip, QC1Date, QC1Fail, **Pack ครบทั้งแถว** (Card/Box→Recycled Tag), Control, Polish, Plating, %Shipped, ProdRisk, PQC
- **MLT** — Customer: New/Replen, OrderDate, FactoryDue, CustDue, SKU, Qty, Amount, Remark · Production: BookInspect, QC1(Qty·Date·Fail), QC2(Qty·Date·Fail), OrderTicket, ReceiveTicket, OrderPolybag, ReceivePolybag, Control, Polish, Plating, ProdRisk, PQC
- **N051** — Customer: เต็ม (PO2, Metal, ครบ incl. QA/SGS/QCDate/OOR) · Production: Card/Box→PackScanApproved (Sample, CustCT, MF, DayToDo, SendCust), Control, Polish, Plating, ProdRisk, PQC
- **N083** — Customer: New/Replen, OrderDate, FactoryDue, CustDue, SKU, Qty, Amount, Remark · Production: QC1(Qty·Date·Fail), QC2(Qty·Date·Fail), OrderTicket, ReceiveTicket, CustCT, Control, Polish, Plating, %Shipped, ProdRisk, PQC
- **General** — Customer: New/Replen, OrderDate, FactoryDue, CustDue, SKU, Qty, Amount, Remark · Production: QC1(Qty·Date·Fail), ReceiveTicket, Control, Polish, Plating, Shipped, Balance, %Shipped, ProdRisk, PQC

---

## 5. Phased Plan

### Phase 1 — Display-first (ไม่แตะ SQL) ✅ เสร็จ 4 ก.ค. 2026
1. ✅ **`services/orderAPI.ts`** — ขยาย interface `OrderSummary` + map ทุก field production/QC/pack/book/EXNo/Metal/OrdNo จากผลลัพธ์ SP
2. ✅ **`components/dashboard/OrderTable.tsx`**
   - ✅ เพิ่มคอลัมน์ที่ขาดทั้งหมดใน `MASTER_COLS` (ตาม §3)
   - ✅ ลบ `pc2 / pl / ppl` → แทนด้วย `controlPen / polishPen / platePen` (ชื่อเต็ม)
   - ✅ แก้ 4 คอลัมน์ที่ bind ผิด (cardBox, orderTicket, receiveTicket, packScan) + `prodRisk`, `pqc`
   - ✅ เขียน `GROUP_PRESETS` ใหม่ตาม §4
   - ✅ **ถอดระบบคีย์งาน**: ลบไฟล์ `EditableCell.tsx` + `ConflictResolutionModal.tsx`, ลบ `handleCellSave`/`conflict` state/`editable`/`dataKey`/`ConflictData`
   - ✅ ช่องไม่มีข้อมูล = เว้นว่าง (ไม่ใส่ `-`)
3. ✅ เช็ค `POTrackerAdvanced.tsx` — always-on/filtered list (`no/week/cust/po/arrow`) ยังตรง, ไม่ต้องแก้
4. ✅ Verify — `tsc --noEmit` ผ่าน (ไฟล์ที่แก้ไม่มี error) · eslint ไม่มี error ใหม่

### Phase 2 — SQL ❌ ยกเลิก (แก้ SP แล้วระบบ VB.NET เดิมพัง → นโยบายปัจจุบันไม่แตะ DB 100%)
> SP บน DB เป็นตัวเดิม (รับ `@FromDate`, `@ToDate`) — การกรองสถานะ Pending/Finish/All ทำใน Node.js/React แทน รายการด้านล่างเก็บไว้เป็นประวัติ ห้ามทำ
4. ~~เพิ่ม `EXNo` (PO2), `CloseStatus`, `Metal(OrdMat มีแล้ว)` ใน SELECT ของ `_OrdDate` + `_All`~~
5. ~~เพิ่ม Stage Qty (`ExportQty`/`BalQty`/`ExpPct`) ที่ `_All` ยังไม่ส่ง~~
6. ~~เพิ่ม `@Status` ให้ SP อีก 4 ตัว~~

---

## 6. Open Items
- [x] user ยืนยัน default columns 6 กลุ่ม (§4) — ยืนยันแล้ว
- [x] `PC2/PL/PPL` label — ใช้ชื่อเต็ม (Control/Polish/Plating)
- [x] ระบบคีย์งาน — ลบทิ้ง (ไม่เก็บ comment)

### ❌ Phase 2 — SQL (ยกเลิกทั้งหมด ห้ามแก้ SP)
- ~~เพิ่ม `EXNo` (PO2) + `CloseStatus` ใน SELECT ของ `_OrdDate` + `_All`~~
- ~~เพิ่ม `ExportQty`/`BalQty`/`ExpPct` ที่ `_All` ยังไม่ส่ง~~
- ~~`BookShip` เพิ่มใน `_OrdDate`/`_All`~~
- ~~เพิ่ม `@Status` ให้ SP อีก 4 ตัว~~ → แก้แล้วด้วยการกรองสถานะใน Memory

### หมายเหตุ known-issue (pre-existing, ไม่ได้แก้ในรอบนี้)
- eslint `react-refresh/only-export-components` ที่ export `MASTER_COLS`/`GROUP_PRESETS` จาก `OrderTable.tsx` — เป็น architecture เดิม (POTrackerAdvanced import ไปใช้) ถ้าจะเคลียร์ต้องแยกไป `orderTableColumns.ts`
- ค่า pending-qty (Stone…Plating/Shipped/Balance) ที่ SP ส่ง null จะเว้นว่าง; ติดลบ = ค้าง แสดงสีแดง
