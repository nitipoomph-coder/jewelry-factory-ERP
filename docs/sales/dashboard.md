# Dashboard Documentation

## Scope
This file owns dashboard and report-screen context that used to live inside `claude.md`.

Covered surfaces:
- Main production dashboard: `Dashboard.tsx`, `/`
- Sales/customer dashboard layout: `CustomerDashboardLayout.tsx`, `/dashboard/customer` (with nested routes)
  - Sales summary: `CustomerDashboard.tsx`, `/dashboard/customer` (index)
  - Customer matrix: `CustomerReportPage.tsx`, `/dashboard/customer/matrix`
- Order List (drill-down from Customer Report Matrix, details in `docs/sales/sales-menu.md`): `SalesCustomerGroupDetail.tsx`, `/dashboard/sales-customer-detail`
- Top item gallery: `TopOrdersGalleryPage.tsx`, `/dashboard/top-orders`
- Sales dashboard (legacy redirect): `/dashboard/sales` -> `/dashboard/customer`

Sales menu naming and breadcrumb rules live in `docs/sales/sales-menu.md`.

## Dashboard API Endpoints
Protected dashboard endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/dashboard` | Main dashboard stats |
| GET | `/api/dashboard/detail/:section` | Dashboard drilldown |
| GET | `/api/dashboard/sales-summary` | Sales by rep/year |
| GET | `/api/dashboard/customer-summary` | Sales and quantity by customer/year/month |

Frontend service ownership:
- `src/services/dashboardAPI.ts`: dashboard core, available years, dashboard cards, card detail, sales summary compatibility exports
- `src/services/customerSummaryAPI.ts`: customer summary fetch for `/api/dashboard/customer-summary`
- `src/services/customerSalesAPI.ts`: sales customer groups, sales orders, top items, shared sales filters
- `src/services/itemYearlySummaryAPI.ts`: item yearly and item/customer yearly comparison endpoints

## Data Hygiene
Dashboard statistics must filter out inactive/sample/dead orders where the business logic requires active order reporting.

Active order prefixes historically used for dashboard accuracy:
- `BBC`, `BBQ`, `BBD`, `BBI`, `BBF`, `BBP`, `BBT`, `BBX`, `BBK`, `BBR`, `BBL`, `BBS`, `BBE`

Do not include old inactive prefixes in dashboard totals unless the user explicitly asks for an audit or historical raw-data view.

## CustomerDashboard.tsx, Sales Summary and Quantity Summary
`CustomerDashboard.tsx` is the chart-first summary surface for customer performance.

Routes (nested under `CustomerDashboardLayout`):
- `/dashboard/customer`: `Sales Summary` (index route, amount metric by default)
- Metric is controlled by `?metric=qty` query parameter
- `/dashboard/customer/matrix`: `Customer Matrix`

Legacy redirect: `/dashboard/qty` -> `/dashboard/customer?metric=qty`

Behavior:
- Uses one component with a `metric` prop: `amount` or `qty`
- First screen is chart-focused, with compact ERP controls above the chart
- Supports year selection, month selection, customer-group selection, view mode, and series mode
- Customer group mapping must come from `src/config/customerGroups.ts`
- The `Matrix` button must carry current context into `CustomerReportPage.tsx` via query params: `metric`, `view`, `years`, `months`, `groups`
- The Matrix page must initialize immediately from those params so users see the same context after navigation

UI expectations:
- Compact internal-tool layout, not a landing page
- Use `Topbar`, existing theme variables, and restrained enterprise controls
- Avoid oversized hero sections, marketing cards, heavy gradients, and decorative motion

## CustomerReportPage.tsx, Matrix Report
`CustomerReportPage.tsx` is the full-screen dense matrix report for customer-by-month/year analysis.

Routes (nested under `CustomerDashboardLayout`):
- Sales matrix: `/dashboard/customer/matrix?metric=amount`
- Quantity matrix: `/dashboard/customer/matrix?metric=qty`

Legacy redirect: `/dashboard/customer-report` -> `/dashboard/customer/matrix`

View modes (picked by the Period preset, `hooks/useCustomerReportData.ts`):
- `YTD` (Year / YTD preset), one year: one year block with months and the year total
- `YTD`, 2+ years (2026-11-26, requested by management for month-to-month review): one stacked cell per month, so all 12 months fit one screen without sliding. Each cell always has 3 lines: the newest year (bold), one compare year (soft), and a Growth line with the short Growth amount (K/M, 2 decimals, e.g. `+$322.33K`) and Growth % side by side. The compare year defaults to the Period compare target; with 3+ years a `vs 2025 | vs 2024` switch in the table toolbar changes it (the other years stay in the KPI row). With every Growth removed the cell has 2 lines. The sub header shows the line order (`2026 / 2025 / Growth`). Hovering a cell shows the full Growth amount. The last column is the Grand Total with the year totals, Growth % and Growth amount (full-year comparison, unchanged). Rows are taller (15px per line + 8px)
- The stacked layout is used for every view with 2+ years (Year since 2026-11-26; Month / Week / Day since 2026-11-27)
- A month, ISO week or day that has not started yet (after today) shows `·` instead of 0, and its Growth shows `·` instead of a misleading -100% (weeks and days since 2026-11-27; ISO week as SQL `DATEPART(isowk)`). By Due Date a future period can already hold orders: then the values and Growth show normally; `·` is only for a period that is both in the future and still empty
- A customer new in the newer year shows `NEW` as plain green text (no frame, no cell tint)
- `Monthly` (Month / Custom preset), `Weekly` (Week preset), `Daily` (Day preset), one year: one column per month / week / day, then the Grand Total
- `Monthly` / `Weekly`, 2+ years (2026-11-27): the same stacked cell as the Year view, one per month / week (newest year, compare year, Growth line), plus the stacked Grand Total; the `vs year` switch works the same. Before, each period had 4 columns (years, Growth, Growth %)
- `Daily`, 2+ years (2026-11-27): the same 3-line stacked cell per day (newest year, compare year, Growth). Growth compares the same calendar date, which can fall on another weekday in the other year
- All four views are built from one column list (`buildColumns` in `components/report/CustomerReportTable.tsx`), so headers, body, Total row and resize handles always line up

Layout (2026-11-25 redesign, "option 5"):
- One flat surface on the page canvas: no card around the KPIs, no frame or radius around the table; sections are separated by spacing and hairlines only
- The page does not scroll on desktop; the table area is the only scroll area. Header rows, the customer column and the Total row stay pinned. At 620px container width and below the page scrolls and the table gets a fixed height (`pages/SalesResponsive.css`)
- KPI row: Year totals always show. With 2+ years a `Growth <newest> vs <older>` KPI follows for each older year (amount and %), built from the same year totals and Growth formula as the table's Grand Total, so the numbers always match (full-year comparison, like the Grand Total). Group KPIs show only in By Customer view (in By Group view the table rows are the groups, so the numbers would repeat). Every group picked in the Groups filter gets one short line under the year KPIs: name, newest-year total, Growth amount and Growth % vs the compare year, in K/M with 2 decimals (`NEW` when the compare year is 0); hovering shows the full numbers
- The loading skeleton uses the same KPI row and the same table row heights (30 + 30 px header, 34 px rows; taller rows in the stacked Year view). It fills the whole table area: columns stretch to the page width and rows fill the height

Table UX rules:
- First screen must be the data table/report surface
- Dense ERP/Excel-style table, not a card grid
- Cell text 12px (`--erp-text-control`), header text 11px (`--erp-text-dense`), rows 34px
- Vertical lines only at the start of each header group (a year, a month, a Growth pair) and after the customer column
- Only the current month column is highlighted; Total columns stand out by bold text, not by a background
- Grand total row uses the table header background, except current-month cells keep the current highlight
- The newest year uses primary text; older years use secondary text; zero values use tertiary text
- A month that has not started yet shows `·` instead of `0` (only when its value is 0)
- Only Growth uses semantic direction color. The Growth formula lives once in `growthPctInfo` / `growthAmtInfo` (`components/dashboard/customerReport/GrowthHelpers.tsx`), used by both the side-by-side and the stacked cells

Day view data (fixed 2026-11-27): with a Day period, `/api/dashboard/customer-summary` also returns `daily` / `dailyQty` per customer (`{ year: { 'MM-DD': value } }`, by the selected date basis), and `useCustomerReportData` fills the `${year}_D_MM-DD` cells from it. Every day of a row adds up to its Total.

Drill-down to the Order List (2026-11-27):
- The group / customer name opens the Order List for the row with the selected period, main (newest) year only — a compare year is not mixed in, so the Order List totals match that year's Grand Total. Older years open from their own values or the Order List's Year switch
- Any non-zero value in a group / customer row opens the Order List for that row, that year and that cell's period: a month cell → that month, a week → that week, a day → that day, a Total → the whole selected period. In stacked cells each year line is its own link; Growth lines, zeros, future months and the Total row are not links
- Values look like plain text until hovered (brand color + underline, hover title `Open <row> orders · <period> <year>`), no transitions on cells
- The Matrix URL goes along as router state, so the Order List's back button returns to the same Matrix view
- Day period: a link for another year (a compare-year Total, or the name link) moves `dateFrom` / `dateTo` to that year the way the API maps the range (end date in that year; a range over New Year starts the year before), so the Order List scope line shows the dates it lists

Column widths:
- Starting widths fit the longest number of each column kind (month values, totals, growth amounts), measured on all rows and the Total row, so Sales columns are wider than Qty columns and a search does not make columns jump
- Drag a header's right edge to resize (in stacked views the period name row has a handle too) (a dragged width wins over the fitted width), double-click to reset one column, `Reset widths` in the table toolbar (shown only after a resize) to reset every column of the current view, or focus the handle and use the arrow keys (`hooks/useColumnWidths.ts`)
- Saved per signed-in user and per view (`customer-matrix:ytd|monthly|weekly|daily`). Stacked keys: `s_{Mon}` (Year / Month), `s_W{n}` (Week), `s_d{i}` (Day), `s_total`. Keys use the year position (`y0` = newest year), not the year value, so widths still apply after the period moves to a new year

Search UX:
- Force uppercase while typing
- Do not refresh/filter on every keypress
- Apply search only on Enter
- Escape restores the last applied search value

Growth UX:
- Growth is optional
- Users may remove all Growth comparisons; the system must not auto-add one back after removal
- `+Growth` sits inline beside existing Growth controls and moves along as comparisons are added
- Growth columns are named `Change Amount` and `Growth Rate`
- Positive values use `+`; negative values use a minus sign
- Percent uses 1 decimal place, for example `+23.8%`
- Growth numbers are right-aligned with tabular numbers
- Do not communicate direction by color alone

Export:
- CSV/Excel export must use the same column names and growth formatting as the visible table
- Column/render/filter/export behavior should be driven by shared configuration where practical

## TopOrdersGalleryPage.tsx
Top item gallery is a product-image and ranking surface for best-selling/top ordered items.

Design rules:
- Enterprise BI layout, not marketing/gallery decoration
- Product images should be inspectable and useful
- Use existing theme variables and restrained cards/panels
- Avoid mock sales numbers when real backend data is expected

## Loading and State Rules
Whenever dashboard boxes, charts, or table areas are added/changed, update loading skeletons for the same content area.

Loading skeletons should cover only the content outlet they replace. Do not skeleton-load the sidebar/topbar unnecessarily.

## Boundary Rule
Dashboard and Sales report screens are not production tracking screens. Do not route users into PO Tracker or production-stage detail unless the user explicitly asks for production/order tracking navigation.

## ProductionSummaryPage.tsx
Production output summary with chart + table for customer groups (N008, N098, N051).

Route: `/production/summary`

Features:
- View modes: Year (monthly bars), Month (daily bars), Week (weekly bars), Day (custom date range)
- Step selector: GR (Grind), TB, AS, etc.
- Mode selector: Good, All
- Uses `usePeriodSetup` hook + `PeriodSetupPanel` for unified period filtering
- Chart: `ComposedChart` with stacked bars per customer group + average line
- Table: Fixed-layout table with Total and Avg/Day rows, auto-scaling font by column count

API: `GET /api/production-summary/year|month|week|day` with `step`, `mode`, `year`, `month`, `fromWeek`, `toWeek` params.

## ProductionForecastPage.tsx
Production forecast comparing order qty vs finish qty by category type (BBS, BES+BCS, BNS+BPS, BTS, BRS, OTHER).

Route: `/production/forecast`

Features:
- Group selector: Item Type (BBS, etc.)
- Uses `usePeriodSetup` hook + `PeriodSetupPanel`
- Chart: `ComposedChart` with paired bars (order vs finish)
- Table: Category breakdown + Order Qty / Finish Qty / Balance Qty summary rows

## Period Setup Panel (System-Wide)
`PeriodSetupPanel.tsx` is the shared period filter popover used across all dashboard pages.

Key behaviors:
- Default preset: `full-year` (shows all 12 months)
- Supported presets: `full-year`, `ytd`, `this-month`, `last-month`, `month`, `week`, `day`, `custom`
- Compare Target: Checkbox-activated year comparison (up to 2 compare years)
- Month selector: Clickable month grid (single for `month` preset, multi for `custom`)
- Week selector: Range picker (fromWeek — toWeek)
- Day selector: Date range picker (max 31 days)
- State managed by `usePeriodSetup` hook with draft/committed pattern

## Chart Styling Rules (System-Wide as of Oct 2026)
- **Square corners**: `radius={[0, 0, 0, 0]}` on all `<Bar>` components
- **No gaps in groups**: `barGap={0}` on all `BarChart`/`ComposedChart` containers
- **No max bar size**: Do not use `maxBarSize` — let bars fill naturally
- **Custom HTML bars** (e.g., `FactoryOutputTrendChart`): Use `borderRadius: 0`
