# Index Gap Analysis & Proposal — `dbGeneration`

**For:** Database Administrator (DBA) / database owner
**Prepared:** 2026-11-09 by the Gemstone Lifecycle Management web team
**Status:** PROPOSAL ONLY — nothing in this document has been executed. The web application is read-only against this database by policy; any index change is the DBA's decision.

---

## 1. Summary

| Finding | Severity |
|---|---|
| `OrdHD` and `OrdDT` each have a single nonclustered index (`*_Dashboard_Fast`); none supports lookups by order number | High |
| `OrdHD`, `OrdDT`, `OrdTrackDT` are **heaps** (no clustered index, no primary key) | High |
| Lookups by order number (`OrdNo`) have **no usable index** on `OrdHD`, `OrdDT`, or any of the 22 production step tables (`{XX}SenDT` / `{XX}RecDT`) | High |
| Duplicate keys exist: `OrdHD.OrdNo` (2 duplicates), `OrdDT.(OrdNo, OrdLineNo)` (15 duplicates) | Medium (data integrity) |
| SQL Server **2012 RTM** (`11.0.2100.60`) — no service pack applied; the product is out of extended support | Medium |

**Requested decision:** approve (or adjust) the **Priority 1** indexes in section 5 — 24 narrow, non-unique, online-buildable indexes that serve single-order lookups.

## 2. Evidence (read-only catalog queries, 2026-11-09)

Server `CLLDBS`, database `dbGeneration`, Enterprise Edition (64-bit), version `11.0.2100.60`. Confirmed by the business as the **production** database used daily by the legacy VB.NET system.

**Indexes that actually exist on the core tables:**

| Table | Rows / size | Indexes |
|---|---|---|
| `OrdHD` | 184,770 / 366 MB | `IX_OrdHD_Dashboard_Fast (OrdDate, CustCode)` only |
| `OrdDT` | 772,610 / 792 MB | `IX_OrdDT_Dashboard_Fast (OrdID, OrdNo, ItemNo)` only |
| `GMCust`, `GMEmp`, `GMGoodType` | — | primary key on `*ID` only |
| `OrdTrackDT`, `OrdWeekPlanHD` | — | none |

`IX_OrdDT_Dashboard_Fast` has `OrdNo` as its **second** key, so it cannot be used to seek by `OrdNo` alone.

**Production step tables:** every `{XX}SenHD` / `{XX}RecHD` has only its `*ID` primary key; every `{XX}SenDT` / `{XX}RecDT` has **no index at all**. Largest: `PTSenDT` 767,624 rows (212 MB), `PLSenDT` 632,066 rows (158 MB), `FLSenDT` 101,522 rows (27 MB).

The web views `VW_Web_SalesDashboard` and `VW_Web_OrderTrends` exist.

## 3. Observed impact

- **Deadlocks (error 1205)** in the FBE Order Tracker. One search runs 35 queries (order header + 17 production steps × send/receive), and each one fully scans tables that the VB.NET system writes continuously. Message seen by users: *"deadlocked on lock | communication buffer resources … chosen as the deadlock victim"*.
- A single-order lookup takes **0.7–3.7 s** for what should take a few milliseconds.
- **Mitigations already applied in the web app (no database change):** `WITH (NOLOCK)` on display-only reads in Order Tracking and global search, automatic retry on error 1205, and a friendly "database busy" message. These stop the web app from blocking VB.NET writers, but the full scans (CPU, I/O, buffer pool churn) remain.

## 4. Data-integrity note (duplicates)

`OrdHD.OrdNo` has 2 duplicated values and `OrdDT.(OrdNo, OrdLineNo)` has 15 duplicated pairs. Therefore:

- **Do not** create UNIQUE indexes or primary keys on these columns before the duplicates are resolved. The build would fail, and a successful unique constraint could reject future inserts from the VB.NET system.
- Please review the duplicates (possibly a document-number race in the legacy system):

