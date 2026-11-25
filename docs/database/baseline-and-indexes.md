# Database — Stored Procedures, Indexes and Query Policy

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## Database Summary

| Technology      | Details                               |
|-----------------|---------------------------------------|
| Microsoft SQL Server | Production: `<DB_HOST>` (formerly: `<DB_SERVER>`) — SQL Server 2012 Enterprise |
| Connection      | TCP/IP, Port 1433, No Encryption     |
| Database        | `dbGeneration` (Order/Production), `dbInventory` (Procurement/Stock) |
| Key Tables      | `OrdHD`, `OrdDT`, `GMCust`, `GMItemPhoto`, `OrdTrackDT`, `OrdWeekPlanHD` |
| Stored Procedures | `PC_Show_OrdTrack_Sum_*` (OrdDate, DueDate, CustDueDate, FinDate, All) — Accepts 2 parameters per Baseline: `@FromDate`, `@ToDate` (Status filtering handled In-Memory) |

### Database Considerations

- **Strict Read-Only & Zero-Modification**: Prohibited from modifying or running mutation scripts against the database (100% Read-Only) to preserve legacy VB.NET compatibility.
- **SP Parameter Compatibility (Baseline 2 Params)**: All 5 Stored Procedures support strictly 2 baseline parameters: `@FromDate` (DateTime) and `@ToDate` (DateTime). Never pass `@Status` or extra parameters, which causes immediate parameter count mismatch crashes in the legacy VB.NET system.
- **Application-Layer Filtering**: Status filtering ('pending' / 'finish' / 'all') is handled entirely In-Memory within Backend Node.js and Frontend React.
- **Aggregation**: Node.js performs multi-dimensional grouping (5 axes: Cust, PO, Kind, ShipTo, Material + CustDueDate) after the SP returns raw records.
- **Connection Pool**: Database pool reconnects automatically upon connection interruptions without requiring server restarts.

## Database: Stored Procedures & Baseline Architecture (Server <DB_HOST>)

> ⚠️ **STRICT GUARDRAIL**: The database is maintained strictly at its **Original Baseline 100% — Never execute ALTER or modification scripts**.
> Every Stored Procedure must support concurrent operation with the legacy PCC Management System (VB.NET).

### Stored Procedures — Baseline 5 Procedures ✅

All 5 SPs share an identical CTE aggregation pipeline, differing only in the **WHERE clause date column** used for filtering:

| SP Name | WHERE Date Column | Status |
|---------|-------------------|--------|
| `dbo.PC_Show_OrdTrack_Sum_OrdDate` | `OrdHD.OrdDate BETWEEN @FromDate AND @ToDate` | ✅ Baseline (2 params) |
| `dbo.PC_Show_OrdTrack_Sum_DueDate` | `OrdHD.DueDate BETWEEN ...` | ✅ Baseline (2 params) |
| `dbo.PC_Show_OrdTrack_Sum_CustDueDate` | `OrdHD.CustDueDate BETWEEN ...` | ✅ Baseline (2 params) |
| `dbo.PC_Show_OrdTrack_Sum_FinDate` | `OrdHD.FinDate BETWEEN ...` | ✅ Baseline (2 params) |
| `dbo.PC_Show_OrdTrack_Sum_All` | No date filter (fetches all records) | ✅ Baseline (2 params) |

**Accepted Parameters (Every baseline procedure accepts exactly 2 parameters):**
```sql
@FromDate DateTime,
@ToDate DateTime
```
*(Never append `@Status` or additional parameters to Stored Procedures)*

**Backend Call Site:** `routes/poTracker.js` (mounted at `/api/orders`) → `request.execute(spName)` passing strictly `@FromDate` and `@ToDate`.

**Internal CTE Pipeline Structure (Identical across all 5 SPs):**
1. `DupOnePONo`: Identifies POs with exactly 1 OrdHD record (N008 customer group).
2. `DupMorPONo`: Identifies POs with > 1 OrdHD record (N008 customer group).
3. `CTE_Track`: `ROW_NUMBER() PARTITION BY` to extract latest `OrdTrackDT` status.
4. `OrdDT_Aggregate`: Aggregates SUM quantities across all production stages (General customers).
5. `CTO_OrdDT_Aggregate`: Aggregates SUM quantities (N008 customer group, single PO → Group by ShipTo).
6. `CTM_OrdDT_Aggregate`: Aggregates SUM quantities (N008 customer group, multiple POs).
7. **Final SELECT**: 3 `UNION ALL` queries (General customers + N008 single PO + N008 multiple POs).

### Database Indexes (Current State — 🛑 Never Execute Index Creation/Modification Scripts on DB)

> ⚠️ **STRICT POLICY**: Index changes are a DBA decision. **Never create, alter, or drop indexes or views** from this project (100% Read-Only policy).

Live indexes on `dbGeneration` (verified via `sys.indexes`, 2026-11-09):

