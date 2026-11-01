# SQL — Stored Procedures & Indexes (`dbGeneration`)

Single Source of Truth (SSOT) for Stored Procedures and database indexes utilized by the PO Tracker and Analytics subsystems. Retained in repository version control to guard against object loss during production database restorations.

Target: **SQL Server 2012 Enterprise** · Database: `dbGeneration` · Host: `<DB_HOST>`

> [!IMPORTANT]
> **Active Production Database State (Updated 2026-10-08)**
> - ✅ **22 Covering Indexes (`indexes.sql`) and View `VW_Web_SalesDashboard`:** Deployed and actively utilized in production.
> - ❌ **Stored Procedures `PC_Show_OrdTrack_Sum_*`:** Experimental modifications were **reverted** because adding parameters broke the legacy VB.NET desktop application. The database strictly runs the original 2-parameter baseline (`@FromDate`, `@ToDate`), and the Node.js backend passes only these two arguments.
> - Deprecated files in `stored-procedures/` are historical drafts—**NEVER EXECUTE THEM AGAINST DATABASE INSTANCES**.
> - **Active Policy: 100% Read-Only Database.** Do not create, modify, or drop any tables, views, stored procedures, triggers, or indexes.

---

## Directory Structure

```
sql/
├── ERP_DATA_MAPPING_AND_LOGIC.md   # Field-level ERP guide and comprehensive business logic
├── indexes.sql                     # 22 covering indexes (9 SP + 13 Web Application)
├── views/                          # Production database views (SSOT)
│   └── VW_Web_SalesDashboard.sql   # Central view for Customer Dashboard, Matrix & Order Trends
├── stored-procedures/              # ❌ Deprecated SP drafts (Do not execute on DB)
│   ├── PC_Show_OrdTrack_Sum_OrdDate.sql      # @FromDate/@ToDate/@Status · 63 cols
│   ├── PC_Show_OrdTrack_Sum_DueDate.sql      # @FromDate/@ToDate/@Status · 63 cols
│   ├── PC_Show_OrdTrack_Sum_CustDueDate.sql  # @FromDate/@ToDate/@Status · 63 cols
│   ├── PC_Show_OrdTrack_Sum_FinDate.sql      # @FromDate/@ToDate/@Status · 63 cols
│   └── PC_Show_OrdTrack_Sum_All.sql          # @FromDate/@ToDate/@Status · 63 cols
└── _baseline/                      # Unmodified legacy baseline snapshots (for reference)
    ├── PC_Show_OrdTrack_Sum_*.sql  # Original baseline definitions
    ├── _columns.json               # Physical column schema of 6 primary tables
    └── _indexes_snapshot.json      # Pre-existing index snapshot (initially only PK_GMCust)
```

---

## Indexes Reference (`indexes.sql`)

### Part 1: Legacy Stored Procedure Indexes — 9 Indexes (Created 2026-07-02)
Mitigates full table scans on post-restore HEAP tables across `PC_Show_OrdTrack_Sum_*`:

| # | Index Name | Table | Purpose |
|---|-----------|-------|-------------|
| 1 | `IX_OrdHD_OrdDate` | `OrdHD` | SP: `_OrdDate`, `_All` — Date range filtration |
| 2 | `IX_OrdHD_DueDate` | `OrdHD` | SP: `_DueDate` — Factory due date range filtration |
| 3 | `IX_OrdHD_CustDueDate` | `OrdHD` | SP: `_CustDueDate` — Customer due date range filtration |
| 4 | `IX_OrdHD_FinishDate` | `OrdHD` | SP: `_FinDate` — Completion date range filtration |
| 5 | `IX_OrdHD_Cust_PO_Kind_Mat` | `OrdHD` | Correlated subquery `MIN(OrdDate)`, `STUFF FOR XML` |
| 6 | `IX_OrdDT_OrdNo` | `OrdDT` | Aggregate `SUM` across all manufacturing stages + `MIN(ItemNo)` |
| 7 | `IX_OrdTrackDT_Join` | `OrdTrackDT` | 6-column composite join key |
| 8 | `IX_OrdWeekPlanHD_PlanDate` | `OrdWeekPlanHD` | Weekly plan join: `DueDate = PlanDate` |
| 9 | `IX_GMCust_CustCode` | `GMCust` | Customer name and sales representative lookup |

### Part 2: Web Application Direct Query Indexes — 13 Indexes (Created 2026-07-16)
Optimizes direct Node.js backend routes (bypassing Stored Procedures):

