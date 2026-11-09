# Gemstone Lifecycle Management — Project Context

## 🛑 STRICT DATABASE GUARDRAIL (100% READ-ONLY — DO NOT MODIFY DATABASE UNDER ANY CIRCUMSTANCES)

> ### ⚠️ Critical Security Policy (NEVER VIOLATE)
> 1. **Strictly Prohibited from Touching, Modifying, or Altering Any Database Structures or Data (100% READ-ONLY)**:
>    - Absolute ban on executing DDL or DML commands: `ALTER`, `CREATE`, `DROP`, `UPDATE`, `INSERT`, `DELETE`, `TRUNCATE`, `EXEC sp_rename`, etc.
>    - Absolutely forbidden to alter Stored Procedures, Views, Tables, Functions, Triggers, or Indexes on the database across both Production DB (`<DB_HOST>`) and Test DB.
> 2. **Must Maintain 100% Backward Compatibility with the Legacy System (Legacy VB.NET / PCC Management System)**:
>    - This database is continuously accessed concurrently by the legacy factory system (VB.NET).
>    - Any modification to Stored Procedures (such as introducing a `@Status` parameter) immediately breaks the legacy application (causing parameter count mismatch / OLE DB errors).
>    - Every Stored Procedure must strictly preserve its **Original System Baseline Signature (accepting exactly 2 parameters: `@FromDate`, `@ToDate`)**.
> 3. **Data Filtering, Grouping, and Calculations Must Occur at the Application Layer Only**:
>    - Status filtering (Pending/Finish), customer grouping, or statistical recalculations must be performed In-Memory on the Backend (Node.js/Express) or Frontend (React) — never on the database!
> 4. **Read-Only Core Policy**:
>    - Only `SELECT` statements or `EXECUTE` calls to existing baseline Stored Procedures are permitted.
>    - **Controlled Application-Level Exceptions**:
>      1. Table `system_users` for web authentication management (Auth).
>      2. Updating specific remark fields in `OrdDT` (`Recvmark`, `Enamark`, `Crysmark`, `Assemmark`, `Shelfmark`, `Packmark`, `Prodmark`) via the PO Tracker Remarks API.
>      3. Updating specific procurement header fields (`BuyName`, `RefDocuNo`) via the Procurement API.
>      *Strictly forbidden to create, delete, or modify any Tables, Views, Indexes, or Procedures outside these controlled exceptions.*

## Project Overview

Gemstone and jewelry manufacturing lifecycle management system (Gemstone Lifecycle Management).
Modernizes the legacy desktop system written in VB.NET + SQL Server into a full-stack, enterprise-grade Web Application.
Operated within the internal enterprise intranet, connected to live MSSQL (`<DB_SERVER>`) via Stored Procedures.

### Business Modules

| Module                 | Document Code                        | Status             |
|------------------------|--------------------------------------|--------------------|
| Authentication         | JWT + Role-based (admin/sales)       | ✅ Live             |
| Overview (Dashboard)   | —                                    | ✅ Live (admin only) |
| Sales Analytics        | —                                    | ✅ Live (admin + sales) |
| Sales Summary          | — (Amount + Qty modes)               | ✅ Live (admin + sales) |
| Customer Report Matrix | — (Matrix Table)                     | ✅ Live             |
| Top Item Gallery       | —                                    | ✅ Live             |
| Procurement & Receiving | SPA, SRA, SRB, SIR                  | 🟡 DocumentLayout done |
| Orders & Requisitions  | SOA, SIA, SIB, SIP, SIS             | 🟡 DocumentLayout done |
| Sample Room            | SSA, SIM                             | 🟡 DocumentLayout done |
| Stock Audit & Inventory Count | Check Dispatch/Sample/Purchase/Stock | ⬜ Placeholder      |
| Production / PO Tracker | —                                  | ✅ Live (core feature, admin + sales by default menu permissions) |
| FBE Order Tracker       | —                                    | ✅ Live (FBE 17-Step Production Tracker) |
| Order Trends           | —                                    | ✅ Order volume trends and evidence |
| Spare Parts Stock      | SP-Order, SP-Issue, SP-Receive, …    | ⬜ Placeholder      |
| Subcontract Management | —                                    | 🟡 UI Preview (1/3, No Backend) |
| Audit — CCTV IT Audit Report | —                              | ✅ Live (admin only, Zero-DB) |

### Key Feature: PO tracker

The PO tracker is a core operational production feature designed to:
- Execute Order Stored Procedures (`PC_Show_OrdTrack_Sum_*`) using the strict **Baseline 2-parameter signature: `@FromDate`, `@ToDate`** (Never pass `@Status` to preserve 100% legacy VB.NET compatibility).
- Aggregate and shape data in Node.js across 5 core dimensions: Cust, PO, Type, ShipTo, Material.
- **In-Memory Status Filtering** (Node.js/React):
  - `Pending`: Filters rows where `UnFinishQty !== 0` (work in progress).
  - `Finish`: Filters rows where `FinishQty !== 0` (completed production).
  - `ALL`: No filter; displays all records.
- **Customer Grouping** strictly matching legacy business rules (100% parity):
  - `N008`: N008, N048, N066-N075
  - `N044`: N044, N064, N065
  - `N051`: N051
  - `N098`: N098
  - `MLT`: U411-U426, MLT
  - `General`: All other customer codes outside the groups above.
- **Decoupled Date Filter**: Freely switch date filters (Order Date, Factory Due Date, Cust Due Date, Finish Date) to invoke the corresponding SP independently without mutating or constraining status values.
- **Real-Time Live Data (No Caching)**: In-Memory caching is disabled to guarantee instant real-time synchronization with the database, and `ItemPhoto` image buffers are excluded from payloads to minimize network bandwidth.
- Serve product photos via **network path Photo Bridge** (`/api/photos/ps|cad/:itemNo`), where SP lists supply `SampleItemNo` (representative item number per group) for frontend dynamic URL resolution — **base64/VARBINARY (`GMItemPhoto`) is completely deprecated system-wide**.

**Design Notes (POTrackerAdvanced.tsx / OrderTable.tsx):**
- **Filters — Toolbar + Popover + Chips (modern table-filter pattern, not a sidebar)**: Group toggle and Status toggle remain permanently visible in a single toolbar row. Secondary filters (Week/Customer/PO/Type/ShipTo/Date Range) are housed inside the "Filters" button (with active count badge), opening a floating popover (matching the View Columns popover pattern in `OrderTable.tsx`). Active filters appear as removable chips directly underneath the toolbar for immediate awareness without reopening the popover. When no filters are active, the upper layout collapses cleanly into a single toolbar row (inspired by Linear/Notion/GitHub Issues design patterns, avoiding bulky BI dashboard sidebars).
- **KPI Tiles → Smart KPI Toolbar**: Replaced legacy flat icon-circle grids with a unified inline toolbar: Priority Metrics (ACTIVE ORDERS, LATE, PENDING) displayed prominently on the left | vertical divider | Secondary Metrics (TOTAL QTY, TOTAL AMOUNT) in compact typography | Refresh button + "Last updated" indicator on the right — aligned with the Top Item Gallery Summary Header design.
- **Pagination — Pinned, Zero Whole-Page Scrolling**: Consolidated into a single pinned bottom toolbar (Showing X–Y of Z + page size selector + Prev/page numbers/Next unified in one row). `OrderTable.tsx` no longer accepts `totalCount`/`pageSize`/`onPageSizeChange` props since pagination logic lives in `POTrackerAdvanced.tsx`. The Data Table card utilizes flex column (`flex: 1, minHeight: 0`) to fill the remaining viewport, and the scroll container in `OrderTable.tsx` replaces fixed `maxHeight: calc(100vh - 280px)` with `flex: 1, minHeight: 0`, pinning pagination to the bottom of the screen permanently.
- **Line Detail Drawer & Order Line Table**:
  - `OrderLineTable.tsx` avoids awkward text wrapping in narrow columns (e.g., 'Plating') for clean readability.
  - Photo container backgrounds in `LineDetailDrawer.tsx` utilize `--color-product-canvas` for high contrast across all themes, with close buttons mirroring the Lightbox pattern.
- **Column Presets Synchronization**: Default column presets (Sales, Production, All) in `orderDetailColumns.ts` achieve 100% parity with legacy VB.NET checkboxes (adding `QCDate`, `FinishQty` to Sales and `OrdRemark` to Production).

### Key Feature: Top Item Gallery

Displays top-ranked products in an adaptive Gallery Card Grid with year-over-year comparison tools.

**Design Notes (TopOrdersGalleryPage.tsx / TopOrdersGalleryGrid.tsx / TopOrdersSkeleton.tsx):**
- **Summary Header**: Top bar displaying operational scope (Combined/Compare mode) + ranked item count + KPI cards for Volume & Value via `GallerySummaryKpi` component — supports both Combined mode (cumulative across years) and Compare mode (Base vs. Compare year head-to-head with % delta).
- **Gallery Grid**: Responsive CSS Grid (`gallery-grid` class) using `repeat(auto-fill, minmax(clamp(260px, 16vw, 320px), 1fr))` displaying product cards with images served through the Photo Bridge.
- **Loading State — Skeleton (`TopOrdersSkeleton.tsx`)**: Two-part skeleton:
  1. **Summary Header Skeleton**: Mocks top KPI metrics (title + volume/value placeholders) to eliminate layout shift.
  2. **Gallery Grid Skeleton**: 15 card placeholders using the exact `gallery-grid` layout, featuring Header Row, capsule-shaped Image Area, and Footer Rows 1–2 with smooth shimmer animation (`linear-gradient 110deg, background-size 400%, 1.5s linear infinite`).
- **Filter Loading Overlay**: Filter adjustments trigger a semi-transparent overlay with a centered spinner, `backdrop-filter: blur(2px)`, and `pointer-events: all` to prevent race conditions during queries.
- **Perspective Modes**: Dual mode support — `combined` (all years aggregated) and `compare` (two years head-to-head), switchable from the Topbar.

---

## Tech Stack

### Frontend

