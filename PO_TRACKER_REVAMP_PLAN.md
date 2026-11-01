# PO Tracker — Revamp Plan (Display-First)

> **Status:** 🟢 Phase 1 Complete (July 4, 2026) — Display-first build complete and verified (`tsc` passed). Phase 2 (SQL schema modification) was formally canceled.  
> **Scope:** PO Tracker list view surface (`POTrackerAdvanced.tsx` + `OrderTable.tsx`).  
> **Primary Goal:** Deprecate legacy in-place editing workflows; prioritize dense, high-accuracy display of all operational fields available from the legacy database baseline.  
> **Reference:** Stage mapping specifications: [`production_stages_mapping_log.md`](production_stages_mapping_log.md).

---

## 1. Key Architectural Finding — Data Availability

**Stored Procedures `PC_Show_OrdTrack_Sum_*` already return nearly all legacy production columns.** Previously, data was dropped during client-side mapping—`orderAPI.ts` mapped only ~22 fields out of 40+ returned:

- Legacy grids previously surfaced only ~17 customer-side columns, while 4 production columns were mapped to incorrect keys, rendering empty `-` symbols across rows.
- Columns `PC2 / PL / PPL` were mapped to non-existent properties (legacy short codes for Control, Polish, and Plating).
- `CloseStatus` and `CustName` were omitted from specific SP projections, resulting in null values.

> 👉 **Core Mandate:** Map all columns already returned by Stored Procedures and construct high-density UI columns without altering the physical database schema.

---

## 2. Technical Decisions (Locked)

| Topic | Resolution | Reference / Evidence |
|---|---|---|
| **PO2 Source** | `= OrdHD.EXNo` | Example: PO `4500683528` → `EXNo = 'STF_SAMPLE_JULY'`, matching PO2 in legacy forms. |
| **Wax Mapping** | `= WijQty → WijPenQty` | `production_stages_mapping_log.md` (`PWA = Wax = Wij`). PO `4520681070` PWA `-3934` = `WijPenQty -3934`. |
| **Wax Set Mapping** | `= WstQty → WstPenQty` | Distinct column from Wax (`PAU`). |
| **Customer Group Ordering** | Groups 1–6 = `N008`, `N044`, `MLT`, `N051`, `N083`, `General`. | Operational alignment with factory leadership. |
| **`PC2 / PL / PPL` Renaming** | Deprecate raw abbreviations; replace with explicit labels **Control**, **Polish**, and **Plating**. | Standardized terminology across web application. |

---

## 3. Column → Field Mapping (SSOT for Web UI)

> Always-On Fixed Columns (Not toggleable in column picker): `No.`, `Week`, `Cust`, `PO No.`, `Drilldown Arrow`

### 3.1 Customer Data Columns

| Legacy Header | Web UI Label | State Key | SP Field Name | Status |
|---|---|---|---|---|
| PO2 | PO2 | `po2` | `EXNo` | Available in `_Due`, `_Fin`, `_CustDue` |
| Order No. | Order No. | `ordno` | `OrdNo` | ✅ Active |
| New/Replen | New/Replen | `newReplen` | `OrdKind` | ✅ Active |
| Metal | Metal | `metal` | `OrdMat` | ✅ Active |
| Ship To | Ship To | `shipto` | `CustMultiAddr` | ✅ Active |
| Photo | Picture | `photo` | `SampleItemNo` | ✅ Active (Photo Bridge) |
| Order Date | Order Date | `orddate` | `OrdDate` | ✅ Active |
| Factory Due | Factory Due | `due` | `DueDate` | ✅ Active |
| QA/BBQ/Testing | QA/BBQ/Testing | `qa` | `TrackTest` | ✅ Active |
| SGS | SGS | `sgs` | `OrdSGS` | ✅ Active |
| QC Date | QC Date | `qcdate` | `CustQCDate` | ✅ Active |
| Cust Due Date | Cust Due | `custdue` | `CustDueDate` | ✅ Active |
| OOR Date | OOR Date | `oor` | `OORDate` | ✅ Active |
| No. of SKU | No. of SKU | `sku` | `SumItem` | ✅ Active |
| Qty | Qty | `qty` | `SumQty` | ✅ Active |
| Amount | Amount | `amount` | `SumAmnt` | ✅ Active |
| Remark | Remark | `remark` | `TrackRemark` | ✅ Active |

### 3.2 Production — Booking & Quality Control (QC)

| Legacy Header | State Key | SP Field Name | Notes |
|---|---|---|---|
| Book Inspect | `bookInspect` | `BookDate` | Inspection booking date |
| Book Ship | `bookShip` | `BookShip` | Shipping booking date |
| 1. QC Qty / Date / Fail Qty | `qc1qty`, `qc1date`, `qc1fail` | `QC1_Qty`, `QC1_Date`, `QC1_Fail` | Tier-1 QC tracking |
| 2. QC Qty / Date / Fail Qty | `qc2qty`, `qc2date`, `qc2fail` | `QC2_Qty`, `QC2_Date`, `QC2_Fail` | Tier-2 QC tracking |
| 3. QC Qty / Date | `qc3qty`, `qc3date` | `QC3_Qty`, `QC3_Date` | Tier-3 QC tracking |

### 3.3 Production — Packaging & Barcode Tagging

