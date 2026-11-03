# PO Tracker & Order Detail — Legacy Architecture & Data Flow Guide

> **Architectural & Data Flow Reference:** Legacy Desktop System (VB.NET) ↔ Modern Web ERP Platform  
> **Document Role:** Single Source of Truth (SSOT) for the **PO Tracker (Summary)** and **Order Detail (Line/Packaging)** subsystems.  
> **Source Code Origin:** Derived from legacy forms `PC_Face_OrdTrack_Sum.vb`, `PC_Face_OrdTrack_Pack.vb`, and `PC_Face_OrdTrack_Pack_Cust.vb`.

---

## 1. Executive Summary & System Overview

The legacy production tracking system was built in **Visual Basic .NET (Windows Forms)** connected to **Microsoft SQL Server (Database `dbGeneration` on `<DB_SERVER>`)**.

In the order and production tracking workflow, two primary interfaces operate in tandem:
1. **`PC_Face_OrdTrack_Sum` (PO Tracker - Summary):**
   - **Level 1 — High-Level Overview:** Aggregates production orders at the **PO / Group** level.
   - Includes customer group switching presets (`N008`, `N044`, `MLT`, `N051`, `N098`, `N083`, `General`).
   - Modernized into the web components **`POTrackerAdvanced.tsx`** and **`OrderTable.tsx`**.

2. **`PC_Face_OrdTrack_Pack` / `PC_Face_OrdSum_PO` (Order Detail / Packaging):**
   - **Level 2 — Line Item / SKU Level Detail:** Activated by double-clicking a summary row or selecting the Packaging Checklist view.
   - Modernized into the web components **`OrderDetailPage.tsx`**, **`OrderLineTable.tsx`**, and **`LineDetailDrawer.tsx`**.

---

## 2. Legacy Database Schema & Data Models

Data is partitioned into three distinct tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Core ERP Tables                               │
│  - OrdHD: Order Header (OrdNo, CustCode, PONo, EXNo, DueDate)          │
│  - OrdDT: Order Line Items (OrdLineNo, ItemNo, ItemQty, ItemPrice)     │
│  - GMCust: Customer Profiles (CustCode, CustName, SalesName)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────┴────────────────────────────────────┐
│                    User-Tracked Operational Tables                     │
│  - OrdTrackDT: Manual tracking entries logged at PO level              │
│    (TrackTest, SGS, OOR, BookDate, QC1-3, Pack Checklist, Remarks)     │
│  - OrdTrack: Line-level packaging checklist                            │
│    (Card, Box, Pouch, Booklet, Sticker, Polybag, Security Tag, Scan)   │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Table `OrdTrackDT` (Manual Operational Logging)
When operators in the legacy system entered tracking dates (QC inspection date, booking date, packaging checklist status, pack scan dispatch) and clicked **Save** (`btnSave_Click`), the application issued an `INSERT` or `UPDATE` against `OrdTrackDT` using a 6-part composite key:
```sql
WHERE CustCode = @CustCode
  AND PONo = @PONo
  AND OrdKind = @OrdKind      -- 'NEW' or 'REP'
  AND OrdMat = @OrdMat
  AND CustMultiAddr = @CustMultiAddr
  AND CustDueDate = @CustDueDate
```
> 💡 **Key Insight:** More than 25 operational columns displayed in the UI (amber-tinted user inputs) are manual entries recorded in `OrdTrackDT`, not derived from manufacturing formulas. Stored Procedures `PC_Show_OrdTrack_Sum_*` perform `LEFT JOIN OrdTrackDT` against aggregated order totals from `OrdHD`/`OrdDT`.

### 2.2 Table `OrdTrack` (Packaging Line Checklist)
In the legacy `PC_Face_OrdTrack_Pack` screen, clicking **Reload** executed `PC_Gen_OrdTrack_*` to generate checklist rows into `OrdTrack`. As operators checked tickets, cards, boxes, and stickers, they marked status (`OK` or entered ETA dates) and saved updates back to `OrdTrack`.

---

## 3. Summary-to-Detail Linkage (5-Axis + 1 DueDate)

Derived directly from `PC_Face_OrdTrack_Sum.vb` (event `dgvOrdItemSum_CellMouseDoubleClick`):

```vb
' Double-clicking OrdWeek, CustCode, or PONo
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

PC_Face_OrdSum_PO.ShowDialog()  ' Open group detail modal
```

### Modern Web Architecture Mapping
The modern web platform replicates this aggregation across backend routes (`backend/routes/poTracker.js`) and frontend tables (`OrderTable.tsx`):
1. **Summary Table (`POTrackerAdvanced.tsx`):** Aggregates order lines across the 6 axes:
   `CustCode | PONo | OrdKind | CustMultiAddr | OrdMat | CustDueDate`