| Technology        | Version | Purpose                              |
|-------------------|---------|--------------------------------------|
| React             | 19.x    | UI Library                           |
| TypeScript        | 6.x     | Type Safety                          |
| Vite              | 8.x     | Build Tool & Dev Server              |
| Tailwind CSS      | 4.x     | Utility-First CSS (via `@tailwindcss/vite`) |
| React Router DOM  | 7.x     | Client-Side Routing                  |
| Lucide React      | 1.x     | Icon Library                         |
| Recharts          | 2.x     | Charting Library (Bar/Line/Pie)      |
| ExcelJS           | 4.x     | Excel File Export                    |
| FileSaver         | 2.x     | Client-Side File Download            |
| React Draggable   | 4.x     | Draggable UI Elements                |

### Backend

| Technology | Version | Purpose                         |
|------------|---------|----------------------------------|
| Node.js    | —       | Runtime                          |
| Express    | 5.x     | HTTP Framework                   |
| mssql      | 12.x   | SQL Server Driver (Connection Pool) |
| jsonwebtoken | 9.x  | JWT Authentication               |
| dotenv     | 17.x   | Environment Variable Management  |
| cors       | 2.x    | Cross-Origin Resource Sharing    |
| nodemon    | 3.x    | Dev Auto-Restart (devDependency) |

### Database

| Technology      | Details                               |
|-----------------|---------------------------------------|
| Microsoft SQL Server | Production: `<DB_HOST>` (formerly: `<DB_SERVER>`) — SQL Server 2012 Enterprise |
| Connection      | TCP/IP, Port 1433, No Encryption     |
| Database        | `dbGeneration` (Order/Production), `dbInventory` (Procurement/Stock) |
| Key Tables      | `OrdHD`, `OrdDT`, `GMCust`, `GMItemPhoto`, `OrdTrackDT`, `OrdWeekPlanHD` |
| Stored Procedures | `PC_Show_OrdTrack_Sum_*` (OrdDate, DueDate, CustDueDate, FinDate, All) — Accepts 2 parameters per Baseline: `@FromDate`, `@ToDate` (Status filtering handled In-Memory) |

### Design System

| Design System | Details                                         |
|---------------|--------------------------------------------------|
| Theme Engine  | 3 themes via `ThemeContext` + CSS custom properties |
| Themes        | `modern-dark` (default), `dark-gold`, `royal-white` |
| Color System  | OKLCH color space                                |
| Fonts         | **Cinzel** (logo), **Roboto** (headings, body, and dense tables) |
| 60-30-10 Roles | `--color-ui-canvas` 60%, `--color-ui-surface` / `--color-ui-raised` 30%, `--color-ui-interactive` 10% |
| Interaction Color | Brand token only; semantic and chart colors never represent generic selection/action |
| Chart Colors  | `--color-chart-1` ~ `--color-chart-6` (semantic, complete across all themes) |
| Table Colors  | `--color-table-header`, `--color-table-row-alt`, `--color-table-footer` |
| Animations    | Skeleton shimmer and short state transitions only; no decorative continuous motion |
| Login Page    | Standard surface-based form with protected registration flow and fixed `royal-white` theme for predictable contrast. |

---

## Folder Structure

```
gemstone-lifecycle-management/
├── claude.md                          # ← This file (project context)
├── README.md                          # 📖 Public project overview
├── start.md                           # 🤖 AI onboarding guide (entry point to docs/)
├── DATA_FETCHING_NOTES.txt            # 📝 Top Orders / Customer Sales data fetching notes
├── docs/
│   ├── debug-history.md               # 🔧 Debug history and resolution log
│   ├── GIT_WORKFLOW_GUIDE.md          # Multi-device Git workflow
│   ├── design/
│   │   ├── DESIGN.md                  # 🎨 Design system (canonical)
│   │   └── PRODUCT.md                 # 📋 Product overview document
│   ├── sales/
│   │   ├── dashboard.md               # Dashboard / report screens
│   │   ├── sales-menu.md              # Sales Analytics menu, naming, breadcrumbs
│   │   └── sales-db-views.md          # Sales SQL view preparation (TEST DB only)
│   ├── dba/
│   │   └── index-gap-and-proposal.md  # 🗄️ Live index state + proposed indexes for the DBA (not executed)
│   └── legacy/
│       ├── LEGACY_PCC_SYSTEM_ARCHITECTURE.md
│       ├── LEGACY_PO_TRACKER_ARCHITECTURE.md
│       ├── PO_TRACKER_REVAMP_PLAN.md
│       └── production_stages_mapping_log.md  # 📋 Production stages mapping reference
│
└── Jewelry Factory System/
    ├── .gitignore
    │
    ├── frontend/                      # ⭐ React + Vite + TypeScript
    │   ├── index.html                 # HTML entry point
    │   ├── vite.config.ts             # Vite config (proxy /api → :3001)
    │   ├── tsconfig.json              # TypeScript root config
    │   ├── tsconfig.app.json          # App-specific TS config
    │   ├── tsconfig.node.json         # Node TS config (vite.config)
    │   ├── eslint.config.js           # ESLint flat config
    │   ├── package.json
    │   │
    │   └── src/
    │       ├── main.tsx               # React entry (ThemeProvider wraps App)
    │       ├── App.tsx                # Route definitions (BrowserRouter + ProtectedRoute)
    │       ├── index.css              # 🎨 Global styles, theme variables, animations
    │       │
    │       ├── components/
    │       │   ├── layout/
    │       │   │   ├── AppLayout.tsx        # Shell layout (Sidebar + Topbar + Outlet)
    │       │   │   ├── DocumentLayout.tsx   # 🏗️ Unified Document Layout (IoC/Slot Injection)
    │       │   │   ├── Sidebar.tsx          # Left nav sidebar (role-based menu filtering)
    │       │   │   └── Topbar.tsx           # Top bar (search, theme switcher, breadcrumb)
    │       │   ├── dashboard/
    │       │   │   ├── StatCard.tsx              # Dashboard stat card component
    │       │   │   ├── CardDetailPanel.tsx       # Dashboard card drill-down panel (YoY comparison)
    │       │   │   ├── OrderTable.tsx            # PO Tracker order summary table (display-only)
    │       │   │   ├── overview/
    │       │   │   │   └── FactoryOutputTrendChart.tsx  # Custom HTML bar chart (not recharts)
    │       │   │   ├── customerSales/
    │       │   │   │   └── CustomerSalesChart.tsx       # ComposedChart (Bar + Line) for customer sales
    │       │   │   ├── productionSummary/
    │       │   │   │   ├── ProductionSummaryChart.tsx   # ComposedChart for production output by group
    │       │   │   │   ├── ProductionSummaryTable.tsx   # Data table for production output
    │       │   │   │   ├── ProductionSummaryToolbar.tsx # Toolbar component
    │       │   │   │   └── ProductionDashboardSkeleton.tsx # Loading skeleton
    │       │   │   ├── productionForecast/
    │       │   │   │   ├── ProductionForecastChart.tsx  # ComposedChart for forecast
    │       │   │   │   ├── ProductionForecastDashboard.tsx # Dashboard wrapper
    │       │   │   │   ├── ProductionForecastTable.tsx  # Data table for forecast
    │       │   │   │   └── ProductionForecastSkeleton.tsx # Loading skeleton
    │       │   │   ├── orderVolume/
    │       │   │   │   ├── OrderVolumeTrendChart.tsx    # ComposedChart (Line + Area) for trends
    │       │   │   │   ├── RiskCustomerChart.tsx        # BarChart for risk/overdue by customer
    │       │   │   │   └── VolumeFilterBar.tsx          # Filter toolbar
    │       │   │   ├── orderTracking/
    │       │   │   │   └── OrderTrackStepper.tsx        # FBE 17-step stepper
    │       │   │   ├── poTracker/
    │       │   │   │   └── OrderTable.tsx               # PO Tracker table (legacy path)
    │       │   │   ├── fbeOrderTrack/                   # FBE order tracking components
    │       │   │   └── topAnalytics/                    # Top analytics components
    │       │   ├── infographic/
    │       │   │   └── InfographicSalesTrends.tsx       # BarChart for customer trends comparison
    │       │   ├── period/
    │       │   │   └── PeriodSetupPanel.tsx             # ⭐ Centralized period filter popover (used across all dashboards)
    │       │   ├── sales/                               # Sales-specific sub-components
    │       │   ├── topOrders/                            # Top orders gallery sub-components
    │       │   ├── orderDetail/
    │       │   │   ├── LineDetailDrawer.tsx      # Order line detail side drawer (with photo tabs)
    │       │   │   ├── OrderLineTable.tsx        # Order lines data table
    │       │   │   ├── PhotoGalleryModal.tsx     # Photo gallery lightbox modal
    │       │   │   ├── format.ts                 # Number/date formatting utilities
    │       │   │   └── shared.tsx                # Shared order detail UI components
    │       │   ├── report/
    │       │   │   ├── CustomerReportFilters.tsx # Customer report filter panel
    │       │   │   └── CustomerReportTable.tsx   # Customer report matrix table
    │       │   ├── ui/
    │       │   │   └── CustomSelect.tsx     # ⭐ Shared custom dropdown (SSOT)
    │       │   └── navigation/
    │       │       └── NavGroup.tsx         # Collapsible nav group component
    │       │
    │       ├── pages/
    │       │   ├── audit/
    │       │   │   └── CCTVAuditPage.tsx      # 🛡️ CCTV IT Audit Report (/audit/cctv-report)
    │       │   ├── login/                     # Authentication page feature folder
    │       │   │   ├── LoginPage.tsx          # Page composition only
    │       │   │   ├── LoginPage.css          # Login-only layout, fields, modals, and responsive styles
    │       │   │   ├── login.constants.ts     # Copy, languages, images, and registration types
    │       │   │   ├── hooks/
    │       │   │   │   └── useLoginController.ts # Auth state and API workflow
    │       │   │   └── components/            # Forms, cover, language control, fields, and modals
    │       │   ├── Dashboard.tsx              # Factory Overview page (/dashboard/overview, admin only)
    │       │   ├── DashboardDetail.tsx         # Dashboard detail drilldown
    │       │   ├── SalesDashboard.tsx          # ⭐ Sales Summary By Rep
    │       │   ├── CustomerDashboard.tsx       # ⭐ Yearly Sales By Customer (metric: amount | qty)
    │       │   ├── CustomerReportPage.tsx      # ⭐ Customer Report (Matrix Table)
    │       │   ├── TopOrdersGalleryPage.tsx    # ⭐ Top Orders Gallery
    │       │   ├── TopOrdersAnalyticsPage.tsx  # Top Orders Analytics (draft)
    │       │   ├── POTrackerAdvanced.tsx       # ⭐ PO Tracker main (list view)
    │       │   ├── SalesCustomerGroupDetail.tsx     # ✅ Customer Order List
    │       │   ├── OrderDetailPage.tsx         # Order detail (by ord/po/group)
    │       │   ├── ItemDetailPage.tsx          # Item-level detail
    │       │   ├── ProductionSummaryPage.tsx   # ⭐ Production Summary (chart + table, period-aware)
    │       │   ├── ProductionForecastPage.tsx  # Production Forecast (wrapper)
    │       │   ├── OrderVolumeSummaryPage.tsx  # ⭐ Order Volume Summary (trends + risk)
    │       │   ├── FBEOrderTrackPage.tsx       # ⭐ FBE 17-step order tracker
    │       │   ├── PlaceholderPage.tsx         # Placeholder for unimplemented modules
    │       │   ├── NoAccessPage.tsx            # Shown at /no-access when a user has no permitted page
    │       │   ├── document/
    │       │   │   ├── ProcurementDocPage.tsx   # 🏗️ Procurement and Receiving (SPA, SRA, SRB, SIR)
    │       │   │   ├── RequisitionDocPage.tsx   # 🏗️ Orders and Requisitions (SOA, SIA, SIB, SIP, SIS)
    │       │   │   └── SampleDocPage.tsx        # 🏗️ Sample Room (SSA, SIM)
    │       │   └── subcontract/
    │       │       └── VendorPerformanceDashboardPage.tsx  # 🟡 UI Preview only (no backend)
    │       │
    │       ├── services/
    │       │   ├── authAPI.ts              # 🔐 Authentication (login, verify-admin)
    │       │   ├── poTrackerAPI.ts          # PO Tracker endpoints
    │       │   ├── orderAPI.ts             # Order detail endpoints
    │       │   ├── dashboardAPI.ts         # Dashboard/sales/customer stats
    │       │   ├── customerSummaryAPI.ts   # Customer summary fetch
    │       │   ├── itemYearlySummaryAPI.ts # Item yearly comparison
    │       │   ├── orderVolumeSummaryAPI.ts # Order volume trends/risk
    │       │   ├── orderTrackingAPI.ts     # FBE order tracking
    │       │   ├── productionSummaryAPI.ts # Production summary (year/month/week/day)
    │       │   ├── procurementAPI.ts       # Procurement document endpoints
    │       │   ├── requisitionAPI.ts       # Requisition document endpoints
    │       │   └── sampleAPI.ts            # Sample room endpoints
    │       │
    │       ├── hooks/
    │       │   ├── useCctvAuditForm.ts          # CCTV audit form state (localStorage + import/export + holidays)
    │       │   ├── usePeriodSetup.ts            # ⭐ Centralized period filter state management
    │       │   ├── useCustomerSalesData.ts      # Customer sales data hook
    │       │   ├── useCustomerReportData.ts     # Customer report data hook
    │       │   ├── useCustomerPageFilters.ts    # Customer page filter state
    │       │   ├── useOrderVolumeSummaryData.ts # Order volume summary hook
    │       │   ├── usePOTrackerAdvanced.ts      # PO Tracker data hook
    │       │   └── useTopOrdersGalleryData.ts   # Top orders gallery hook
    │       │
    │       ├── config/
    │       │   ├── api.ts                  # API base URL config
    │       │   ├── breadcrumbs.ts          # Breadcrumb definitions
    │       │   ├── cctvAuditConfig.ts      # CCTV audit defaults (columns, ✓/✗ options, signatures)
    │       │   ├── menuConfig.ts           # Sidebar menu structure definition (role-based)
    │       │   ├── formConfigs.ts          # Document form field configurations (all doc types)
    │       │   ├── customerGroups.ts       # SSOT for customer group mapping (N008, MLT, etc.)
    │       │   ├── orderDetailColumns.ts   # Order detail table column definitions
    │       │   └── productionSummaryConfig.ts # Production step/group/mode definitions
    │       │
    │       ├── contexts/
    │       │   └── ThemeContext.tsx    # Theme provider (dark-gold/royal-white/modern-dark)
    │       │
    │       ├── types/
    │       │   └── index.ts           # Shared TypeScript interfaces
    │       │
    │       ├── utils/
    │       │   ├── fetchWithAuth.ts          # 🔐 Fetch wrapper with JWT Bearer token injection
    │       │   ├── authRedirect.ts           # 🔐 Role home, role route guard, safe login returnTo (SSOT)
    │       │   ├── cctvAuditForm.ts          # CCTV audit pure helpers (generate / edit / validate / export JSON)
    │       │   ├── periodUtils.ts            # Period helper functions (getDefaultCompareYear, parseMonths, monthRange)
    │       │   ├── customerTrendsUrl.ts      # Customer trends URL builder
    │       │   ├── navigationUtils.ts        # Navigation utility helpers
    │       │   ├── photoUrl.ts               # Photo URL builder (psPhotoUrl, attachPhotoFallback)
    │       │   ├── printChart.ts             # Print chart utility
    │       │   ├── errors.ts                 # Error utility types
    │       │   ├── exportPOTrackerExcel.ts   # 📊 Excel export for PO Tracker data
    │       │   ├── exportOrderDetailExcel.ts # 📊 Excel export for Order Detail data
    │       │   └── exportOrderVolumeDetailsExcel.ts # 📊 Excel export for Order Volume
    │       │
    │       └── assets/                # Static assets (images, icons)
    │           └── hero.png           # Login page hero image
    │
    └── backend/                       # ⭐ Express + MSSQL
        ├── server.js                  # Express app entry (+ Photo Bridge routes)
        ├── db.js                      # SQL Server connection pool (singleton)
        ├── .env                       # 🔒 Local env (gitignored)
        ├── .env.example               # Env template
        ├── package.json
        │
        ├── middleware/
        │   └── authMiddleware.js      # 🔐 JWT verification middleware (Bearer token)
        │
        ├── routes/
        │   ├── auth.js                # 🔐 /api/auth — Login & Admin verification
        │   ├── orders.js              # ⭐ /api/orders — PO Tracker APIs (protected)
        │   ├── dashboard.js           # /api/dashboard — Dashboard/Sales/Customer stats (protected)
        │   ├── search.js              # /api/search — Global search (protected)
        │   ├── procurement.js         # /api/procurement — Procurement document APIs (protected)
        │   ├── requisition.js         # /api/requisition — Requisition document APIs (protected)
        │   ├── sample.js              # /api/sample — Sample room APIs (protected)
        │   └── lock.js                # /api/lock — Document locking (protected)
        │
        └── sql/                        # 🗄️ SP baselines, views, and planned index scripts
            ├── indexes.sql             # Planned index set (NOT deployed — see docs/dba/index-gap-and-proposal.md)
            ├── stored-procedures/      # Current SP baseline (stripped base64 blobs → returns SampleItemNo)
            ├── _baseline/              # Original SP/column/index snapshot (rollback + reference)
            └── README.md               # Application guide + change summary
```

