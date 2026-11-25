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
| Spare Parts Stock      | SP-Order, SP-Issue, SP-Receive, …    | ⬜ Placeholder      |
| Subcontract Management | —                                    | 🟡 UI Preview (1/3, No Backend) |
| Audit — CCTV IT Audit Report | —                              | ✅ Live (admin only, Zero-DB) |

## Tech Stack (summary)

- **Frontend**: React 19, TypeScript 6, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), React Router 7, lucide-react, Recharts 2, ExcelJS, FileSaver, React Draggable.
- **Backend**: Node.js, Express 5, mssql 12 (connection pool), jsonwebtoken, dotenv, cors, nodemon (dev).
- **Database**: SQL Server 2012 Enterprise (`<DB_HOST>`) — `dbGeneration` (orders/production), `dbInventory` (procurement/stock).
- **Design system**: 3 themes via `ThemeContext` + CSS custom properties — `modern-dark` (default), `dark-gold`, `royal-white`. OKLCH colors. Fonts: Cinzel (logo), Roboto (everything else). 60-30-10 roles: `--color-ui-canvas` / `--color-ui-surface` + `--color-ui-raised` / `--color-ui-interactive` (brand token only for selection and actions). Chart colors `--color-chart-1`…`6`; table colors `--color-table-header`, `--color-table-row-alt`, `--color-table-footer`. Full guide: `docs/design/DESIGN.md`.

---

## Coding Rules

### General

1. **Language**: All code and documentation must be written in English.
2. **Encoding**: UTF-8 across all files.
3. **Line Ending**: CRLF (Windows development environment).
4. **Git**: Never commit `.env`, `node_modules/`, `dist/`, or temporary test scripts.
5. **📋 Documentation Rule**: Whenever adding, modifying, or deleting features or fixing bugs, documentation must remain synchronized:
   - `CLAUDE.md`: keep it short — only rules most tasks need, plus the Business Modules table. Folder structure, API endpoints and module details go in the matching file listed under "Where to Find More" (update those when files, endpoints or modules change).
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
12. **Data Tables — Performance**:
    - No `transition` or `animation` on table rows (`tr`), cells (`td`/`th`), or their CSS classes — hover and selection change instantly. Buttons and controls inside cells may keep short transitions.
    - Resizable columns use `hooks/useColumnWidths.ts` (widths on `<col>` + `table-layout: fixed`, saved per user). Never resize by setting React state on every mouse move, and do not put `width`/`minWidth`/`maxWidth` on every cell.
    - Pinned (sticky) columns use `stickyKeys` + `stickyClass(key)` from the hook. Only pinned cells get `position`/`z-index`; never drive per-cell values from a CSS variable on the `<table>` during a drag (it re-styles every cell each frame).
    - See `docs/debug-history.md` (2026-11-21 Order List, 2026-11-24 PO Tracker).

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

## Cross-Cutting Data Rules (read before writing any backend query)

- **PO Tracker SPs**: `PC_Show_OrdTrack_Sum_*` get exactly `@FromDate`, `@ToDate` (`sql.DateTime`). Status is filtered in memory (`pending` = `UnFinishQty !== 0`, `finish` = `FinishQty !== 0`, `all` = no filter). PO Tracker data is never cached.
- **Customer groups** (N008, N044, N051, N098, MLT, General) come only from `config/customerGroups.ts` — do not copy the code lists elsewhere.
- **NOLOCK**: every display-only read of OrdHD/OrdDT/GMCust/GMEmp/GMHoliday/OrdWeekPlanHD, the `VW_Web_*` views, the `{XX}Sen/Rec` step tables and the `dbInventory` requisition tables uses `WITH (NOLOCK)`. Not on: the PO Tracker remark read-before-UPDATE, requisition `next-number`, `auth.js` / `adminUsers.js`, SP calls, or CTE names. Never use `SET TRANSACTION ISOLATION LEVEL` on pooled connections (on SQL 2012 it leaks to the next request).
- **Deadlocks**: wrap busy reads in `queryWithDeadlockRetry` (2 retries); if it still fails return **503** "The database is busy right now...".
- **Indexes**: no index supports `OrdNo` lookups, so `WHERE OrdNo = @x` scans the table — keep such reads few. Keys are not unique: `OrdHD.OrdNo` and `OrdDT.(OrdNo, OrdLineNo)` have duplicates. Never create or change indexes (DBA proposal: `docs/dba/index-gap-and-proposal.md`).
- **Deterministic output**: every ranking/sort that feeds the UI has a tie-breaker (code/number column); round money to cents where float sums can vary with row order.
- **New API endpoint**: page-owned → `requireMenu` with the page's menu item id + group id; under `/api/dashboard` → add a rule to `DASHBOARD_MENU_RULES` in `middleware/apiMenuRules.js` (unmatched paths are denied). Menu ids must match `config/menuConfig.ts`.
- Full details: `docs/database/baseline-and-indexes.md`, `docs/auth/routing-and-permissions.md`.