2. **Row Navigation:** Clicking a table row navigates to:
   ```
   /po-tracker/group/:cust/:addr/:kind/:mat/:duedate?po=:poNo&view=:view
   ```
3. **Detail Page (`OrderDetailPage.tsx`):** Backend endpoint `GET /api/orders/group/:cust/:addr/:kind/:mat/:duedate` queries matching lines directly via `OrdHD JOIN OrdDT JOIN GMCust`.

---

## 4. Stored Procedures & Query Architecture

### 4.1 Summary Queries (PO Tracker List)
Retrieved via 5 primary Stored Procedures matching active date filter selections:
- `dbo.PC_Show_OrdTrack_Sum_OrdDate` — Filter by Order Date
- `dbo.PC_Show_OrdTrack_Sum_DueDate` — Filter by Factory Due Date
- `dbo.PC_Show_OrdTrack_Sum_CustDueDate` — Filter by Customer Due Date
- `dbo.PC_Show_OrdTrack_Sum_FinDate` — Filter by Completion Date
- `dbo.PC_Show_OrdTrack_Sum_All` — Unfiltered date range

#### 🛑 Parameter Guardrails (CRITICAL):
- All SPs strictly accept **only 2 parameters**: `@FromDate` (datetime) and `@ToDate` (datetime).
- **NEVER PASS `@Status`:** Modifying procedure signatures causes parameter count mismatch crashes in the legacy desktop software. Status filtering (`Pending`, `Finish`, `All`) must execute in-memory within the Node.js / React application layers.

### 4.2 Detail Queries (Order Lines)
- Line item views query tables directly: `OrdHD h LEFT JOIN GMCust c ON c.CustCode = h.CustCode LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo`.
- In-process stage deltas are calculated in Node.js using the same mathematical rules as the SPs.

---

## 5. Customer Segmentation & Group-Specific Column Mappings

The legacy interface adjusted visible columns and **renamed grid headers** dynamically depending on the selected customer group preset via `SetColDis(CustGrp)`:

### 5.1 Customer Group Definitions

| Group Code | Included Customer Prefixes | Legacy Preset | Group Characteristics |
|---|---|---|---|
| **N008** | `N008`, `N048`, `N066`–`N075` | `optVN008` | Tier-1 client; comprehensive tracking across production, stages, and packaging |
| **N044** | `N044`, `N064`, `N065` | `optVN044` | **Custom header labels** (See Section 5.2) |
| **N051** | `N051` | `optVN051` | Export volume focus (`ExportQty`, `BalQty`, `ExpPct`) and pack-scan staging |
| **N098** (KSP) | `N098` | `optVN098` | Specialized sticker/card terminology and dedicated pack-scan workflows |
| **MLT** | `U411`–`U426`, `MLT` | `optVU413` | Rigorous multi-tier QC tracking (QC1–2 Qty, Date, Fail Qty) and polybag audit |
| **N083** | `N083`, `N086`–`N089` | `optVN083` | QC inspection milestones and high-risk production issue tracking |
| **General** | All other accounts | `optVOTH` | Standard overview: QC1, Control, Polish, Plating, Shipped, Balance, ExpPct |

---

### 5.2 Group N044 Header Renaming Specifications

When switching to **N044**, `SetColDis("N044")` substituted standard column labels with dedicated client terminology:

| System Field Key | Standard Grid Header | N044 Client Header | Operational Meaning |
|---|---|---|---|
| `TrackTest` | QA / BBQ / Testing | **Inspection** | Formal QA inspection date |
| `PackCard` | 1. Card/Box | **BBQ / Top** | Top sample and packaging card status |
| `TickOrd` | 2. Order Ticket/Label | **Submit Test** | Laboratory test submission date |
| `TickRec` | 3. Receive Ticket/Label | **1. Order Ticket** | Ticket printing order date |
| `TrackSam` | 4. Sample | **1. Prep Ticket** | Ticket preparation completion date |
| `TrackCT` | 5. Cust C&T | **2. Order Card** | Packaging card order date |
| `TrackMF` | 6. MF | **2. Issue Card** | Packaging card allocation date |
| `PackScanDo` | 7. Day to Do Pack Scan | **3. Order Box** | Presentation box order date |
| `PackScanSen` | 8. Pack Scan Send Cust | **3. Issue Box** | Box allocation date |
| `PackScanAppv` | 9. Pack Scan Approved on | **4. Order Pouch** | Jewelry pouch order date |
| `PackScanMF` | 10. Pack Scan Photo on MF | **4. Issue Pouch** | Pouch allocation date |
| `PolyOrd` | 4. Order Polybag | **Remark** | Polybag order remarks |
| `PolyRec` | 5. Receive Polybag | **Pack Scan** | Pack scan completion status |
| `TagRcyRec` | 6. Receive Recycled Tag | **Upload MF** | Master file upload timestamp |