---

## Coding Rules

### General

1. **Language**: All code and documentation must be written in English.
2. **Encoding**: UTF-8 across all files.
3. **Line Ending**: CRLF (Windows development environment).
4. **Git**: Never commit `.env`, `node_modules/`, `dist/`, or temporary test scripts.
5. **📋 Documentation Rule**: Whenever adding, modifying, or deleting features or fixing bugs, documentation must remain synchronized:
   - `claude.md`: Update Folder Structure, Business Modules, API Endpoints, and relevant domain sections.
   - `docs/debug-history.md`: Document encountered issues, root causes, and resolutions (for bugs and critical errors only).
6. **🔍 File Integrity Check Rule**: Before and after modifying any file, thoroughly review every line to avoid missing code, unclosed JSX tags, or syntax errors from regex replacements.
7. **🧹 Safe Refactoring & De-duplication Rule**: When tasked with cleaning up or removing duplication, follow this sequence strictly to prevent regression and scope creep:
   - **Find duplication through evidence, not memory**: Use Grep to locate references before removing or merging any component, function, or keyframe.
   - **Isolate legacy code from new changes before modifying**: Inspect `git show HEAD:<path>` to verify whether an unusual pattern was pre-existing. If legacy code is outside the requested scope, do not modify it without prior agreement.
   - **Inspect the superset of all real-world call sites before consolidating**: If identical components are copy-pasted across multiple files, analyze their collective props and usages before consolidating into `src/components/ui/` as a Single Source of Truth.
   - **Track multi-file edits systematically** to guarantee completeness.
   - **Always verify changes with real tools**: Run `npx tsc --noEmit -p tsconfig.app.json` and linting after modifications to ensure build validity.

### Frontend Rules

1. **Component Style**: Functional Components + Hooks only (no Class Components).
2. **Styling**: Tailwind CSS v4 as primary framework; inline `@theme` variables in `index.css`.
3. **Theme Variables**: All colors must reference CSS Custom Properties in the `@theme` block — never hardcode colors, and select role tokens (`--color-ui-*`) before palette tokens.
4. **Type Safety**: All components must type props using TypeScript interfaces (declared in `types/index.ts` or inline).
5. **Routing**: React Router v7 (`BrowserRouter` + `Routes` + `Route`), structured via `<Route element={<AppLayout />}>`.
6. **API Calls**: Encapsulate API calls inside the `services/` folder — never call `fetch` directly inside UI components.
7. **Icons**: Use `lucide-react` exclusively — import only utilized icons for tree-shaking.
8. **Menu Config**: Entire navigation menu structure resides in `config/menuConfig.ts` — never hardcode menus in Sidebar.
9. **Font Stack**:
   - Headings: `font-display` → Roboto
   - Body text: `font-body` → Roboto
   - Logo/Brand: `font-logo` → Cinzel
10. **Loading Skeletons & Refetching**: When adding or updating data boxes/cards on any page, update corresponding Loading Skeletons to eliminate Layout Shift on Initial Load.
    - **For Refetching/Refreshing**: Use a Dim Effect (`opacity-50 pointer-events-none` for ~450ms) across the target container instead of re-rendering skeletons or intrusive spinners, preventing flicker and rapid-click spam.
