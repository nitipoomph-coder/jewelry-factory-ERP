# Folder Structure and Tech Stack

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## Folder Structure

```
gemstone-lifecycle-management/
├── claude.md                          # Short rules file (links to the docs/ files below)
├── README.md                          # 📖 Public project overview
├── start.md                           # 🤖 AI onboarding guide (entry point to docs/)
├── DATA_FETCHING_NOTES.txt            # 📝 Top Orders / Customer Sales data fetching notes
├── docs/
│   ├── debug-history.md               # 🔧 Debug history and resolution log
│   ├── GIT_WORKFLOW_GUIDE.md          # Multi-device Git workflow
│   ├── architecture/
│   │   └── folder-structure.md        # ← This file (folder tree + tech stack versions)
│   ├── api/
│   │   └── endpoints.md               # API endpoints, .env, environment setup, dev workflow
│   ├── auth/
│   │   └── routing-and-permissions.md # Role home, login return path, menu permissions
│   ├── database/
│   │   ├── baseline-and-indexes.md    # SP baseline, live indexes, NOLOCK / deadlock policy
│   │   └── order-prefixes.md          # Order number prefixes (active / inactive)
│   ├── modules/                       # Per-module notes: po-tracker, top-item-gallery, fbe-order-tracker,
│   │                                  #   period-and-customer-groups, production-summary, cctv-audit, subcontract
│   ├── history/
│   │   └── refactor-notes-2026.md     # 2026 refactor notes
│   ├── design/
│   │   ├── DESIGN.md                  # 🎨 Design system (canonical)
│   │   ├── PRODUCT.md                 # 📋 Product overview document
│   │   └── data-visualization-standard.md # Dashboards, charts, document page standard
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
    │       │   │   └── Topbar.tsx           # Top bar (theme switcher, breadcrumb) — no global search box
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
    │       │   │   ├── orderTracking/
    │       │   │   │   └── OrderTrackStepper.tsx        # FBE 17-step stepper
    │       │   │   ├── poTracker/
    │       │   │   │   └── OrderTable.tsx               # PO Tracker table (legacy path)
    │       │   │   ├── fbeOrderTrack/                   # FBE order tracking components
    │       │   │   └── topAnalytics/                    # Top analytics components
    │       │   ├── period/
    │       │   │   └── PeriodSetupPanel.tsx             # ⭐ Centralized period filter popover (used across all dashboards)
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
    │       │   ├── SalesCustomerGroupDetail.tsx     # ✅ Order List (orders behind a Matrix group / customer)
    │       │   ├── OrderList.css               # Order List layout (flat surface, breakdowns, table)
    │       │   ├── OrderDetailPage.tsx         # Order detail (by ord/po/group)
    │       │   ├── ProductionSummaryPage.tsx   # ⭐ Production Summary (chart + table, period-aware)
    │       │   ├── ProductionForecastPage.tsx  # Production Forecast (wrapper)
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
    │       │   ├── orderVolumeSummaryAPI.ts # Order List order lines (/api/dashboard/sales-orders)
    │       │   ├── orderTrackingAPI.ts     # FBE order tracking
    │       │   ├── productionSummaryAPI.ts # Production summary (year/month/week/day)
    │       │   ├── procurementAPI.ts       # Procurement document endpoints
    │       │   ├── requisitionAPI.ts       # Requisition document endpoints
    │       │   └── sampleAPI.ts            # Sample room endpoints
    │       │
    │       ├── hooks/
    │       │   ├── useCctvAuditForm.ts          # CCTV audit form state (localStorage + import/export + holidays)
    │       │   ├── useColumnWidths.ts           # User-resizable table columns, saved per user (Order List, PO Tracker, Order Detail lines)
    │       │   ├── usePeriodSetup.ts            # ⭐ Centralized period filter state management
    │       │   ├── useCustomerSalesData.ts      # Customer sales data hook
    │       │   ├── useCustomerReportData.ts     # Customer report data hook
    │       │   ├── useCustomerPageFilters.ts    # Customer page filter state (period + manual group list)
    │       │   ├── useGroupSelection.ts         # Group selection: default = the period's Active groups
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
    │       │   ├── PageExportContext.tsx  # Holds the Excel export the current page registered (in AppLayout)
    │       │   ├── pageExportStore.ts     # usePageExcelExport (page) / usePageExcelExportAction (Global Topbar)
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
    │       │   ├── navigationUtils.ts        # Navigation utility helpers
    │       │   ├── photoUrl.ts               # Photo URL builder (psPhotoUrl, attachPhotoFallback)
    │       │   ├── printChart.ts             # Print chart utility
    │       │   ├── errors.ts                 # Error utility types
    │       │   ├── exportPOTrackerExcel.ts   # 📊 Excel export for PO Tracker data
    │       │   ├── exportOrderDetailExcel.ts # 📊 Excel export for Order Detail data
    │       │   └── exportOrderListExcel.ts  # 📊 Excel export for the Order List (formatted, print-ready)
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
        │   ├── authMiddleware.js      # 🔐 JWT verification + requireRole / requireMenu / requireMenuByPath / hasMenu
        │   └── apiMenuRules.js        # 🔐 API → menu permission map (ids match frontend menuConfig)
        │
        ├── routes/                    # Mount prefixes and guards are set in server.js
        │   ├── auth.js                # 🔐 /api/auth — Login, permissions, admin verification, register (rate limited)
        │   ├── adminAudit.js          # 🛡️ /api/admin/audit — Audit logs, sessions, IP bans (admin, Zero-DB)
        │   ├── adminUsers.js          # 👥 /api/admin/users — User management + per-user menu permissions (admin)
        │   ├── poTracker.js           # ⭐ /api/orders — PO Tracker list (SP), order/PO/group detail, remarks
        │   ├── productionDashboard.js # /api/dashboard — Factory Overview (/, /years, /detail/:cardType, /sales-summary)
        │   ├── customerReportMatrix.js # /api/dashboard/customer-summary — Sales Summary + Customer Report Matrix
        │   ├── orderVolumeSummary.js  # /api/dashboard/sales-orders — Order List
        │   ├── productionSummary.js   # /api/production-summary — Production Summary (year/week/month/daily, holidays)
        │   ├── productionForecast.js  # /api/production-forecast — Production Forecast
        │   ├── orderTracking.js       # /api/order-tracking — FBE Order Tracker (/suggest, /track)
        │   ├── topOrdersGallery.js    # /api/items — Top Item Gallery + item yearly summaries + salespersons
        │   ├── search.js              # /api/search — Global search (results filtered per user)
        │   ├── procurementReceiving.js # /api/procurement — Procurement & Receiving documents (SPA/SRA/SRB/SIR, admin)
        │   ├── orderLinesIssues.js    # /api/requisition — Requisition documents (SOA/SIA/SIB/SIP/SIS, admin)
        │   ├── sampleDepartment.js    # /api/sample — Sample Room documents (SSA/SIM, admin)
        │   └── lock.js                # /api/lock — Document edit locks (in-memory)
        │
        └── sql/                        # 🗄️ SP baselines, views, and planned index scripts
            ├── indexes.sql             # Planned index set (NOT deployed — see docs/dba/index-gap-and-proposal.md)
            ├── stored-procedures/      # Current SP baseline (stripped base64 blobs → returns SampleItemNo)
            ├── _baseline/              # Original SP/column/index snapshot (rollback + reference)
            └── README.md               # Application guide + change summary
```

## Tech Stack (versions)

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
