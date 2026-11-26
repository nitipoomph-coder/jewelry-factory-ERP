# Sales Menu and Navigation Documentation

## Scope
This file owns Sales Analytics sidebar structure, user-facing names, breadcrumbs, routes, and Sales flow boundaries.

Dashboard/report behavior lives in `docs/sales/dashboard.md`.

## Sidebar Structure
Sales Analytics sidebar must stay flat. Do not add a nested `Summary` sub-parent under `Sales Analytics`.

Current `Sales Analytics` sidebar items:
- `Sales Summary` -> `/dashboard/customer`
- `Customer Report Matrix` -> `/dashboard/customer/matrix`
- `Order List` -> `/dashboard/sales-customer-detail` (admin only, `sidebarRoles`)
- `Top Item Gallery` -> `/dashboard/top-orders`
- `Top Items Qty` -> `/dashboard/top-orders/analytics`

Order List is a sidebar shortcut for admin only. Other roles open it from Customer Report Matrix (customer / group click) — page access is unchanged (`sidebarRoles` hides the entry, it does not restrict the route). Order Trends was removed on 2026-11-18.
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
- Drilldown order table from Customer Report Matrix: `Order List`
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
- Order List: `JEWELRY FACTORY SYSTEM > Sales Analytics > Customer Report Matrix > Order List`
- Top Item Gallery: `JEWELRY FACTORY SYSTEM > Sales Analytics > Top Item Gallery`
- Top Items Qty: `JEWELRY FACTORY SYSTEM > Sales Analytics > Top Item Gallery > Top Items Qty`
- Sales Dashboard (legacy): `JEWELRY FACTORY SYSTEM > Sales Analytics > Sales Dashboard`

Known follow-up: if a page currently shows a shorter breadcrumb such as `JEWELRY FACTORY SYSTEM > Top Item Gallery`, align it to this standard the next time that page is touched.

## Route Map
Sales Analytics routes (nested under `CustomerDashboardLayout` at `/dashboard/customer`):
- `/dashboard/customer`: `Sales Summary`, default amount metric (index route)
- `/dashboard/customer/matrix`: `Customer Report Matrix` (nested route)

Standalone Sales Analytics routes:
- `/dashboard/top-orders`: `Top Item Gallery`
- `/dashboard/top-orders/analytics`: `Top Items Qty`
- `/dashboard/sales-customer-detail`: `Order List` (Customer Report Matrix drill-down)

Legacy/alias routes (redirect):
- `/dashboard/sales` -> redirect to `/dashboard/customer`
- `/dashboard/qty` -> redirect to `/dashboard/customer?metric=qty`
- `/dashboard/customer-report` -> redirect to `/dashboard/customer/matrix`
- `/dashboard/customer/trends`, `/dashboard/customer-trends`, `/dashboard/sales-customer-groups` (removed Order Trends) -> redirect to `/dashboard/customer`
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

## Order List
`SalesCustomerGroupDetail.tsx` (+ `OrderList.css`), route `/dashboard/sales-customer-detail`.

Purpose: show the order lines behind one number of the Customer Report Matrix, for one customer group or one customer.

- Period with no `years` in the URL (the Period default) is the current year, the same default as the API, and the scope line says that year.
- Scope comes from the URL: a Matrix group row sends `groups=<id>`, a customer row sends `customers=<code>`; the period / metric query is kept. The scope line shows the group (a dropdown to switch group), the customer, the period and the date basis. Opened from the menu with no group or customer, the page asks for a group first instead of loading every order.
- Data: `GET /api/dashboard/sales-orders` reads `VW_Web_SalesDashboard` with the same filters as the Matrix (`/customer-summary`): years, months, week range, day range, date basis, and active customers only (`CustStatus = 'Y'`, added 2026-11-26), so the Order List total equals the Matrix number it was opened from. Groups are sent through `getGroupCustomerFilter` (General → `excludeCustomers`).
- Layout (2026-11-26 redesign, option D): one flat surface like the Matrix. Scope line → KPI row (Sales Amount, Ordered Qty, Shipped Qty with % of ordered, Open Qty, Orders with line count) → breakdown "By customer" (hidden for one customer) and "By product type" (bars by the metric, click a bar to filter the table, the other breakdown follows) → toolbar → table → pager. On desktop the table is the only scroll area; at 620px and below the page scrolls.
- Toolbar: Amount / Qty (sort and breakdown metric), Customers menu (only the customers of the scope), active Type filter chip, search (Enter applies, Escape restores), Columns menu, Reset widths, line count.
- Excel: no button on the page. The page registers its export with `usePageExcelExport` (`contexts/pageExportStore.ts`), so the Global Topbar's Print / Export menu → `Export to Excel` downloads the filtered lines with every column. The item is disabled when there is nothing to export.
- Columns: 13 shown by default (OrdNo pinned, OrdDate or DueDate following the date basis, CustCode (hidden when the scope is one customer), PONo, ItemNo, Type, ItemDesc, Shipping, ItemQTY, ItemPrice, ItemAmt, ExportQTY, OpenQTY); the other 17 are under `Columns` (Dates, Order, Item, Amounts). Choices are saved per signed-in user (`order-list-columns:v1:<USERNAME>`, overrides only). The Excel file always has every column of the filtered lines.
- Shipping status uses the sales vocabulary: `Shipped` (ExportQTY ≥ ItemQTY), `Partial nn%`, `Open`, shown as a pill with a dot and text.
- Sort: biggest ItemAmt (or ItemQTY) first, then OrdNo and line number as tie-breakers. 50 lines per page; the pinned Total row sums every filtered line, not only the page.
- Column widths: `hooks/useColumnWidths.ts` (`order-list`, `keys` = visible columns, OrdNo pinned with `stickyKeys`), drag / double-click / arrow keys, saved per user. The body is a memo component (`OrderListBody`); no transitions on rows or cells (`docs/debug-history.md`, 2026-11-21).
- Back button `Customer Report Matrix` returns to `/dashboard/customer/matrix` with the same query minus `customers` / `groups`.

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
- **Refresh Button Placement**: For the Sales Summary (Chart) page, the global Refresh button is located in the `PageHeader` (next to the tab switcher) and uses a permanent `text-[var(--color-brand-600)]` icon. Other pages (Matrix, Top Items) keep their local refresh buttons in their respective card toolbars.

## Role Access
Sales users can access Sales Analytics and customer summary/reporting pages. Admin users can access all pages.