| Legacy Header | State Key | SP Field Name | Status |
|---|---|---|---|
| 1. Card/Box | `cardBox` | `PackCard` | Remapped to correct field |
| 2. Order Ticket/Label | `orderTicket` | `TickOrd` | Remapped to correct field |
| 3. Receive Ticket/Label | `receiveTicket` | `TickRec` | Remapped to correct field |
| 4. Sample | `sample` | `TrackSam` | Active |
| 5. Cust CT | `custCT` | `TrackCT` | Active |
| 6. MF | `mf` | `TrackMF` | Active |
| 7. Day to Do Pack Scan | `packScanDo` | `PackScanDo` | Active |
| 8. Pack Scan Send Cust | `packScanSen` | `PackScanSen` | Active |
| 9. Pack Scan Approved on | `packScan` | `PackScanAppv` | Remapped to correct field |
| 10. Pack Scan Photo on MF | `packScanMF` | `PackScanMF` | Active |
| 4. Order Polybag | `polyOrd` | `PolyOrd` | Active |
| 5. Receive Polybag | `polyRec` | `PolyRec` | Active |
| 6. Receive Recycled Tag | `tagRcyRec` | `TagRcyRec` | Active |

### 3.4 Production — Departmental Stage Backlog & Throughput

| Legacy Header | State Key | SP Field Name | Status |
|---|---|---|---|
| Stone | `stonePen` | `StonePenQty` | Active |
| Finding | `fitPen` | `FitPenQty` | Active |
| Wax | `wijPen` | `WijPenQty` | Active |
| Cast | `castPen` | `CastPenQty` | Active |
| Control | `controlPen` | `ControlPenQty` | Replaced legacy `PC2` |
| Grind | `grindPen` | `GrindPenQty` | Active |
| Polish | `polishPen` | `PolishPenQty` | Replaced legacy `PL` |
| Plating | `platePen` | `PlatePenQty` | Replaced legacy `PPL` |
| Shipped | `exportQty` | `ExportQty` | Total Shipped Volume |
| Balance | `balQty` | `BalQty` | Undelivered Balance |
| % Shipped | `expPct` | `ExpPct` | Shipment Progress % |
| Production Risky Issue | `prodRisk` | `ProdRiskIssue` | Replaced incorrect remark binding |
| PQC Plan Ship | `pqc` | `PQCPlanShip` | Remapped to correct field |

> 🔴 **Rendering Rule:** Stage backlogs are rendered as negative integers (e.g. `-10`). Unpopulated or zero cells render as **empty whitespace** rather than hyphens (`-`).

---

## 4. Default Column Configurations per Customer Group

- **`N008`:** Customer fields (New/Replen, ShipTo, Photo, OrderDate, FactoryDue, QA, SGS, QCDate, CustDue, OOR, SKU, Qty, Amount, Remark) + Production fields (Card/Box, OrderTicket, ReceiveTicket, Sample, CustCT, PackScanApproved, Control, Polish, Plating, %Shipped, ProdRisk, PQC).
- **`N044`:** Customer fields (PO2, New/Replen, Metal, ShipTo, Photo, OrderDate, FactoryDue, QA, QCDate, CustDue, OOR, SKU, Qty, Amount, Remark) + Production fields (BookInspect, BookShip, QC1Date, QC1Fail, full packaging sequence Card/Box→Recycled Tag, Control, Polish, Plating, %Shipped, ProdRisk, PQC).
- **`MLT`:** Customer fields (New/Replen, OrderDate, FactoryDue, CustDue, SKU, Qty, Amount, Remark) + Production fields (BookInspect, QC1 Qty/Date/Fail, QC2 Qty/Date/Fail, OrderTicket, ReceiveTicket, OrderPolybag, ReceivePolybag, Control, Polish, Plating, ProdRisk, PQC).
- **`N051`:** Full customer fields + Production fields (Card/Box→PackScanApproved, Control, Polish, Plating, ProdRisk, PQC).
- **`N083`:** Customer fields + Production fields (QC1 Qty/Date/Fail, QC2 Qty/Date/Fail, OrderTicket, ReceiveTicket, CustCT, Control, Polish, Plating, %Shipped, ProdRisk, PQC).
- **`General`:** Standard operational overview (QC1 Qty/Date/Fail, ReceiveTicket, Control, Polish, Plating, Shipped, Balance, %Shipped, ProdRisk, PQC).

---

## 5. Implementation Roadmap & Milestones

### Phase 1 — Display-First Refactoring (Completed July 4, 2026)
1. ✅ **`services/orderAPI.ts`**: Expanded `OrderSummary` interface; mapped all production, QC, packaging, and header attributes from SP output.
2. ✅ **`components/dashboard/OrderTable.tsx`**:
   - Added all missing columns to `MASTER_COLS`.
   - Deprecated abbreviations `pc2 / pl / ppl` in favor of full labels `Control / Polish / Plating`.
   - Corrected four misbound packaging columns (`cardBox`, `orderTicket`, `receiveTicket`, `packScan`).
   - Configured `GROUP_PRESETS` matching factory operational standards.
   - **Deprecated In-Line Editing:** Removed `EditableCell.tsx` and conflict resolution modals to ensure stable display-first behavior.
   - Formatted empty/zero values as clean whitespace.
3. ✅ Verified TypeScript compilation with zero errors.

### Phase 2 — SQL Modifications ❌ (Formally Canceled)
> **Strict Guardrail Policy:** Modifying Stored Procedures caused fatal parameter count mismatch crashes in the legacy desktop application. All filtering and calculation logic was permanently shifted into the Node.js / React application layers.