| Table | Rows | Indexes | Clustered? |
|-------|------|---------|------------|
| `OrdHD` | ~185k | `IX_OrdHD_Dashboard_Fast (OrdDate, CustCode)` | Heap — no PK |
| `OrdDT` | ~773k | `IX_OrdDT_Dashboard_Fast (OrdID, OrdNo, ItemNo)` | Heap — no PK |
| `OrdTrackDT` | — | none | Heap — no PK |
| `OrdWeekPlanHD` | — | none | — |
| `GMCust`, `GMEmp`, `GMGoodType` | — | Primary key on `*ID` only | Clustered PK |
| `{XX}SenHD` / `{XX}RecHD` (production steps) | — | Primary key on `{XX}SenID` / `{XX}RecID` only | Clustered PK |
| `{XX}SenDT` / `{XX}RecDT` (production steps) | up to ~768k (`PTSenDT`) | none | Heap |

**Implications for code:**
- No index supports lookups by `OrdNo` (in `IX_OrdDT_Dashboard_Fast` it is the second key). Any `WHERE OrdNo = @x` scans the whole table — keep such reads few, use `WITH (NOLOCK)` for display-only queries, and never loop many of them per request without need.
- Keys are not unique in practice: `OrdHD.OrdNo` and `OrdDT.(OrdNo, OrdLineNo)` contain duplicates. Do not assume one row per key.
- Server is SQL Server 2012 Enterprise RTM (`11.0.2100.60`).

**Index proposal for the DBA:** `docs/dba/index-gap-and-proposal.md` (24 narrow non-unique indexes for order-number lookups, with create/rollback scripts — not executed).
**Planned index script (not deployed):** `backend/sql/indexes.sql`. The live `*_Dashboard_Fast` indexes have the same keys as `backend/sql/indexes-sales-analytics.sql` (different names). Views `VW_Web_SalesDashboard` and `VW_Web_OrderTrends` exist. Files under `backend/sql/stored-procedures/` are deprecated drafts and must never be applied.

## Concurrency Guards and Query Policy

First written for the FBE Order Tracker `/track` endpoint (2026-11-09); the NOLOCK, deterministic-output and deadlock rules apply system-wide.

5. **Concurrency Guards (2026-11-09, `/track`)**:
   - All `/track` reads use `WITH (NOLOCK)`: the legacy VB.NET system writes these tables all day, and `OrdNo` lookups scan whole tables (see "Database Indexes (Current State)"), so locking reads deadlocked (error 1205).
   - Same policy applied to the global search API (`routes/search.js`, all 4 queries).
   - **System-wide NOLOCK policy**: every display-only read of OrdHD/OrdDT/GMCust/GMEmp/GMHoliday/OrdWeekPlanHD, the `VW_Web_*` views, the `{XX}Sen/Rec` step tables, and the `dbInventory` requisition tables uses `WITH (NOLOCK)` (routes: `customerReportMatrix`, `orderLinesIssues`, `orderVolumeSummary`, `poTracker`, `productionDashboard`, `productionForecast`, `productionSummary`, `topOrdersGallery`, `orderTracking`, `search`). **Deliberately WITHOUT NOLOCK**: the PO Tracker remark read-before-UPDATE (`POST /api/orders/remarks`), requisition `GET /next-number/:docType` (feeds new document numbers), `auth.js` / `adminUsers.js`, and stored procedure calls (`PC_Show_OrdTrack_Sum_*` cannot be changed; never use `SET TRANSACTION ISOLATION LEVEL` on pooled connections — on SQL 2012 it leaks to the next request on that connection). Never add NOLOCK to CTE names.
   - Global search API (`/api/search`): deterministic order — PO/Order newest `OrdDate` first, Items most recently ordered first, Customers by code; line-1 `ItemNo` via `OUTER APPLY TOP 1` (OrdDT has duplicate keys). **No page calls it yet** (`fetchSearch` in `poTrackerAPI.ts` is unused; there is no search box in the Topbar). Very short terms that match most rows (e.g. `BB`) take ~3–5 s because results must be sorted — if a search box is added, debounce input and require ≥ 3 characters.
   - **Deterministic output rule**: every ranking/sort that feeds the UI has a tie-breaker (code/number columns), so identical requests return identical results — dashboard material/kind/customer rankings, overdue/recent orders, Customer Report top items (`ROW_NUMBER ... ORDER BY totalQty DESC, ItemNo`), Order List order lines, Top Item Gallery (ranking tie → `itemNo`, customers tie → `custCode`, latest-period row supplies `ItemDesc`). Money in Top Item Gallery responses is rounded to cents (`toCents` / `roundMoneyFields`) because float sums vary with row order. `/api/items/salespersons` merges names stored with different casing (e.g. `Jessica` / `JESSICA`) into one fixed entry. Keep this rule when adding queries.
   - `queryWithDeadlockRetry` retries a deadlocked query twice (200 ms, 600 ms); if it still fails the API returns **503** `"The database is busy right now..."`.
   - The step loop skips a step only when its table is missing (error 208). Any other SQL error fails the request — never show a false `Pending` step.
   - `ordLineNo` must be numeric (`OrdDT.OrdLineNo` is INT) → otherwise **400**.
   - `OPTION (MAXDOP 1)` was tested and rejected (~2x slower on these scans).
   - **Indexes**: no index supports `OrdNo` lookups on `OrdHD`/`OrdDT` or the `{XX}SenDT`/`{XX}RecDT` tables — see "Database Indexes (Current State)" and the DBA proposal `docs/dba/index-gap-and-proposal.md`.