11. **UI Components & UX**:
    - Avoid native `<datalist>` for complex dropdowns; use custom React dropdown components to maintain full control over styling, z-index, hover states, and interactions.
    - **Accessibility & Contrast**: Body text must maintain a contrast ratio of at least 4.5:1, and large text at least 3:1 across all themes. Use opaque surfaces when backgrounds hinder readability.
    - **Capitalization**: Maintain consistent casing standards across the entire application (e.g., Title Case for "Sales", "Password") rather than mixing ALL CAPS and Title Case at the same hierarchy level.

### System-Wide Responsive And Loading Standard

- `AppLayout` is the shared responsive shell for every protected route. It uses `100dvh`; only the content outlet scrolls.
- Use `app-content-frame--dashboard` (max 1860px), `app-content-frame--dashboard-wide` (max 2400px), or `app-content-frame--workspace` (full width) according to the work surface.
- Use container breakpoints at 1200px, 1120px, and 620px. Below 820px viewport width, the sidebar opens as an overlay with a scrim.
- Never use CSS `zoom`, whole-page transforms, or viewport-based font scaling. Reflow grids, stack panels, wrap controls, or use local scrolling.
- Keep compact ERP typography fixed through `--erp-text-*` tokens and keep letter spacing at zero. Large screens gain working area, not larger type.
- Wide tables and toolbars may scroll inside their own region; the page document must not overflow horizontally.
- Keep Sidebar and Topbar visible during data loading. Skeletons replace only data-dependent content and must match the final layout footprint.
- Theme switching is immediate and must never display a full-screen loading overlay.
- Verify representative pages at 390x844, 1440x900, and 2560x1440 in `royal-white`, `dark-gold`, and `modern-dark`.

## Frontend Architecture Rules (UI Layout Patterns)

To prevent code pollution and eliminate tight coupling, the document system is architected around **Inversion of Control (IoC) / Slot Injection** through a single unified parent component: `DocumentLayout.tsx`.

## Skills & Portfolio Data Rules
1. **Single Source of Truth:** All system skills, portfolio records, and certification metadata must reside strictly inside `src/config/` (never hardcode data strings directly in UI `.tsx` files).
2. **Icon Mapping:** Bind Icon Library (`lucide-react`) component objects directly within config data structures to avoid runtime `switch-case` icon lookups in components.

### Global Architectural Guardrails:
1. **DocumentLayout (The Shell)** is strictly responsible for outer frame mechanics (toolbar button layout, left document search panel, loading/error states) and has **zero awareness of domain business logic**.
2. **Strictly forbidden to hardcode menu-specific business conditions** (such as gemstone attributes or CAD/PS photo API endpoints) within `DocumentLayout.tsx`.
3. When a page requires specialized data presentations, inject JSX via Extensible Props Slots:

```typescript
// Flexible props interface provided for child view injection
interface DocumentLayoutProps {
  renderHeaderSummary?: (header: any, lines: any[]) => React.ReactNode; // Top summary header slot
  renderSubDetailPanel?: (selectedLine: any, idx: number) => React.ReactNode; // Lower detail panel slot
  renderRightSidePanel?: (selectedLine: any, idx: number) => React.ReactNode; // Right photo/stats side panel slot
  renderFooterStats?: (lines: any[]) => React.ReactNode; // Table footer aggregation summary slot
  customModal?: React.ReactNode; // External modal or lightbox popup slot
}
```

### Backend Rules

1. **Module System**: CommonJS (`require` / `module.exports`) — `"type": "commonjs"` in `package.json`.
2. **DB Connection**: Always use `getPool()` from `db.js` — never initialize independent connection instances.
3. **SQL Injection**: Parameterized queries (`request.input()`) only — never interpolate raw user inputs into SQL strings.
4. **Error Handling**: Every route handler must use `try/catch` and return `{ ok: false, error: message }`.
5. **Response Format**: All API responses must follow the standard envelope: `{ ok: boolean, data?: any, error?: string }`.
6. **Logging**: Use `console.log` with emoji prefixes for debugging (`[EXEC SP]`, `[CACHE HIT]`, `❌`).
7. **Caching**: Utilize existing In-Memory Cache (`cache` Map + `inFlight` Map) for heavy analytical queries, but PO Tracker queries must always fetch live from the DB (no cache) to ensure real-time operational precision.
8. **Photo Handling**: Serve product images from network file shares via the Photo Bridge (`/api/photos/ps|cad/:itemNo` in `server.js` → `res.sendFile`) — **`toBase64Photo()` and VARBINARY queries are completely deprecated**, and never join `GMItemPhoto` in SQL queries.
9. **Stored Procedures**: Execute via `request.execute(spName)` — passing **strictly 2 Baseline Parameters (`@FromDate`, `@ToDate`)**. Never pass `@Status` or additional arguments, and never modify/ALTER SPs on the database (status filtering is performed In-Memory).

### Database Rules

1. **STRICT READ-ONLY (Never Modify DB)**: Prohibited from running DDL/DML, or altering Tables, Views, Stored Procedures, or Indexes on any database to ensure 100% compatibility with legacy VB.NET software.
2. **Connection Pool**: Pool size configuration: max=20, min=2, idle timeout 1 minute.
3. **Request Timeout**: 300 seconds (5 minutes) for large enterprise analytical datasets.
4. **Date Handling**: Use `sql.DateTime` for date parameters passed into Stored Procedures.
5. **VARBINARY**: Cast photo columns to `VARBINARY(MAX)` in historical SELECT statements.
6. **NULL Handling**: Use `ISNULL()` in WHERE clauses for nullable columns.

---

## Commands

### Frontend (Working Directory: `Jewelry Factory System/frontend`)

```bash
# Development server (port 3000, proxy /api → localhost:3001)
npm run dev

# Production build (TypeScript check + Vite build)
npm run build

# Lint (ESLint flat config)
npm run lint

# Preview production build locally
npm run preview
```

### Backend (Working Directory: `Jewelry Factory System/backend`)

```bash
# Production start
npm start              # → node server.js

# Development with auto-reload
npm run dev            # → nodemon server.js
```

### Health Check

```bash
# Verify API and DB connectivity
curl http://localhost:3001/api/health
```

### Environment Setup

```bash
# 1. Clone repository
git clone <repo-url>

# 2. Frontend setup
cd "Jewelry Factory System/frontend"
npm install

# 3. Backend setup
cd "../backend"
npm install
cp .env.example .env
# Configure .env with actual credentials (DB_HOST, DB_USER, DB_PASS, DB_NAME)

# 4. Run both concurrently (using 2 separate terminals)
# Terminal 1: Backend
cd "Jewelry Factory System/backend"
npm run dev

# Terminal 2: Frontend
cd "Jewelry Factory System/frontend"
npm run dev
```

---

## API Endpoints

### Authentication (Public — No token required)

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| POST   | `/api/auth/login`         | Login (returns JWT + role)         |
| POST   | `/api/auth/verify-admin`  | Verify admin password (for registration flow) |

> ⚠️ All endpoints below (except Auth and Photo Bridge) require an `Authorization: Bearer <token>` header — requests without valid tokens receive 401 Unauthorized.

### PO Tracker (Protected)

| Method | Endpoint                                    | Description                           |
|--------|---------------------------------------------|---------------------------------------|
| GET    | `/api/orders`                               | Order list (aggregated, cached)       |
| GET    | `/api/orders/:ordNo`                        | Order detail (single or grouped)      |
| GET    | `/api/orders/by-po/:poNo`                   | Order detail by PO Number             |
| GET    | `/api/orders/group/:cust/:addr/:kind/:mat/:duedate` | Group detail across 5 axes    |
| GET    | `/api/photos/ps/:itemNo` · `/api/photos/cad/:itemNo` | Item photos from network path (Photo Bridge, unauthenticated) — deprecated `/api/orders/photo/:itemNo` (base64) |

**Query Parameters for `/api/orders`:**

| Param      | Type   | Default   | Description                      |
|------------|--------|-----------|----------------------------------|
| `dateFrom` | string | 7 months ago | Start date (ISO format)       |
| `dateTo`   | string | today     | End date (ISO format)            |
| `dateType` | string | `All`     | SP selector: `OrdDate`, `DueDate`, `CustDueDate`, `FinDate`, `All` |
| `status`   | string | `pending` | `pending`, `finish`, or `All` |
| `noCache`  | string | —         | Flag to bypass cache             |

### Dashboard and Sales Analytics Details
Dashboard/report endpoint details moved to docs/sales/dashboard.md. Sales menu/navigation details moved to docs/sales/sales-menu.md.

### Documents — Unified DocumentLayout (Protected)

| Method | Endpoint                              | Description                        |
|--------|---------------------------------------|------------------------------------|
| GET    | `/api/procurement/list`               | Procurement document list (SPA/SRA/SRB/SIR) |
| GET    | `/api/procurement/:docNo`             | Procurement document detail        |
| GET    | `/api/requisition/list`               | Requisition document list (SOA/SIA/SIB/SIP/SIS) |
| GET    | `/api/requisition/:docNo`             | Requisition document detail        |
| GET    | `/api/sample/list`                    | Sample room document list (SSA/SIM) |
| GET    | `/api/sample/:docNo`                  | Sample room document detail        |
| POST   | `/api/lock/acquire`                   | Acquire document edit lock         |
| POST   | `/api/lock/release`                   | Release document edit lock         |