```sql
SELECT OrdNo, COUNT(*) AS Cnt FROM dbo.OrdHD WITH (NOLOCK) GROUP BY OrdNo HAVING COUNT(*) > 1;
SELECT OrdNo, OrdLineNo, COUNT(*) AS Cnt FROM dbo.OrdDT WITH (NOLOCK) GROUP BY OrdNo, OrdLineNo HAVING COUNT(*) > 1;
```

## 5. Proposal

### Priority 1 — order-number lookups (requested)

Narrow, **non-unique** indexes. They change no table schema, column, or stored procedure, so the VB.NET application and the 2-parameter `PC_Show_OrdTrack_Sum_*` procedures keep working unchanged. Each index adds a small write cost to inserts and updates on its table.

| Index | Serves |
|---|---|
| `IX_OrdHD_OrdNo` on `OrdHD (OrdNo)` | Header lookup by order number (Order Tracking, PO Tracker detail, search joins) |
| `IX_OrdDT_OrdNo_OrdLineNo` on `OrdDT (OrdNo, OrdLineNo)` | Line lookups. Deliberately **no wide INCLUDE**: single-order lookups return few rows, and a wide index would also be rewritten on every PO Tracker remark update |
| 22 × `IX_{XX}SenDT_OrdNo` / `IX_{XX}RecDT_OrdNo` on `(OrdNo, OrdLineNo) INCLUDE ({XX}SenID or {XX}RecID, SenQty or RecQty)` | Fully covers the Order Tracking join for all 17 production steps |

All column names were verified against `INFORMATION_SCHEMA.COLUMNS` on 2026-11-09.

### Priority 2 — for DBA evaluation (not requested now)

The repository also holds a larger planned index set (`backend/sql/indexes.sql`, 21 indexes, not deployed) designed for the `PC_Show_OrdTrack_Sum_*` procedures and dashboards. If it is considered, please note:

- Four of them index `OrdDT (OrdNo)` with different INCLUDE lists (`IX_OrdDT_OrdNo`, `_Process`, `_Sales`, `_Detail`). `_Detail` includes nearly every column, including the remark columns. Consolidating them, or relying on the Priority 1 index, would cut write overhead.
- Whether a clustered index on `OrdHD` / `OrdDT` is appropriate once the duplicates are resolved. This is a larger change that needs a maintenance window and VB.NET regression testing.

### Platform

Apply the latest SQL Server 2012 service pack and cumulative update, or plan an upgrade; the instance is on RTM.

## 6. Script — Priority 1 (NOT EXECUTED)

Enterprise Edition supports `ONLINE = ON` (the table stays readable and writable during the build) and `DATA_COMPRESSION = PAGE`, matching the conventions of the existing `indexes.sql`. Recommended: test on a restored copy first, then run outside peak production hours.

