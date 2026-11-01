# Sales Menu and Navigation Documentation

## Scope
This file owns Sales Analytics sidebar structure, user-facing names, breadcrumbs, routes, and Sales flow boundaries.

Dashboard/report behavior lives in `dashboard.md`.

## Sidebar Structure
Sales Analytics sidebar must stay flat. Do not add a nested `Summary` sub-parent under `Sales Analytics`.

Current `Sales Analytics` sidebar items:
- `Sales Summary` -> `/dashboard/customer`
- `Customer Report Matrix` -> `/dashboard/customer/matrix`
- `Order Trends` -> `/dashboard/customer/trends`
- `Top Item Gallery` -> `/dashboard/top-orders`
- `Top Items Qty` -> `/dashboard/top-orders/analytics`

Order Trends is now a sidebar item under Sales Analytics. The sidebar keeps `Order Trends` active while users are on Order Trends.
Direct/detail Sales routes may exist without being sidebar items. Do not add them to the sidebar unless the user explicitly asks.

Avoid this confusing hierarchy:
- `Sales Analytics > Summary > Sales Summary`
- `Sales Analytics > Summary > Sales & Qty Summary`

Menu structure must be defined in `src/config/menuConfig.ts`. Do not hardcode menu labels or hierarchy in Sidebar/Nav components.

## User-Facing Naming
Use these names consistently in sidebar, page title, breadcrumb, and buttons:
- Combined summary page: `Sales Summary`
- Metric segment labels: `Sales`, `Qty`
- Matrix report page: `Customer Report Matrix`
- Top item overview page: `Top Item Gallery`
- Top item quantity analysis page: `Top Items Qty`
- Order volume trends and evidence page: `Order Trends`
- Drilldown order table from PO Tracker / Trends: `Order List`
- Sales rep/dashboard page: `Sales Dashboard`

Do not use these old names in UI:
- `Summary Sales`
- `Summary Qty`
- `Sales Summary` as the current combined summary page title
- `Quantity Summary` as the current combined summary page title
- `Quantity Analytics`
- `Full Report Matrix`
- `Full Quantity Matrix`
- `Customer Sales Analysis` as a current menu/page label
- `Sales Customer Analytics`
- `Sales Order Analytics`

## Breadcrumb Standard
Breadcrumbs must represent the real navigation path and current screen location. Keep `JEWELRY FACTORY SYSTEM` as the root, then `Sales Analytics`, then the source page when applicable.

Required breadcrumb paths:
- Sales Summary: `JEWELRY FACTORY SYSTEM > Sales Analytics > Sales Summary`
- Customer Report Matrix: `JEWELRY FACTORY SYSTEM > Sales Analytics > Customer Report Matrix`
- Order Trends: `JEWELRY FACTORY SYSTEM > Sales Analytics > Order Trends`
- Top Item Gallery: `JEWELRY FACTORY SYSTEM > Sales Analytics > Top Item Gallery`
- Top Items Qty: `JEWELRY FACTORY SYSTEM > Sales Analytics > Top Item Gallery > Top Items Qty`
- Sales Dashboard (legacy): `JEWELRY FACTORY SYSTEM > Sales Analytics > Sales Dashboard`

Known follow-up: if a page currently shows a shorter breadcrumb such as `JEWELRY FACTORY SYSTEM > Top Item Gallery`, align it to this standard the next time that page is touched.

## Route Map
Sales Analytics routes (nested under `CustomerDashboardLayout` at `/dashboard/customer`):
- `/dashboard/customer`: `Sales Summary`, default amount metric (index route)
- `/dashboard/customer/matrix`: `Customer Report Matrix` (nested route)
- `/dashboard/customer/trends`: `Order Trends` / `Order Volume Summary` (nested route)

Standalone Sales Analytics routes:
- `/dashboard/top-orders`: `Top Item Gallery`
- `/dashboard/top-orders/analytics`: `Top Items Qty`
- `/dashboard/sales-customer-detail`: `Order List` (Customer Trends detail)