## Charts and Dashboards (summary)

- Every visual answers a named business question and leads to the records behind it (drill-down). Page order: `Scope/Filters -> Summary -> Explanation -> Details/Action`.
- A KPI shows label, formatted value, unit and period; a delta only with an explicit comparison basis. Never mix count, quantity, weight and amount under one ambiguous label.
- No pie/donut for trends or many categories, no 3D, decorative gauges, gradients or decorative motion.
- Bars: `radius={[0, 0, 0, 0]}`, `barGap={0}`, no `maxBarSize`.
- KPI, chart, table and export totals use the same filters and definitions; show zero, missing and not-applicable values distinctly.
- Full standard: `docs/design/data-visualization-standard.md`.

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

Checks after a change (frontend folder): `npx tsc --noEmit -p tsconfig.app.json` and `npm run lint` (includes `lint:colors`, must stay at 0 errors).

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

---

## Testing & Cleanup Rules

- Never remove legacy pages (e.g., `SOAPage.tsx`, `ProcurementPage.tsx`) until the Unified Layout and new replacement pages are thoroughly tested without regression.
- Before removing legacy files, verify that routing definitions in `App.tsx` have been successfully migrated to the new components.
- Confirm all API interactions are migrated into dedicated service modules under `src/services/`.

## Route Comment Standard

Use short guide comments that make ownership obvious at first read.

For backend route files, prefer a top overview block with:
- Route
- Page/Menu
- Description
- Filter policy or data boundary

Inside route handlers, add only short section labels for important boxes/queries, for example KPI cards, Top 30 Items, drilldown rows, or comparison data. Avoid comments that explain obvious syntax.

---

## Where to Find More

Open the file for the area you are working on. Together they hold everything that used to be in this file.

| Topic | File |
|-------|------|
| Folder structure (every file and its purpose), full tech stack tables | `docs/architecture/folder-structure.md` |
| API endpoints and query parameters, `.env` variables, environment setup, dev workflow, theme development | `docs/api/endpoints.md` |
| Stored procedures (CTE pipeline), live indexes, full NOLOCK / deadlock / search / deterministic-output policy | `docs/database/baseline-and-indexes.md` |
| Order number prefixes (BBC, BBQ, …) and which are active | `docs/database/order-prefixes.md` |
| Data visualization standard, document page design, bar chart rules | `docs/design/data-visualization-standard.md` |
| Design system and tokens · product principles | `docs/design/DESIGN.md` · `docs/design/PRODUCT.md` |
| PO Tracker (SPs, status filter, customer groups, design notes) | `docs/modules/po-tracker.md` |
| Top Item Gallery | `docs/modules/top-item-gallery.md` |
| FBE Order Tracker (17 steps, Send/Receive tables, status logic, page design) | `docs/modules/fbe-order-tracker.md` |
| Period Setup, customer group Active/Inactive filter | `docs/modules/period-and-customer-groups.md` |
| Production Summary table | `docs/modules/production-summary.md` |
| CCTV IT Audit Report | `docs/modules/cctv-audit.md` |
| Subcontract Management (planned) | `docs/modules/subcontract.md` |
| Routing, login return path, menu permissions (frontend + backend, API → menu table) | `docs/auth/routing-and-permissions.md` |
| Sales dashboards, Sales menu, sales SQL views | `docs/sales/dashboard.md` · `docs/sales/sales-menu.md` · `docs/sales/sales-db-views.md` |
| Refactor history (2026-07 route split, Phase 1–4 updates) | `docs/history/refactor-notes-2026.md` |
| Bugs, root causes and fixes | `docs/debug-history.md` |
| Proposed indexes for the DBA (not executed) | `docs/dba/index-gap-and-proposal.md` |
| Legacy VB.NET system and PO Tracker architecture | `docs/legacy/` |