### Photo Bridge (Network File Server → HTTP)

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/api/photos/ps/:itemNo`    | PS Photo (Cost) from `\\<FILE_SERVER>\Photo\Cost` |
| GET    | `/api/photos/cad/:itemNo`   | CAD Photo from `\\<FILE_SERVER>\Photo\Mold(CAD)` |
| GET    | `/api/photos/:itemNo`       | Legacy endpoint (backwards compatibility) |

### Search & System

| Method | Endpoint       | Description               |
|--------|----------------|---------------------------|
| GET    | `/api/search`  | Global search             |
| GET    | `/api/health`  | Health check (API + DB)   |

---

## Development Workflow

### Day-to-Day Development

1. **Open 2 terminals** — Backend (`npm run dev`) + Frontend (`npm run dev`).
2. **Vite Dev Server** (port 3000) automatically proxies `/api/*` to Backend (port 3001).
3. **Hot Reload**: Frontend supports HMR; Backend automatically restarts with nodemon.
4. **Test API**: Inspect with browser DevTools Network tab or direct `curl` requests to `:3001`.

### Adding a New Page

1. Create page component under `src/pages/NewPage.tsx`.
2. Register route in `src/App.tsx` under `<Route element={<AppLayout />}>`.
3. Add navigation entry in `src/config/menuConfig.ts`.
4. (If invoking APIs) Create service client under `src/services/newPageAPI.ts`.
5. (If introducing new domain types) Declare interfaces in `src/types/index.ts`.

### Adding a New API Route

1. Create route handler in `backend/routes/newRoute.js`.
2. Register router in `backend/server.js`: `app.use('/api/new-route', require('./routes/newRoute'))`.
3. Access database via `const { getPool, sql } = require('../db');`.
4. Wrap execution inside `try/catch` and return standard envelope `{ ok: boolean, ... }`.

### Theme Development

1. Theme variables declared in `src/index.css` → `@theme { ... }` block.
2. Theme overrides defined in `@layer base` → `.theme-<name> { ... }`.
3. Toggle themes via `ThemeContext` → `useTheme()` hook.
4. All components must reference theme tokens — hardcoded color values are strictly prohibited.

### Database Considerations

- **Strict Read-Only & Zero-Modification**: Prohibited from modifying or running mutation scripts against the database (100% Read-Only) to preserve legacy VB.NET compatibility.
- **SP Parameter Compatibility (Baseline 2 Params)**: All 5 Stored Procedures support strictly 2 baseline parameters: `@FromDate` (DateTime) and `@ToDate` (DateTime). Never pass `@Status` or extra parameters, which causes immediate parameter count mismatch crashes in the legacy VB.NET system.
- **Application-Layer Filtering**: Status filtering ('pending' / 'finish' / 'all') is handled entirely In-Memory within Backend Node.js and Frontend React.
- **Aggregation**: Node.js performs multi-dimensional grouping (5 axes: Cust, PO, Kind, ShipTo, Material + CustDueDate) after the SP returns raw records.
- **Connection Pool**: Database pool reconnects automatically upon connection interruptions without requiring server restarts.

---

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

**Backend Call Site:** `routes/poTracker.js` (and `routes/orders.js`) → `request.execute(spName)` passing strictly `@FromDate` and `@ToDate`.

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

---

## Environment Variables

### Backend `.env`

```env
DB_HOST=<SQL Server hostname or IP>
DB_PORT=1433
DB_NAME=<database name>
DB_USER=<username>
DB_PASS=<password>
API_PORT=3001
JWT_SECRET=<random secret key for JWT signing>
APP_ADMIN_PASSWORD=<admin login password>
APP_SALES_PASSWORD=<sales login password>
```

> ⚠️ Never commit actual `.env` files — use `.env.example` as the distribution template.

---

## Important Notes

1. **Internal Tooling**: Designed for intranet deployment within the factory LAN, secured with JWT, role-based access control (admin/sales), and per-user menu permissions (`allowedMenus`) — sales role defaults to Sales Analytics + the Production group (incl. PO Tracker); admin role has full access. See "2026-11-09 Menu Permission Enforcement".
2. **Production DB Queries**: Handle heavy queries responsibly; utilize caching for expensive analytical requests.
3. **Typography**: Uses Roboto as the core application and data table font family.
4. **Legacy Migration**: Progressively modernizing VB.NET modules; remaining unported modules are represented with placeholders.
5. **Photo Pipeline**: Historical images stored as VARBINARY are deprecated in favor of high-performance file server streaming via Photo Bridge to keep payloads lean.

---

## Order Prefixes Analysis (As of May 25, 2026)

Based on latest order activity analysis (latest `OrdDate`) across the complete `OrdHD` table, order prefixes are categorized into active and obsolete groups:

### ✅ Active Orders (Active with transactions in 2025–2026)
| Prefix | Total Order Count | Latest Activity | Operational Notes |
|--------|-------------------|-----------------|-------------------|
| **BBC** | 118,809 | 2026-05-25 | Mapped to legacy system button |
| **BBQ** | 14,221 | 2026-05-25 | Mapped to legacy system button |
| **BBD** | 5,206 | 2026-05-25 | ⚠️ No legacy button, but actively used |
| **BBI** | 818 | 2026-05-22 | ⚠️ No legacy button, but actively used |
| **BBF** | 62 | 2026-05-21 | Mapped to legacy system button |
| **BBP** | 1,461 | 2026-05-19 | Mapped to legacy system button |
| **BBT** | 1,126 | 2026-05-15 | Mapped to legacy system button |
| **BBX** | 189 | 2026-05-08 | ⚠️ No legacy button, but actively used |
| **BBK** | 353 | 2026-04-30 | Mapped to legacy system button |
| **BBR** | 1,610 | 2026-04-09 | Mapped to legacy system button |
| **BBL** | 4,909 | 2026-04-09 | Mapped to legacy system button |
| **BBS** | 762 | 2026-04-06 | Mapped to legacy system button |
| **BBE** | 38 | 2025-04-29 | Mapped to legacy system button |

### ❌ Inactive/Dead/Sample Orders (Obsolete historical records excluded from analytics)
*These prefixes have had no transactions for multiple years and are excluded from Dashboard metrics to protect statistical accuracy:*

- **BTC** (5,231) — Latest 2022-10-14
- **BBA** (3,354) — Latest 2022-10-13
- **BOC** (1,378) — Latest 2022-10-12
- **BPC** (1,263) — Latest 2022-09-30
- **LBC** (608) — Latest 2020-11-26
- **LBS** (104) — Latest 2020-05-13 *(Sample prototypes)*
- **LBT** (17) — Latest 2020-02-28
- **BTS** (1) — Latest 2020-01-08
- **LLC** (239) — Latest 2016-07-29
- **GBT** (296) — Latest 2016-03-02
- **IBT** (37) — Latest 2016-02-18
- **SBC** (6,005) — Latest 2016-02-08
- **SBT** (3,151) — Latest 2015-12-23
- **CBT** (146) — Latest 2015-10-23
- **SPC** (337) — Latest 2015-09-11
- **SPT** (143) — Latest 2015-08-21
- **KBT** (586) — Latest 2015-08-19
- **KPT** (87) — Latest 2015-08-19
- **BRC** (11) — Latest 2015-07-17
- **GGT** (1) — Latest 2015-06-25
- **CPT** (13) — Latest 2015-03-23
- **CBC** (379) — Latest 2015-02-02
- **BLC** (5) — Latest 2014-10-27
- **BPT** (256) — Latest 2013-03-26
- **GPT** (4) — Latest 2013-03-23
- **BTT** (20) — Latest 2013-01-11
- **CPC** (3) — Latest 2012-06-22
- **GBC** (2) — Latest 2011-09-02
- **GTT** (4) — Latest 2011-08-31

---

## Document Page Design Standard

- **Unified Layout**: All document forms (Procurement, Requisition, Sample Room) share the unified structure of `DocumentLayout.tsx` to eliminate code duplication.
- **Flat & Enterprise UI**: Avoid decorative gradients (`bg-gradient-*`); employ solid, high-contrast, professional styling aligned with enterprise ERP paradigms.
- **Visual Distinctness**: Use borders and `bg-[var(--color-surface-*)]` tokens to partition content clearly across Headers, Details, and Item Lines.
- **Data Configuration**: All form and table definitions are centralized in `formConfigs.ts` for ease of maintenance.

## Operational Data Visualization Standard (System-Wide)

This standard applies to every dashboard, report, KPI, chart, and infographic in the system. A visualization is an operational control, not decoration. It must help the user understand a situation, identify the cause, or continue to the records that require action. If a visual does none of these better than a number or table, do not add it.

### Information Architecture

- Arrange analytical pages in the order `Scope/Filters -> Summary -> Explanation -> Details/Action`.
- Show the easiest overview first, then let users switch or drill down to exact records without opening a duplicate menu page.
- Keep active filters, sort, selected measure, and drill-down context when moving between overview and detail.
- Before adding any local selector, audit the existing page-level filters. Reuse an existing control when its meaning and scope are the same; add a second control only when it intentionally controls an independent dataset and the distinction is visible.
- Display the active data scope, unit, period, comparison basis, and last refresh time where relevant.
- Search affects only the dataset explicitly labeled by that search field. It must not silently change unrelated KPIs or charts.

### Choosing The Right Display

- Use a KPI for one exact result that users must recognize quickly.
- Use a line or column chart for change over time.
- Use stacked columns/bars for total plus composition; use 100% stacked only when the question is share, not volume.
- Use sorted horizontal bars for rankings.
- Use small multiples with the same scale when comparing periods or groups would make one chart crowded.
- Use a table when users need exact rows, many attributes, reconciliation, export, or direct actions.
- Use a funnel only for a real sequential process where each stage shares the same population.
- Avoid pie/donut charts for trends or many categories, 3D charts, decorative gauges, gradients, illustrations, and animation that does not communicate state.
- Do not repeat a KPI as a chart unless the chart adds trend, composition, distribution, or comparison.

### KPI Requirements

- Every KPI must include a clear label, formatted value, unit, and active period.
- A delta or trend arrow is allowed only when its comparison period and calculation are explicit.
- Do not mix order count, item quantity, weight, and amount under an ambiguous label such as `Total`.
- When a KPI combines categories, provide a compact breakdown or a direct path to the contributing records.

### Interaction And Drill-Down

- Tooltips must show exact values, units, category, period, and denominator/percentage when applicable.
- Clicking, tapping, or keyboard-activating a meaningful data point must filter or open the corresponding detail records when those records exist.
- Show drill-down context as a title, breadcrumb, or removable filter chips, with a clear reset/back action.
- Keep chart legends and series names consistent with filters, tables, exports, and domain terminology.
- Hover-only information is insufficient. The same information and action must be available by keyboard and touch.

### Color And Accessibility

- Apply the 60-30-10 rule across the entire system: `--color-ui-canvas` (~60%) for app backdrop, `--color-ui-surface` / `--color-ui-raised` (~30%) for content workspaces, and `--color-ui-interactive` (~10%) for primary actions, selection, and focus states.
- These proportions represent visual visual hierarchy targets, not strict pixel counts; status indicators and chart series are purposeful analytical exceptions.
- Primary buttons, active links, selected tabs/filters, navigation indicators, and focus rings utilize the dedicated Brand role token exclusively. Never use success/warning/danger or customer group palette colors to represent generic interactive selection.
- Use color only for defined meaning: status, severity, selection, process stage, or data series.
- Keep the same meaning and series color consistent across the system. Do not assign decorative colors to categories with no analytical purpose.
- Color must never be the only identifier; use labels, icons, patterns, ordering, or text as a second cue.
- Provide visible keyboard focus, sufficient contrast in every theme, screen-reader names, and readable labels at all supported sizes.
- Never write raw hex, rgb, hsl, oklch, named colors, or hardcoded Tailwind colors into components; add design tokens in `src/index.css` and run `npm run lint:colors` (`npm run lint` enforces this automatically).

### Data Integrity

- KPI, chart, table, and export totals must use the same filter scope and calculation definitions.
- Clearly distinguish zero, missing, unavailable, and not-applicable values. Never silently remove them.
- Comparison charts must use compatible units and scales. Side-by-side period comparisons use the same axis scale unless a difference is clearly disclosed.
- Currency, quantity, weight, percentage, date, and timezone formats must be consistent with the domain and locale.
- Production screens use production-stage language and status semantics. Sales screens use customer, order, item, shipment, quantity, and amount semantics. Do not mix the domains without an explicit cross-domain view.

### States, Responsive Behavior, And Performance

- Provide loading skeleton, empty, error, partial-data, stale-data, and permission-denied states.
- Empty states must identify the active scope and offer a useful recovery action such as clearing filters.
- On smaller screens, reduce simultaneous comparisons, allow purposeful scrolling, or switch views. Never overlap, clip, or shrink labels until unreadable.
- Reuse fetched data when only changing presentation. Memoize expensive derived datasets and avoid unnecessary API requests.
- Keep motion between 150-250 ms and use it only to explain selection, transition, loading, or drill-down.

### Domain Examples

- Customer Trends: monthly order type mix -> filtered order lines.
- Production: delayed work by stage -> affected jobs or orders.
- Procurement: overdue or pending purchase orders -> matching PO records.
- Dispatch: shipment volume/status by period -> matching shipment rows.

### Definition Of Done

- Every visual has a named business question and a user action or decision it supports.
- Filters update all in-scope KPIs, charts, details, and exports consistently.
- Drill-down returns the correct records and can be cleared without losing the page context.
- Displayed totals reconcile with the API and detail records for the same scope.
- The workflow is tested on desktop and mobile with mouse, keyboard, and touch where applicable.
- Loading, empty, error, zero, partial-data, and long-label cases are verified.

## Testing & Cleanup Rules

- Never remove legacy pages (e.g., `SOAPage.tsx`, `ProcurementPage.tsx`) until the Unified Layout and new replacement pages are thoroughly tested without regression.
- Before removing legacy files, verify that routing definitions in `App.tsx` have been successfully migrated to the new components.
- Confirm all API interactions are migrated into dedicated service modules under `src/services/`.

---

## Split Domain Documents

Detailed dashboard/report guidance has moved to docs/sales/dashboard.md.

Detailed Sales Analytics menu, naming, breadcrumb, and Customer Trends guidance has moved to docs/sales/sales-menu.md.

## Subcontract Management — Planned Module

### Status: 🟡 UI Preview 1/3 (No Backend)
Sidebar menu group `subcontract` (icon: `handshake`) includes 3 entries:
- `/subcontract/vendor-performance` — Vendor Performance Dashboard — **`VendorPerformanceDashboardPage.tsx`** implements the layout reference (Filters, KPI tiles, Chart cards, Detail table with grouped headers and Grand Total), but all values display `N/A` empty states with a top banner indicating "Live data connection pending". **Never introduce fabricated mock values** until real backend Stored Procedures are integrated.
- `/subcontract/vendor-price-history` — Currently implemented as `PlaceholderPage.tsx`.
- `/subcontract/aging-report` — Currently implemented as `PlaceholderPage.tsx`.

### Target Design Reference
Design blueprint based on the companion **"PCC System: Subcontract Management"** interface for future implementation:
- Flat icon-circle KPI tiles without gradients or glassmorphism (following PO Tracker design patterns).
- Filter sidebar/section displaying all filter controls simultaneously (Date Range, Subcontract, Department, Process, Item Group) rather than hiding behind toggles.
- Vendor Performance Dashboard: KPI row + 3 horizontal bar charts (On-Time Delivery %, Avg Lead Time, Defect Rate) + Detail table with grouped headers and Grand Total row.
- Vendor Price History: Multi-series line chart (vendor pricing over time) + Latest Price Comparison table + Price History Detail table with pagination.
- Aging Report: KPI row (Aging buckets 0-3 / 4-7 / 8-14 / >14 days) + paired Donut and Bar charts + Detail table.

**Note**: Backend APIs and Stored Procedures for vendor and subcontract data do not yet exist in the database — complete backend definitions must be created prior to production UI activation (strictly no mock data in production builds).

---

## 2026-07-16 API/Route Domain Split Notes

### Scope
- Split mixed dashboard/customer sales/item yearly code by domain responsibility while preserving existing endpoint URLs.
- This is a structure-only refactor for API client files and Express route files; business query behavior should remain the same.
- TopOrdersAnalyticsPage.tsx is still a draft page, so only import boundaries were updated there. Do not perform a heavy component rewrite until the page direction is confirmed.

### Frontend Service Ownership
- src/services/dashboardAPI.ts: dashboard core only (years, dashboard cards, card detail, sales summary) plus temporary compatibility re-exports.
- src/services/customerSummaryAPI.ts: customer summary fetch for /api/dashboard/customer-summary.
- src/services/customerSalesAPI.ts: sales customer groups, sales monthly/type analytics, sales orders, and top items.
- src/services/itemYearlySummaryAPI.ts: item yearly and item/customer yearly comparison endpoints under /api/items.

### Backend Route Ownership
- backend/routes/dashboard.js: dashboard core endpoints only.
- backend/routes/customerSummary.js: /api/dashboard/customer-summary.
- backend/routes/customerSales.js: /api/dashboard/sales-* and /api/dashboard/top-items endpoints with shared sales filters.
- backend/routes/itemYearlySummary.js: item yearly summary endpoints.
- backend/routes/items.js: compatibility wrapper for itemYearlySummary.
- backend/server.js mounts the new routers under the same /api/dashboard and /api/items prefixes, so frontend URLs do not change.

### Refactor Rule
- When moving more code, split by real business responsibility first, then rename. Do not rename a large file blindly if it still contains multiple domains.

---
## Route Comment Standard

Use short guide comments that make ownership obvious at first read.

For backend route files, prefer a top overview block with:
- Route
- Page/Menu
- Description
- Filter policy or data boundary

Inside route handlers, add only short section labels for important boxes/queries, for example KPI cards, Top 30 Items, drilldown rows, or comparison data. Avoid comments that explain obvious syntax.

---
## 2026-07-30 Presentation & Code Quality Updates (Phase 1-4)

### Scope
- Addressed security vulnerabilities in Login (DB auth, bcrypt, removed localStorage tokens on logout).
- Built Executive Overview page (`/dashboard/overview`) as the main entry point for client presentations.
- Refactored frontend structure for maintainability.

### Frontend Structural Refactoring (Phase 4)
- **LoginPage**: Extracted massive inline styles into `LoginPage.css`.
- **SalesCustomerGroupAnalytics**: Refactored massive 1,700+ line component into modular sub-components for KPIs, charts, filters, and drill-down tables.
- **TopOrdersGalleryPage**: Separated gallery cards and ranking tables into dedicated sub-components.
- Centralized UI notifications into a shared Toast component for consistent error and success handling across the application.

---

## 2026-09-03 FBE Order Tracker Module (FBE Production Order Status Tracking System)

### 1. Module Overview & File Architecture
- **Route**: `/production/fbe-order-track`
- **Frontend Page**: `src/pages/FBEOrderTrackPage.tsx`
- **Stepper Component**: `src/components/dashboard/orderTracking/OrderTrackStepper.tsx`
- **Frontend Service**: `src/services/orderTrackingAPI.ts` -> `getOrderTracking(ordNo, ordLineNo)`
- **Backend Route**: `backend/routes/orderTracking.js` (`GET /api/order-tracking/track?ordNo=...&ordLineNo=...`)
- **Photo Bridge Endpoints**:
  - Primary: `/api/photos/ps/:itemNo` (Real product photo from Photo Server)
  - Fallback: `/api/photos/cad/:itemNo` (Rendered CAD mold preview)
  - Helper: `src/utils/photoUrl.ts` (`psPhotoUrl`, `attachPhotoFallback`)

### 2. Data Sources & Schema Mapping
1. **Order Header & Detail Specs**:
   - Table `OrdHD`: Fetches `CustCode`, `OrdDate`, `DueDate`, `PONo`
   - Table `OrdDT`: Fetches `ItemNo`, `ItemMat`, `ItemCust`, `ItemDesc`, `ItemStone`, `ItemPlate`, `ItemSize`, `ItemQty`, `OrdLineNo`
   - SQL Query Condition: `OrdHD.OrdNo = @ordNo AND OrdDT.OrdLineNo = @ordLineNo`
2. **FBE 17-Step Production Pipeline**:
   - Pipeline Sequence:
     1. Grind (Grinding - `GR`)
     2. Tumbling 1 (Tumbling 1 - `TB`, Dept: `TB1`)
     3. Assemble 1 (Assembly 1 - `AS`, Dept: `AS1`)
     4. Laser 1 (Laser 1 - `LS`, Dept: `LS1`)
     5. Filing 1 (Filing/Sandpaper 1 - `FL`, Dept: `FL1`)
     6. Tumbling 2 (Tumbling 2 - `TB`, Dept: `TB2`)
     7. Epoxy (Enamel/Coloring - `EP`)
     8. Filing 2 (Filing/Sandpaper 2 - `FL`, Dept: `FL2`)
     9. Lapping (Faceting/Lapping - `LP`)
     10. Copper (Copper Plating - `CP`)
     11. Polish 1 (Polishing 1 - `PL`, Dept: `PL1`)
     12. Assemble 2 (Assembly 2 - `AS`, Dept: `AS2`)
     13. Laser 2 (Laser 2 - `LS`, Dept: `LS2`)
     14. Filing 3 (Filing/Sandpaper 3 - `FL`, Dept: `FL3`)
     15. Polish 2 (Polishing 2 - `PL`, Dept: `PL2`)
     16. IQC (Quality Inspection - `IQ`)
     17. Plating (Final Plating - `PT`)
3. **Tracking Quantities (Send vs. Receive)**:
   - Outgoing (Send): Table `${prefix}SenHD` (DocuDate, DocuStatus, DocuNo) INNER JOIN `${prefix}SenDT` (SenQty) WHERE `ProFac = 'FBE' AND OrdNo = @ordNo AND OrdLineNo = @ordLineNo`
   - Incoming (Receive): Table `${prefix}RecHD` (DocuDate, DocuNo) INNER JOIN `${prefix}RecDT` (RecQty) WHERE `ProFac = 'FBE' AND OrdNo = @ordNo AND OrdLineNo = @ordLineNo`
   - Work In Progress Balance per step: `Balance = RecQty - SenQty`
4. **Step Status Evaluation Logic**:
   - `status = 2` (**Done / Completed**): Document exists and `balance === 0` (all processed quantities passed onward).
   - `status = 1` (**In-Progress / WIP**): Received into stage and `balance > 0`.
   - `status = 0` (**Pending / Waiting**): No intake document recorded for this stage yet.
5. **Concurrency Guards (2026-11-09, `/track`)**:
   - All `/track` reads use `WITH (NOLOCK)`: the legacy VB.NET system writes these tables all day, and `OrdNo` lookups scan whole tables (see "Database Indexes (Current State)"), so locking reads deadlocked (error 1205).
   - Same policy applied to the global Topbar search (`routes/search.js`, all 4 queries).
   - **System-wide NOLOCK policy**: every display-only read of OrdHD/OrdDT/GMCust/GMEmp/GMHoliday/OrdWeekPlanHD, the `VW_Web_*` views, the `{XX}Sen/Rec` step tables, and the `dbInventory` requisition tables uses `WITH (NOLOCK)` (routes: `customerReportMatrix`, `orderLinesIssues`, `orderVolumeSummary`, `poTracker`, `productionDashboard`, `productionForecast`, `productionSummary`, `topOrdersGallery`, `orderTracking`, `search`). **Deliberately WITHOUT NOLOCK**: the PO Tracker remark read-before-UPDATE (`POST /api/orders/remarks`), requisition `GET /next-number/:docType` (feeds new document numbers), `auth.js` / `adminUsers.js`, and stored procedure calls (`PC_Show_OrdTrack_Sum_*` cannot be changed; never use `SET TRANSACTION ISOLATION LEVEL` on pooled connections — on SQL 2012 it leaks to the next request on that connection). Never add NOLOCK to CTE names.
   - Known pre-existing behaviors: several dashboard queries rank/sort without a full tie-breaker, so equal-value rows can swap between calls; `/api/items/salespersons` returns one case variant of names stored with different casing (e.g. `Jessica` / `JESSICA`); `GET /api/items/yearly-summary` (unused by the UI) fails with a SQL `GROUP BY` error.
   - Known pre-existing issue: search queries use `TOP 10` without `ORDER BY`, so results for the same term can differ between calls.
   - `queryWithDeadlockRetry` retries a deadlocked query twice (200 ms, 600 ms); if it still fails the API returns **503** `"The database is busy right now..."`.
   - The step loop skips a step only when its table is missing (error 208). Any other SQL error fails the request — never show a false `Pending` step.
   - `ordLineNo` must be numeric (`OrdDT.OrdLineNo` is INT) → otherwise **400**.
   - `OPTION (MAXDOP 1)` was tested and rejected (~2x slower on these scans).
   - **Indexes**: no index supports `OrdNo` lookups on `OrdHD`/`OrdDT` or the `{XX}SenDT`/`{XX}RecDT` tables — see "Database Indexes (Current State)" and the DBA proposal `docs/dba/index-gap-and-proposal.md`.

### 3. Design Standards & Strict Guardrails
1. **Module Encapsulation & Folder Hierarchy**:
   - **Strict Rule**: When building new features or modules, encapsulate dedicated components inside a dedicated directory under `src/components/...`. Never scatter loose components into generic root folders.
   - Decompose complex views into modular sub-components (e.g., separating tables, charts, and filter bars from page containers).
2. **Strict No Hardcoded Colors**:
   - Every UI element must reference CSS Design Tokens from `src/index.css` (100% compliance).
   - Validated via `npm run lint:colors` (0 violations required).
   - Contrast must adhere to WCAG 2.1 Level AA (body text >= 4.5:1, borders and timeline links >= 3.0:1).
3. **Single-Screen Fit 2-Column Layout (Zero Whole-Page Scrolling)**:
   - **Left Column (~75%)**:
     - *Order Information*: 3-column metadata grid, with 12.5px–13.5px typography for crisp projector visibility.
     - *Active Step Highlight Banner*: Warm accent banner identifying the active manufacturing phase and completed count.
     - *Production Progress*: Connected 17-step continuous horizontal timeline.
     - *Step History Table*: Intake/handover audit ledger with internal scroll bounds.
   - **Right Column (~25%)**:
     - *Item Photo*: 375px compact frame with centered alignment, clean borders, and no redundant captions.
     - *Summary Dashboard*: Circular Donut Gauge accompanied by 4 prominent borderless KPI metric cards.
4. **Search Bar & Empty Standby**:
   - Initial values for `ordNo` and `ordLineNo` default to empty strings (`''`) without placeholders, bypassing auto-queries on mount.
   - Standby state: Metrics and attributes display subtle placeholder dashes (`-`).
5. **17-Step Production Stepper**:
   - Numeric quantities removed from timeline nodes to maintain clean visual scan paths.
   - Date / State row:
     - Completed stages: Displays completion date (`DD/MM`).
     - In-progress stage: Displays animated **`In Progress`** badge with smooth 2.4s pulsing cadence (`.step-current-blink`, `.text-current-blink`).
     - Upcoming stages: Displays **`Pending`** label.
6. **Step History Table**:
   - Status column: Bold (**800**) typography colored by state without borders/background chips (`Done (Y)` green, `In Progress (O)` amber).
   - Table background matches card surface (`var(--color-ui-surface)`) without zebra striping.
7. **Summary Progress Card**:
   - Donut Gauge: Executive aesthetic featuring smooth cubic-bezier loading rotation with "Processing..." label.
   - Active render: Bold 24px completion percentage with "Overall Progress" caption.
   - 4-Quadrant Metric Block: Clean 26px typography (Total=Blue, Completed=Green, In-Progress=Amber, Balance=Slate/Navy).

### 4. Period Setup Consolidation (Sept–Oct 2026) — ✅ Completed
- **Goal**: Consolidate redundant "Period Setup" logic into a single centralized hook `usePeriodSetup` + UI component `PeriodSetupPanel.tsx`.
- **Scope**: All dashboards — CustomerDashboard, CustomerReport, SalesDashboard, ProductionSummary, ProductionForecast, OrderVolumeSummary.
- **Key Files**:
  - `src/hooks/usePeriodSetup.ts` — Centralized state management (presets, compare years, week/month/day ranges, URL sync)
  - `src/components/period/PeriodSetupPanel.tsx` — Shared popover UI with preset buttons, month/week/day selectors, compare year checkboxes
  - `src/utils/periodUtils.ts` — Shared helpers (`getDefaultCompareYear`, `parseMonths`, `monthRange`)
- **Supported Presets**: `full-year`, `ytd`, `this-month`, `last-month`, `month`, `week`, `day`, `custom`
- **Default Period**: `full-year` (changed from `month` on 2026-10-01)
- **Compare Target**: Checkbox-based activation (Compare 1 / Compare 2) with auto-selection of compare year
- **Status**: ✅ Completed and deployed across all dashboard pages.

---

## 2026-09-25 PO Tracker Modernization & Strict DB Baseline Compatibility

### 1. Strict Zero-DB-Modification Policy
- **🛑 Prohibited from modifying the database (100% READ-ONLY)**: Under no circumstance execute DDL/DML, or ALTER/CREATE/DROP Stored Procedures, Tables, Views, or Indexes on the database server.
- **Legacy System Compatibility (Legacy VB.NET / PCC Management System)**:
  - All 5 Stored Procedures (`PC_Show_OrdTrack_Sum_OrdDate`, `_DueDate`, `_CustDueDate`, `_FinDate`, `_All`) must maintain their **Original Baseline Signature accepting 2 Parameters (`@FromDate`, `@ToDate`)**.
  - Any SP modifications or added parameters (e.g., `@Status`) cause immediate OLE DB parameter count mismatch crashes in the legacy VB.NET software.
  - All filtering and analytical recalculations must be executed within the Application Layer (Node.js backend / React frontend).

### 2. PO Tracker Current Architecture & Logic
1. **Backend Signature Compatibility (`routes/poTracker.js`)**:
   - Backend calls Stored Procedures passing strictly the 2 baseline parameters: `@FromDate` and `@ToDate`.
   - Completely eliminated passing `@Status`.
   - In-Memory caching disabled to guarantee real-time data freshness.
   - Stripped binary buffers of `ItemPhoto` from JSON payloads to optimize network throughput.
2. **In-Memory Status Filtering**:
   - `Pending`: Filters rows where `UnFinishQty !== 0` (active work in progress).
   - `Finish`: Filters rows where `FinishQty !== 0` (completed production).
   - `ALL`: No filtering; outputs all rows.
3. **Customer Group Mapping**:
   - `N008`: Customer codes `N008`, `N048`, `N066-N075`
   - `N044`: Customer codes `N044`, `N064`, `N065`
   - `N051`: Customer code `N051`
   - `N098`: Customer code `N098`
   - `MLT`: Customer codes `U411-U426`, `MLT`
   - `General`: All other customers not categorized above
4. **Decoupled Date Filter**:
   - Date dropdown selects the target Stored Procedure (Order Date, Factory Due Date, Cust Due Date, Finish Date).
   - Toggling status filters (Pending / Finish / ALL) operates independently without mutating date criteria.

---

## 2026-10-01 Chart UI Standardization & Production Summary Improvements

### 1. Bar Chart System-Wide Standardization
All bar charts across the system have been standardized with consistent styling rules:

- **Square Edges**: All bar charts use `radius={[0, 0, 0, 0]}` — no rounded corners on any bar.
- **Zero Bar Gap**: All grouped bar charts use `barGap={0}` — bars within the same category group are flush against each other with no spacing.
- **No Max Bar Size**: Removed `maxBarSize` constraints from all `<Bar>` components to allow bars to fill available space naturally without gaps.
- **Unused `Cell` imports removed**: Cleaned up unused `Cell` imports from `RiskCustomerChart.tsx` and `ProductionForecastChart.tsx`.

**Affected Chart Files:**

| File | Chart Type | Changes |
|------|-----------|---------|
| `ProductionSummaryChart.tsx` | `ComposedChart` | `barGap={0}`, removed `maxBarSize={38}`, `radius=[0,0,0,0]` |
| `ProductionForecastChart.tsx` | `ComposedChart` | `barGap={0}`, `radius=[0,0,0,0]`, removed unused `Cell` import |
| `CustomerSalesChart.tsx` | `ComposedChart` | `barGap={0}`, removed `maxBarSize={calculatedMaxBar}`, `radius=[0,0,0,0]` |
| `RiskCustomerChart.tsx` | `BarChart` | `barGap={0}`, `radius=[0,0,0,0]`, removed unused `Cell` import |
| `InfographicSalesTrends.tsx` | `BarChart` | `barGap={0}`, removed `maxBarSize={30}`, `radius=[0,0,0,0]` via custom shape |
| `FactoryOutputTrendChart.tsx` | Custom HTML bars | `borderRadius: 0` (was `4px 4px 1px 1px`) |

### 2. Production Summary Table Improvements (`ProductionSummaryTable.tsx`)
- **Increased row height**: From `22px`/`24px` to `30px` for all rows (data, total, avg) to match Forecast table density.
- **Increased padding**: Cell padding raised from `2px` to `4px`/`6px`/`8px` across all cells for better readability.
- **Font size increase**: Cell font size raised from `10px`/`10.5px`/`11px` to `11px`/`12px`/`13px`.
- **First column width increase**: From `58px`/`75px` to `75px`/`95px` to accommodate label text.
- **Avg row label**: Changed from `Avg.(Day/Pcs)` (with forced `fontSize: 9.5px`) to `Avg / Day` (using standard font size).
- **Zero value display**: Fixed `renderCell` logic — zero values now display `-` consistently (previously avg rows showed `0`).

### 3. Period Setup Default Change
- **Default preset** changed from `month` to `full-year` in `usePeriodSetup.ts`.
- When `full-year` is selected, `monthFrom` defaults to `1` and `monthTo` defaults to `12` (full range).
- This ensures the "Year" filter mode displays all 12 months of data by default.

### 4. Compare Target Checkbox
- Added checkbox-based activation for Compare Year selection in `PeriodSetupPanel.tsx`.
- Users can toggle Compare 1 / Compare 2 independently via checkboxes.
- When a checkbox is activated, the compare year auto-selects the nearest available year.

## 2026-10-14 CCTV IT Audit Report (Audit → CCTV Report)

### 1. Overview
- **Route**: `/audit/cctv-report` (admin only) · Menu `Audit → CCTV Report` (`menuConfig.ts`, id `audit-cctv-report`)
- **Purpose**: Daily CCTV camera operation auditing interface → Prints A4 landscape sheets → Signed with physical pen for ISO / IT Audit compliance.
- **UI**: No table checkboxes — statuses display as text characters `✓` / `✗` / `-` (cycling: Empty → OK → NG → NA → Empty).
- **Files**: `pages/audit/CCTVAuditPage.tsx`, `components/audit/CctvAuditTable.tsx`, `hooks/useCctvAuditForm.ts`, `utils/cctvAuditForm.ts`, `config/cctvAuditConfig.ts`, types `Cctv*` in `types/index.ts`, and `.cctv-*` print styles in `index.css`.

### 2. Zero-DB Architecture (Strict 100% READ-ONLY Compliance)
- **Zero new backend endpoints and zero database writes**.
- Official factory holidays fetched from pre-existing endpoint `GET /api/production-summary/holidays?year=` → table `GMHoliday` (SELECT only) via `getHolidays()` in `productionSummaryAPI.ts`.
- `GMHoliday` provides date-only entries (no holiday titles) → Divider rows render standard "Holiday" text.
- Forms persist as JSON: React state + `localStorage` (key `cctv-audit-form`) + Import/Export JSON files (`cctv-audit-YYYY-MM.json`) — **Always export JSON files as persistent proof before printing**, as browser localStorage can be cleared.

### 3. JSON Schema (`CctvAuditForm`, `schemaVersion: 1`)
- `columns[]`: `{ id, label, type: 'date'|'status'|'text', width?, fixed? }`. The first column must always be `date` (holiday rows merge via `colSpan = columns.length - 1`).
- `rows[]`: `{ id, type: 'data'|'holiday', date: 'YYYY-MM-DD', cells?: Record<columnId, value>, holiday?: { name, source: 'company'|'sunday'|'manual' } }`.
- `cells` bind to `columnId` rather than array indices, allowing columns to be added, deleted, or reordered without corrupting data.
- Dates are stored as ISO strings (not raw `Date` objects) to prevent timezone shifts across systems.
- Holidays are captured as immutable snapshots upon form generation, preventing past monthly records from drifting if database holiday tables are subsequently updated.
- Generating a new month clones columns, signatures, and location metadata from the current form while clearing document serial numbers. The "Include Sundays as Holidays" toggle automatically generates Sunday dividers, and users can toggle individual rows between workday and holiday status directly from the UI.

### 4. Print Standards
- Uses named print page `cctv-landscape` (`@page { size: A4 landscape; margin: 10mm }`) bound to `.cctv-sheet`.
- Forces crisp white paper / black text styling across all active themes during print jobs; gray holiday divider strips enforce `print-color-adjust: exact`; `thead` repeats across multiple pages, and signature blocks are protected from page splits.
- Action toolbars and holiday toggle controls are flagged with `.no-print` to prevent inclusion on printed reports.

---

## 2026-11-09 Routing: Role Home & Login Return Path

### URL Map
- `/login` — Login page. Already-authenticated users are redirected into the app (`returnTo` honored).
- `/` — **No page of its own.** Redirects to the user's landing page (`RoleHomeRedirect` → `getLandingPath`). Generic "go home" buttons (Topbar logo, DocumentLayout Close, workspace switch) keep using `navigate('/')`.
- `/dashboard/overview` — Factory Overview (`Dashboard.tsx`, admin only). Menu id stays `home`, so stored per-user menu permissions are unaffected.

### Single Source of Truth — `src/utils/authRedirect.ts`
- `getHomePathForRole(role)`: admin → `/dashboard/overview`; every other role → `/dashboard/customer`.
- `isRouteAllowedForRole(pathname, role)`: menuConfig `roles` check (moved out of `App.tsx`, logic unchanged).
- `sanitizeReturnTo(value)`: accepts same-origin in-app paths only; rejects `//host`, absolute URLs, backslashes, control characters, `/`, and `/login` (open-redirect protection).
- `buildLoginPath(currentPath)` → `/login?returnTo=<encoded path>`.
- `resolvePostLoginPath(role, returnTo)`: the requested page when safe **and** permitted for the role, otherwise the role home.

### Flows
- Unauthenticated deep link → `ProtectedRoute` → `/login?returnTo=...` → after login, returns to the requested page.
- API 401 (expired token) → `fetchWithAuth` → `/login?returnTo=<current page>`. IP ban (403) and manual logout go to plain `/login`.
- Route not permitted for the role → role home (previously always `/dashboard/customer`).

### Known Gaps
- ~~Per-user `allowedMenus` did not block direct URL access~~ → resolved, see "2026-11-09 Menu Permission Enforcement".
- ~~401 handler did not clear `auth_allowed_menus`~~ → resolved (`clearStoredAuth()`).

---

## 2026-11-09 Menu Permission Enforcement

### Rule (same as Sidebar)
A user may open a page when their `allowedMenus` is unrestricted (`null`), contains `*`, or contains the page's **menu item id or its group id** (a group permission grants every child). Per-user permissions come from `backend/services/permissionService.js` (`backend/data/user_menu_permissions.json`, gitignored; users not listed fall back to role defaults). Default sales permissions include the Production group (`order-tracker`) and `po-tracker` — sales access to PO Tracker is intentional.

### Frontend (UX guard) — `src/utils/authRedirect.ts`
- `canAccessRoute(pathname, role, allowedMenus)` = menuConfig `roles` **and** `isRouteAllowedForMenus` (most specific matching menu path wins; detail routes mapped via `DETAIL_ROUTE_OWNERS`, e.g. `/dashboard/detail` → `home`; routes owned by no menu are not restricted).
- `getLandingPath(role, allowedMenus)`: role home if permitted → else first permitted menu (menuConfig order) → else `/no-access` (`NoAccessPage.tsx`). Used by `/`, `ProtectedRoute` denials, and post-login fallback.
- `clearStoredAuth()` removes `auth_token`, `auth_role`, `auth_user`, `auth_allowed_menus` (logout, 401, IP ban).
- Permission changes made by an admin apply to the web UI at the user's next login.

### Backend (real enforcement) — `requireMenu(menuIds, { exceptPaths })` in `middleware/authMiddleware.js`
| API | Required menu (item or group) | Exceptions |
|-----|-------------------------------|------------|
| `/api/orders` | `po-tracker` / `order-tracker` | — |
| `/api/order-tracking` | `fbe-order-track` / `order-tracker` | — (also `requireRole('admin','sales')`) |
| `/api/production-summary` | `pro-sum` / `order-tracker` | `/holidays` (shared with CCTV Report) |
| `/api/production-forecast` | `pro-forecast` / `order-tracker` | — |
- Denied → `403 { ok: false, error: 'Forbidden: You do not have access to this page' }`. Reads permissions live, so changes apply to APIs immediately.
- **Not gated yet (shared by several pages, needs a per-endpoint audit):** `/api/dashboard`, `/api/items`, `/api/search`.
- When adding a page-owned API, gate it with the page's item id + group id, and keep the ids in sync with `menuConfig.ts`.