Legacy/alias routes (redirect):
- `/dashboard/sales` -> redirect to `/dashboard/customer`
- `/dashboard/qty` -> redirect to `/dashboard/customer?metric=qty`
- `/dashboard/customer-report` -> redirect to `/dashboard/customer/matrix`
- `/dashboard/customer-trends` -> redirect to `/dashboard/customer/trends`
- `/dashboard/sales-customer-groups` -> redirect to `/dashboard/customer/trends` (via `LegacyCustomerTrendsRedirect`)
- `/dashboard/top-Orders` -> redirect to `/dashboard/top-orders`
- `/dashboard/top-order-lines` -> redirect to `/dashboard/top-orders`
- `/dashboard/Top-Order Lines` -> redirect to `/dashboard/top-orders`

## Summary To Matrix Flow
`Sales & Qty Summary` is the source page for Matrix navigation.

When opening Matrix from Summary:
- Preserve active metric (`amount` or `qty`)
- Preserve view mode (`ytd` or `monthly`)
- Preserve selected years
- Preserve selected months
- Preserve selected customer groups

Matrix page naming depends on metric:
- `metric=amount` -> `Sales Matrix`
- `metric=qty` -> `Quantity Matrix`

Matrix breadcrumb source should stay `Sales & Qty Summary`, not separate `Sales Summary` or `Quantity Summary`.

## URL Query Rules
Use query params only for state that should survive refresh/share links.

Recommended URL cleanup rules:
- Omit default `metric=amount`
- Omit default `view=ytd`
- Omit full-year month selection (`months=1..12`) when all months are selected
- Keep explicit `years`; for groups use `src=summary` when the Summary default groups are selected, `groups=all` when every group is selected, and explicit `groups=N008,N044` only for custom selections
- Keep Matrix fallback behavior shareable: direct Matrix without `src=summary` defaults to all groups, while Summary-driven Matrix defaults to the Summary group set

Do not move Matrix state to `sessionStorage` only unless shareable/report URLs are no longer required.

## Customer Trends
`Customer Trends` is the Sales-side customer movement and order evidence page.

Current files:
- `OrderVolumeSummaryPage.tsx`: nested route `/dashboard/customer/trends` (rendered inside `CustomerDashboardLayout`)
- `SalesCustomerGroupDetail.tsx`: route `/dashboard/sales-customer-detail`

Purpose:
- Analyze customer groups, sales amount, quantity, shipped quantity, order gap, and order item evidence
- Use real `OrdHD + OrdDT` line data
- Provide drilldown from the overview into exact order item rows
- Show selected primary/compare year using amount or qty
- Keep the first screen focused on an actionable overview; keep exact rows in the `Order Details` view
- Surface order health signals such as shipped quantity, open gap, and late status in the table

Current design stance:
- Use the page flow `Filters -> KPI -> Overview | Order Details`; open on `Overview` by default
- Keep KPI strip, metric toggle, primary/compare year, month, customer group, reset, and one global reload control compact
- `Overview` separates three questions: Monthly Comparison compares years, Weekly Comparison shows exact week values, and `Type Contribution` explains which product type drives the total
- Let users switch the comparison between `Monthly` and `Weekly`; calculate weekly totals from each row's real `OrdDate` and never divide a monthly total by four
- Monthly uses two grouped year series. Weekly uses month-grouped comparison cards with the week number, date range, Report Year, Compare Year, absolute change, and percentage change; do not render all weeks as a horizontally scrolling bar chart
- Weekly labels use `W01` through `W53` and stay inside the months selected by the page Period filter, including weeks that cross a month boundary
- Do not stack product types inside the year comparison because it makes period and year comparison difficult to scan
- Use backend `productTypeCode` values `BBS`, `BES`, `BNS`, `BRS`, and `Others` only in `Type Contribution`; do not present these as `GMGoodType` item type names
- Clicking a monthly bar opens `Order Details` for its year and month; clicking either year value on a weekly card filters rows by year and calendar week. Clicking a Type Contribution row opens details for its year and product type
- `Due Date Outlook` uses `CustDueDate` rows and `ExportAmnt` shipped values, shows Due/Shipped/Open and due-risk orders by month, and drills into Customer Due rows
- Reuse the page-level Measure, Years, Period, and Customer Group filters for Due Date Outlook. Do not add duplicate local filters or another Amount/Quantity toggle
- The Type selector inside `Order Count` changes that KPI only; it is not a page-level filter
- Search appears only in `Order Details` and does not change KPI or overview totals
- Keep the detail table full-width with horizontal scrolling for its operational columns
- Avoid large filter cards and unrelated secondary panels on the first screen

