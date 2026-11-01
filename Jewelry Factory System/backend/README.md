# Jewelry Factory System - Backend API

This Node.js/Express backend serves the Jewelry Factory System (PO Tracker).
It connects to a legacy SQL Server database (`dbGeneration`).

## Architecture & Code Organization

The codebase has been refactored (July 2026) to separate routing logic from complex SQL queries, and to better align file names with the Frontend's Menu structure.

### 1. Routes (`/routes/`)
Route files define the API endpoints. They have been renamed to match their functional domains in the frontend:
- `productionDashboard.js` — Main dashboard stats and trends.
- `poTrackerAdvanced.js` / `poTracker.js` — Production order details and groupings.
- `customerSummary.js` — Customer dashboard overview (Sales Summary).
- `customerReportMatrix.js` — Customer yearly sales aggregations (Matrix).
- `orderVolumeSummary.js` — Order volume trends and evidence.
- `topOrdersGallery.js` — Top selling items overview.
- `topOrdersAnalytics.js` — Top selling items quantity breakdown.
- `procurementReceiving.js` — Purchasing and receiving (SPA/SRA).
- `orderLinesIssues.js` — Requisitions and issues (SOA/SIA).
- `sampleDepartment.js` — Sample room tracking (SSA/SIM).

> **Visual Banners**: Every major route file now contains a clear ASCII banner at the top, explaining its purpose and distinguishing whether it fetches data using the Legacy Stored Procedures or queries the DB directly.

### 2. Services (`/services/`)
We are introducing a **Service Layer** to extract database queries out of the Express route files.
- Example: `productionDashboardService.js` holds the SQL logic to generate dashboard stats, keeping `productionDashboard.js` clean and focused on HTTP requests.

### 3. Database Layer (`db.js`)
Uses `mssql` to maintain connection pools to the SQL Server database.

## Legacy Integrations vs Direct Queries
The system operates in a mixed mode:
1. **Legacy SPs**: Some endpoints rely on existing Stored Procedures (e.g., `PC_Show_OrdTrack_Sum_*`) to ensure identical calculations with the old VB.NET system.
2. **Direct Queries**: Newer analytical dashboards query `OrdHD`/`OrdDT` directly for better performance and flexibility. See `sql/README.md` for index optimization details.