| # | Index Name | Table | Target Route | Purpose |
|---|-----------|-------|-----------|-------------|
| 10 | `IX_OrdHD_OrdDate_Status` | `OrdHD` | `productionDashboard.js` | Stat cards, trend series, monthly counts, YoY |
| 11 | `IX_OrdHD_DueDate_Status` | `OrdHD` | `productionDashboard.js` | Delayed order tracking, overdue drill-downs |
| 12 | `IX_OrdDT_OrdNo_Process` | `OrdDT` | `productionDashboard.js` | Process distribution, stone/finding allocations |
| 13 | `IX_GMEmp_SalesName` | `GMEmp` | `productionDashboard.js` | Sales summary `JOIN` operations |
| 14 | `IX_OrdHD_PONo` | `OrdHD` | `search.js`, `poTrackerAdvanced.js` | `PONo` prefix searches, by-PO lookups |
| 15 | `IX_OrdHD_CustCode` | `OrdHD` | `search.js`, `poTrackerAdvanced.js`, `orderVolumeSummary.js` | Broad covering `CustCode` lookup |
| 16 | `IX_OrdDT_ItemNo` | `OrdDT` | `search.js`, `topOrdersGallery.js` | Item SKU prefix searches |
| 17 | `IX_GMCust_CustName` | `GMCust` | `search.js` | Substring text search on customer names |
| 18 | `IX_OrdDT_OrdNo_Sales` | `OrdDT` | `customerSummary.js`, `orderVolumeSummary.js` | Aggregate `SUM(ItemQty/ExportQty/Amnt)` |
| 19 | `IX_GMGoodType_Code` | `GMGoodType` | `orderVolumeSummary.js` | Product category name lookups |
| 20 | `IX_OrdHD_Group` | `OrdHD` | `poTrackerAdvanced.js` | Composite group filter (`CustCode+Addr+Mat+DueDate`) |
| 21 | `IX_OrdDT_OrdNo_Detail` | `OrdDT` | `poTrackerAdvanced.js` | Full covering detail lines across all quantities/status |
| 22 | *(Covered by above)* | — | `topOrdersGallery.js` | Leverages #10 + #16 + #18 in combination |

---

## Architectural Notes & Milestones

### 1. Photo Bridge Architecture (Offloading Base64)
In the original legacy stored procedures, each procedure performed `LEFT JOIN GMItemPhoto` and executed `MAX(CAST(ItemPhoto AS VARBINARY(MAX)))` inside every aggregation CTE, grouping outer queries by multi-megabyte binary blobs.
- **Modern Solution:** The web application decouples photo delivery entirely from SQL queries. Backend routes query lightweight item SKUs (`SampleItemNo = MIN(OrdDT.ItemNo)`) and stream images on-demand via the dedicated Photo Bridge router (`/api/photos/ps|cad/:itemNo`).

### 2. Covering Indexes Strategy
Before indexing, `OrdHD` (~176k rows), `OrdDT` (~755k rows), `OrdTrackDT`, and `OrdWeekPlanHD` operated as unindexed HEAP tables after restoration.
- Created covering indexes using `NONCLUSTERED`, `ONLINE=ON` (non-blocking), and `DATA_COMPRESSION=PAGE`.
- Avoided clustered primary keys on heaps to eliminate regression risks for the coexisting legacy desktop application.

---

## Central Analytical Database Views

### `dbo.VW_Web_SalesDashboard` (`sql/views/VW_Web_SalesDashboard.sql`)
The authoritative Single Source of Truth view powering three key web modules:
1. **Customer Dashboard (Chart)** (`/dashboard/customer`) — Trend projections and YoY KPIs.
2. **Customer Matrix Report** (`/dashboard/customer/matrix`) — Monthly and annual dense reporting matrices.
3. **Order Trends** (`/dashboard/customer/trends`) — Order volume trend analysis and drill-downs.

#### 📌 Business Logic & Data Normalization:
1. **Order Status:** Filters strictly for `ISNULL(OrdStatus, '') <> 'C'` (excludes canceled orders).
2. **Customer Status:** Filters strictly for `ISNULL(CustStatus, 'Y') = 'Y'` (active clients only).
3. **Order Prefix Exclusions:** Excludes `SUBSTRING(OrdNo, 1, 3) NOT IN ('BBL', 'BBD', 'BBK', 'BBT', 'BBP')` (filtering out internal, trial, or semi-finished jobs per finished goods reporting standards).
4. **Currency Standardization ($ USD):** Implements `ISNULL(DT.ItemExchAmnt, DT.ItemAmnt)` to convert foreign currencies (EUR, GBP, etc.) into USD using actual transaction rates, ensuring 100% reconciliation with corporate financial statements.
5. **Product Type Classification:**
   - `BBS`: Bracelet / Bangle
   - `BES`: Earring
   - `BNS`: Necklace
   - `BRS`: Ring
   - `Others`: Component parts and specialty accessories

#### 🎯 Financial Validation Benchmarks (Reconciled with 2025 Audit Reports):
- **Account `N044`:** 100% exact reconciliation
- **Account `N051`:** 100% exact reconciliation
- **Account `N066`:** 100% exact reconciliation
- **Account `U319`:** 100% exact reconciliation (Normalized Exchange Rate)
- **Account `N083`:** 100% exact reconciliation

---

## Usage Guidelines

- `indexes.sql` and `views/VW_Web_SalesDashboard.sql` represent active production objects. Retained as SSOT for database disaster recovery (Run only under administrative supervision).
- `stored-procedures/` contains deprecated experimental scripts (**DO NOT RUN**).
- `_baseline/` holds unmodified legacy definitions preserved for rollback and schema verification.