```sql
USE dbGeneration;
GO
-- Order header / line lookups by order number (non-unique: duplicates exist, see section 4)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_OrdNo' AND object_id = OBJECT_ID('dbo.OrdHD'))
    CREATE NONCLUSTERED INDEX IX_OrdHD_OrdNo ON dbo.OrdHD (OrdNo) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdDT_OrdNo_OrdLineNo' AND object_id = OBJECT_ID('dbo.OrdDT'))
    CREATE NONCLUSTERED INDEX IX_OrdDT_OrdNo_OrdLineNo ON dbo.OrdDT (OrdNo, OrdLineNo) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO
-- Production step detail tables (17-step FBE Order Tracking)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GRSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.GRSenDT'))
    CREATE NONCLUSTERED INDEX IX_GRSenDT_OrdNo ON dbo.GRSenDT (OrdNo, OrdLineNo) INCLUDE (GRSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GRRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.GRRecDT'))
    CREATE NONCLUSTERED INDEX IX_GRRecDT_OrdNo ON dbo.GRRecDT (OrdNo, OrdLineNo) INCLUDE (GRRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TBSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.TBSenDT'))
    CREATE NONCLUSTERED INDEX IX_TBSenDT_OrdNo ON dbo.TBSenDT (OrdNo, OrdLineNo) INCLUDE (TBSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TBRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.TBRecDT'))
    CREATE NONCLUSTERED INDEX IX_TBRecDT_OrdNo ON dbo.TBRecDT (OrdNo, OrdLineNo) INCLUDE (TBRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ASSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.ASSenDT'))
    CREATE NONCLUSTERED INDEX IX_ASSenDT_OrdNo ON dbo.ASSenDT (OrdNo, OrdLineNo) INCLUDE (ASSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ASRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.ASRecDT'))
    CREATE NONCLUSTERED INDEX IX_ASRecDT_OrdNo ON dbo.ASRecDT (OrdNo, OrdLineNo) INCLUDE (ASRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LSSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.LSSenDT'))
    CREATE NONCLUSTERED INDEX IX_LSSenDT_OrdNo ON dbo.LSSenDT (OrdNo, OrdLineNo) INCLUDE (LSSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LSRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.LSRecDT'))
    CREATE NONCLUSTERED INDEX IX_LSRecDT_OrdNo ON dbo.LSRecDT (OrdNo, OrdLineNo) INCLUDE (LSRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FLSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.FLSenDT'))
    CREATE NONCLUSTERED INDEX IX_FLSenDT_OrdNo ON dbo.FLSenDT (OrdNo, OrdLineNo) INCLUDE (FLSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FLRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.FLRecDT'))
    CREATE NONCLUSTERED INDEX IX_FLRecDT_OrdNo ON dbo.FLRecDT (OrdNo, OrdLineNo) INCLUDE (FLRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EPSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.EPSenDT'))
    CREATE NONCLUSTERED INDEX IX_EPSenDT_OrdNo ON dbo.EPSenDT (OrdNo, OrdLineNo) INCLUDE (EPSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EPRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.EPRecDT'))
    CREATE NONCLUSTERED INDEX IX_EPRecDT_OrdNo ON dbo.EPRecDT (OrdNo, OrdLineNo) INCLUDE (EPRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LPSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.LPSenDT'))
    CREATE NONCLUSTERED INDEX IX_LPSenDT_OrdNo ON dbo.LPSenDT (OrdNo, OrdLineNo) INCLUDE (LPSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LPRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.LPRecDT'))
    CREATE NONCLUSTERED INDEX IX_LPRecDT_OrdNo ON dbo.LPRecDT (OrdNo, OrdLineNo) INCLUDE (LPRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CPSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.CPSenDT'))
    CREATE NONCLUSTERED INDEX IX_CPSenDT_OrdNo ON dbo.CPSenDT (OrdNo, OrdLineNo) INCLUDE (CPSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CPRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.CPRecDT'))
    CREATE NONCLUSTERED INDEX IX_CPRecDT_OrdNo ON dbo.CPRecDT (OrdNo, OrdLineNo) INCLUDE (CPRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PLSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.PLSenDT'))
    CREATE NONCLUSTERED INDEX IX_PLSenDT_OrdNo ON dbo.PLSenDT (OrdNo, OrdLineNo) INCLUDE (PLSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PLRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.PLRecDT'))
    CREATE NONCLUSTERED INDEX IX_PLRecDT_OrdNo ON dbo.PLRecDT (OrdNo, OrdLineNo) INCLUDE (PLRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_IQSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.IQSenDT'))
    CREATE NONCLUSTERED INDEX IX_IQSenDT_OrdNo ON dbo.IQSenDT (OrdNo, OrdLineNo) INCLUDE (IQSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_IQRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.IQRecDT'))
    CREATE NONCLUSTERED INDEX IX_IQRecDT_OrdNo ON dbo.IQRecDT (OrdNo, OrdLineNo) INCLUDE (IQRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PTSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.PTSenDT'))
    CREATE NONCLUSTERED INDEX IX_PTSenDT_OrdNo ON dbo.PTSenDT (OrdNo, OrdLineNo) INCLUDE (PTSenID, SenQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PTRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.PTRecDT'))
    CREATE NONCLUSTERED INDEX IX_PTRecDT_OrdNo ON dbo.PTRecDT (OrdNo, OrdLineNo) INCLUDE (PTRecID, RecQty) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO
```