---

### 5.3 Packaging Checklist Specifications (T1–T4 & C1–C8)
Detailed packaging component tracking:
1. **Tickets (T1–T4):**
   - **T1:** `TickUPCLabel` (UPC barcode), `TickUPCLabelMent` (ETA), `TickLabel` (Prepared flag)
   - **T2:** `TickPolyLabel` (Polybag label), `TickPolyLabelMent` (ETA), `TickPoly` (Prepared flag)
   - **T3:** `TickCustStick` (Client sticker), `CustTick` (Prepared flag)
   - **T4:** `TickOtherLabel` (Specialty labels), `TickOther` (Prepared flag)
   - **Summary Flag:** `GoodTick` = Ticket OK or WAIT
2. **Cards & Materials (C1–C8):**
   - **C1:** `PackCardType` (Card type), `PackCard` (Insert tag), `PackCardMark` (ETA), `PackCardMent` (Prepared flag)
   - **C2:** `PackBox` (Box specification), `PackBoxMark` (ETA), `PackBoxMent` (Prepared flag)
   - **C3:** `PackPouch` (Pouch type), `PackPouchMent` (Prepared flag)
   - **C4:** `PackCareCard` (Care booklet), `PackCareCardMent` (Prepared flag)
   - **C5:** `StickSize` (Size sticker), `StickSizeMent` (Prepared flag)
   - **C6:** `StickTriLogo` (Logo sticker), `StickTriLogoMent` (Prepared flag)
   - **C7:** `PolySize` (Polybag size), `PolySizeMent` (Prepared flag)
   - **C8:** `SecurTag` (Anti-theft security tag), `SecurTagMent` (Prepared flag)
   - **Summary Flag:** `GoodPack` = Packaging OK or WAIT
3. **Packaging Accessories (A1–A4):**
   - **A1:** `AccPoly` (Standard polybag)
   - **A2:** `AccBubble` (Protective bubble wrap)
   - **A3:** `AccAntiTar` (Anti-tarnish paper insert)
   - **A4:** `AccFoam` (Custom foam inserts)

---

## 6. Stage Delta Backlog Calculations

Numerical values in production stage columns (`PST`, `PC1`, `PWA`, `PCA`, `PC2`, `PF`, `PL`, `PPL`, etc.) **render as negative numbers**, representing **active remaining backlogs**:

### Mathematical Formulas:
Let `itemQty` represent total line item quantity:
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

### UI Rendering Rules:
- **Negative Values (< 0):** Represent active backlog → Rendered in warning red (`var(--color-danger-600)`).
- **Zero or NULL Values:** Rendered as **empty whitespace** (no hyphens or zeroes) to maintain high visual clarity across dense tables.
- As downstream stages reach completion, upstream stage deficits automatically collapse.

---

## 7. Write Policy & Data Modification

### 7.1 Database is 100% READ-ONLY
- Prohibit `ALTER`, `CREATE`, `DROP`, `UPDATE`, `INSERT`, `DELETE`, or `TRUNCATE` operations on core ERP tables.
- Never modify legacy production Stored Procedures.

### 7.2 Permitted Application-Level Controlled Writes
1. **Remarks in `OrdDT` (`POST /api/orders/remarks`):**
   - Operators may update only 7 specific production remark fields:
     - `Recvmark` (Receipt notes)
     - `Enamark` (Enamel / Painting notes)
     - `Crysmark` (Crystal / Stone setting notes)
     - `Assemmark` (Assembly notes)
     - `Shelfmark` (Storage / Shelf notes)
     - `Packmark` (Packaging notes)
     - `Prodmark` (General production notes)
   - `OrdRemark` belongs to Sales/Order Header and is strictly **Read-Only**.

---

## 8. Guidelines for AI Assistants

1. **Do Not Create SQL Views or Functions:** Perform transformations, grouping, aggregations, and filtering in Node.js or React in-memory layers.
2. **Strict Adherence to Color Tokens:**
   - Standard table headers: `var(--color-surface-1)`
   - Manual user-entry column headers: `color-mix(in srgb, var(--color-warning-500) 16%, var(--color-surface-1))`
   - Primary text: `var(--color-text-primary)`
   - Table borders: `var(--color-border-strong)` and `var(--color-border-light)`
   - Negative backlog metrics: `var(--color-danger-600)`
3. **Product Imagery:**
   - Stream images on-demand via the Photo Bridge router (`/api/photos/ps/:itemNo` and `/api/photos/cad/:itemNo`). Never join or query binary image data from SQL Server.
4. **Code Quality Verification:**
   - Verify frontend changes using `npx tsc --noEmit` in `Jewelry Factory System/frontend`.
   - Run design token verification via `npm run lint:colors`.
   - Record bug fixes in `docs/debug-history.md`.