## Sales vs Production Boundary
Sales pages should stay focused on sales, quantity, customer, item, and order evidence.

Sales status vocabulary is limited to:
- `Open`
- `Partial`
- `Shipped`
- `Late`

Do not show production-stage detail such as Casting, Polishing, Plating, QC in Sales pages.

Do not link Customer Trends, Sales & Qty Summary, Matrix, or Top Item flows into PO Tracker unless the user explicitly asks for production/order tracking navigation.

## Data Rules
- Top products and order rows must come from real `OrdHD + OrdDT` line data
- Amount uses line amount, `ItemExchAmnt` fallback `ItemAmnt`
- Qty uses line qty, `ItemQty`
- Shipped uses `ExportQty`
- Customer grouping must use `frontend/src/config/customerGroups.ts` as the single source of truth
- Top items should expose the primary customer/customer group for each item; choose the primary customer by the active metric, amount or qty
- Product Type / Item Type names must come from `GMGoodType` by joining `OrdDT.ItemType = GMGoodType.GoodTypeCode`; display `GoodTypeNameEng` fallback `GoodTypeName`
- Do not infer item type from item number prefixes such as `BBS`, `BES`, or `BNS`
- Customer Trends product category series must use the backend `productTypeCode`; keep this field separate from the `GMGoodType` Item Type column
- `/api/dashboard/item-type-distribution` was removed with the Item Type Distribution panel; do not reintroduce it unless a clear business use case is confirmed

## UX Rules
- Keep Sales pages visually aligned with `CustomerDashboard.tsx`, `CustomerReportPage.tsx`, and shared ERP button/table components
- Prefer `ErpSegmentedControl` for compact grouped choices such as Metric, View, Series, and Labels
- Button focus from mouse clicks should not leave a stuck dark border; preserve keyboard `focus-visible` behavior
- Chart color meaning must follow the active series: year comparison uses year colors, customer grouping uses customer group colors, and product type mix uses product type colors. Do not show customer group color dots or accents when customer group is only a filter.
- Use `Topbar`, `var(--color-*)`, `color-mix`, existing fonts, and compact enterprise spacing
- Avoid decorative hero sections, glass effects, gradients, oversized marketing composition, and card-heavy replacement for dense data tables
- Filter areas should be compact ERP controls, not large marketing panels
- Search fields should not trigger heavy refresh on every keypress unless the page was explicitly designed for debounced search
- **Dimming Effect (Loading State)**: All Sales Analytics pages must use a unified dimming effect during data refetch instead of full-page spinners. Apply `opacity-50 pointer-events-none` for a fixed duration (e.g. ~450ms) on the main data container when refreshing.
- **Refresh Button Placement**: For the Sales Summary (Chart) page, the global Refresh button is located in the `PageHeader` (next to the tab switcher) and uses a permanent `text-[var(--color-brand-600)]` icon. Other pages (Matrix, Order Trends, Top Items) keep their local refresh buttons in their respective card toolbars.

## Role Access
Sales users can access Sales Analytics and customer summary/reporting pages. Admin users can access all pages.
