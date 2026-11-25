# Refactor Notes (2026)

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## 2026-07-16 API/Route Domain Split Notes

### Scope
- Split mixed dashboard/customer sales/item yearly code by domain responsibility while preserving existing endpoint URLs.
- This is a structure-only refactor for API client files and Express route files; business query behavior should remain the same.
- TopOrdersAnalyticsPage.tsx is still a draft page, so only import boundaries were updated there. Do not perform a heavy component rewrite until the page direction is confirmed.

### Frontend Service Ownership
- src/services/dashboardAPI.ts: dashboard core only (years, dashboard cards, card detail, sales summary) plus temporary compatibility re-exports.
- src/services/customerSummaryAPI.ts: customer summary fetch for /api/dashboard/customer-summary.
- src/services/orderVolumeSummaryAPI.ts: Order List order lines (/api/dashboard/sales-orders).
- src/services/itemYearlySummaryAPI.ts: item yearly and item/customer yearly comparison, top gallery, and salespersons endpoints under /api/items.
- (`customerSalesAPI.ts` from the original split no longer exists; its Order List call lives in `orderVolumeSummaryAPI.ts`.)

### Backend Route Ownership (current file names — renamed after the original split)
- backend/routes/productionDashboard.js: dashboard core endpoints (`/`, `/years`, `/detail/:cardType`, `/sales-summary`) under /api/dashboard.
- backend/routes/customerReportMatrix.js: /api/dashboard/customer-summary.
- backend/routes/orderVolumeSummary.js: /api/dashboard/sales-orders (Order List).
- backend/routes/topOrdersGallery.js: /api/items (`/yearly-summary`, `/:styleNo/yearly-summary`, `/salespersons`, `/top-gallery`).
- backend/server.js mounts the three dashboard routers under the same /api/dashboard prefix (guarded by `DASHBOARD_MENU_RULES`) and topOrdersGallery.js under /api/items, so frontend URLs do not change.
- The `/api/dashboard/top-items` endpoint no longer exists; its rule in `DASHBOARD_MENU_RULES` is leftover.

### Refactor Rule
- When moving more code, split by real business responsibility first, then rename. Do not rename a large file blindly if it still contains multiple domains.

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

## Important Notes

1. **Internal Tooling**: Designed for intranet deployment within the factory LAN, secured with JWT, role-based access control (admin/sales), and per-user menu permissions (`allowedMenus`) — only accounts listed in the permissions file can sign in (currently ADMIN with full access and SALES with Sales Analytics + the Production group incl. PO Tracker). See "2026-11-09 Menu Permission Enforcement" in `docs/auth/routing-and-permissions.md`.
2. **Production DB Queries**: Handle heavy queries responsibly; utilize caching for expensive analytical requests.
3. **Typography**: Uses Roboto as the core application and data table font family.
4. **Legacy Migration**: Progressively modernizing VB.NET modules; remaining unported modules are represented with placeholders.
5. **Photo Pipeline**: Historical images stored as VARBINARY are deprecated in favor of high-performance file server streaming via Photo Bridge to keep payloads lean.