### Rollback (NOT EXECUTED)

```sql
USE dbGeneration;
GO
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_OrdNo' AND object_id = OBJECT_ID('dbo.OrdHD')) DROP INDEX IX_OrdHD_OrdNo ON dbo.OrdHD;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdDT_OrdNo_OrdLineNo' AND object_id = OBJECT_ID('dbo.OrdDT')) DROP INDEX IX_OrdDT_OrdNo_OrdLineNo ON dbo.OrdDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GRSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.GRSenDT')) DROP INDEX IX_GRSenDT_OrdNo ON dbo.GRSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GRRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.GRRecDT')) DROP INDEX IX_GRRecDT_OrdNo ON dbo.GRRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TBSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.TBSenDT')) DROP INDEX IX_TBSenDT_OrdNo ON dbo.TBSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TBRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.TBRecDT')) DROP INDEX IX_TBRecDT_OrdNo ON dbo.TBRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ASSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.ASSenDT')) DROP INDEX IX_ASSenDT_OrdNo ON dbo.ASSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ASRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.ASRecDT')) DROP INDEX IX_ASRecDT_OrdNo ON dbo.ASRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LSSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.LSSenDT')) DROP INDEX IX_LSSenDT_OrdNo ON dbo.LSSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LSRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.LSRecDT')) DROP INDEX IX_LSRecDT_OrdNo ON dbo.LSRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FLSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.FLSenDT')) DROP INDEX IX_FLSenDT_OrdNo ON dbo.FLSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FLRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.FLRecDT')) DROP INDEX IX_FLRecDT_OrdNo ON dbo.FLRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EPSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.EPSenDT')) DROP INDEX IX_EPSenDT_OrdNo ON dbo.EPSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EPRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.EPRecDT')) DROP INDEX IX_EPRecDT_OrdNo ON dbo.EPRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LPSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.LPSenDT')) DROP INDEX IX_LPSenDT_OrdNo ON dbo.LPSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LPRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.LPRecDT')) DROP INDEX IX_LPRecDT_OrdNo ON dbo.LPRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CPSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.CPSenDT')) DROP INDEX IX_CPSenDT_OrdNo ON dbo.CPSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CPRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.CPRecDT')) DROP INDEX IX_CPRecDT_OrdNo ON dbo.CPRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PLSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.PLSenDT')) DROP INDEX IX_PLSenDT_OrdNo ON dbo.PLSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PLRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.PLRecDT')) DROP INDEX IX_PLRecDT_OrdNo ON dbo.PLRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_IQSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.IQSenDT')) DROP INDEX IX_IQSenDT_OrdNo ON dbo.IQSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_IQRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.IQRecDT')) DROP INDEX IX_IQRecDT_OrdNo ON dbo.IQRecDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PTSenDT_OrdNo' AND object_id = OBJECT_ID('dbo.PTSenDT')) DROP INDEX IX_PTSenDT_OrdNo ON dbo.PTSenDT;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PTRecDT_OrdNo' AND object_id = OBJECT_ID('dbo.PTRecDT')) DROP INDEX IX_PTRecDT_OrdNo ON dbo.PTRecDT;
GO
```

## 7. Verification after deployment

The web team will re-run its read-only benchmarks (same orders, same search terms) and compare them with the 2026-11-09 baseline:

- FBE Order Tracker single-order lookup: baseline median about 0.9 s.
- Global search: baseline median about 1.0 s.
- Results must match the baseline, and no new deadlock retries (`[DEADLOCK RETRY]`) may appear in the backend logs.

## 8. References

- Web app code: `Jewelry Factory System/backend/routes/orderTracking.js`, `Jewelry Factory System/backend/routes/search.js`
- Incident write-up: `docs/debug-history.md` → "FBE Order Tracker Deadlock"
- Planned index script (not deployed): `Jewelry Factory System/backend/sql/indexes.sql`
