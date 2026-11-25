# Period Setup and Customer Group Filter

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## Period Setup Consolidation (Sept–Oct 2026)

- **Goal**: Consolidate redundant "Period Setup" logic into a single centralized hook `usePeriodSetup` + UI component `PeriodSetupPanel.tsx`.
- **Scope**: All dashboards — CustomerDashboard, CustomerReport, SalesDashboard, ProductionSummary, ProductionForecast.
- **Key Files**:
  - `src/hooks/usePeriodSetup.ts` — Centralized state management (presets, compare years, week/month/day ranges, URL sync)
  - `src/components/period/PeriodSetupPanel.tsx` — Shared popover UI with preset buttons, month/week/day selectors, compare year checkboxes
  - `src/utils/periodUtils.ts` — Shared helpers (`getDefaultCompareYear`, `parseMonths`, `monthRange`)
- **Supported Presets**: `full-year`, `ytd`, `this-month`, `last-month`, `month`, `week`, `day`, `custom`
- **Default Period**: `full-year` (changed from `month` on 2026-10-01)
- **Compare Target**: Checkbox-based activation (Compare 1 / Compare 2) with auto-selection of compare year
- **Status**: ✅ Completed and deployed across all dashboard pages.

## Period Setup Changes (2026-10-01)

### 3. Period Setup Default Change
- **Default preset** changed from `month` to `full-year` in `usePeriodSetup.ts`.
- When `full-year` is selected, `monthFrom` defaults to `1` and `monthTo` defaults to `12` (full range).
- This ensures the "Year" filter mode displays all 12 months of data by default.

### 4. Compare Target Checkbox
- Added checkbox-based activation for Compare Year selection in `PeriodSetupPanel.tsx`.
- Users can toggle Compare 1 / Compare 2 independently via checkboxes.
- When a checkbox is activated, the compare year auto-selects the nearest available year.

## 2026-11-16 Customer Group Filter — Active / Inactive

> Order Trends (`/dashboard/customer/trends`) was removed on 2026-11-18; its old URLs redirect to Sales Summary.

The customer group dropdown (`CustomerGroupFilter.tsx`, `TopOrdersFilterBar.tsx`) lists groups in two sections. **A group is Active when it has ordered quantity (> 0) in the selected period under every page filter except the group filter itself**; other groups appear under "Inactive" (still selectable). Until the first data load, every group is shown as active (`getActiveGroupIds(null)`), so groups do not jump between sections.

**Default selection = the Active groups (since 2026-11-21)** — `hooks/useGroupSelection.ts`:
- Automatic mode (`manualGroups === null`): the selection is the period's Active groups and follows them when the period changes. Inactive groups are not selected; this changes no totals (they have no orders in the scope).
- Any user change stores an explicit list (URL `groups=<ids>` or `groups=none` on Sales Summary / Customer Report). Selecting exactly the Active groups — e.g. the popover's `All` button, which now selects the Active groups — returns to automatic; Reset also returns to automatic. Automatic mode writes no `groups` param; an old `groups=all` link opens in automatic mode.
- In automatic mode the APIs still get every group (`groups=all` on `/api/items/top-gallery`), so there is no second request once the Active groups are known.

| Page | Source of the active groups |
|------|------------------------------|
| Customer Dashboard (Sales Summary) | loaded `customer-summary` rows → `getActiveCustomerCodes(custData, activeYears)` → `getActiveGroupIds` |
| Customer Report (Matrix) | same, in `useCustomerReportData.ts` |
| Top Item Gallery | `activeGroups` in the `/api/items/top-gallery` response (respects period, salesperson, product type; ignores the group filter) |
| Top Items Analytics (draft) | not wired — every group shown as active |

- Helpers: `getActiveGroupIds(codes | null)` in `config/customerGroups.ts`; `getActiveCustomerCodes(rows, years)` in `hooks/useCustomerSalesData.ts`.

### Group filter sent to the API (Order List)
- Order List (`/dashboard/sales-customer-detail`, drill-down from Customer Report Matrix) filters on the server, so the selected groups are turned into customer codes by `getGroupCustomerFilter(groupIds)` (`config/customerGroups.ts`).
- General has no code list. When General is selected the API gets `excludeCustomers` = codes of the named groups that are **not** selected (`ISNULL(CustCode,'') NOT IN (...)` in `buildSalesFilters`), so new customer codes are included automatically. Without General it gets `customers` = codes of the selected named groups (`CustCode IN (...)`). Every group or no group selected → no customer filter.
- This is not `GMCust.CustStatus`: every customer in the named groups is `Y`; all `N` customers are in General, and both views (`VW_Web_SalesDashboard`, `VW_Web_OrderTrends`) exclude `N` customers by their **current** status, which also removes their past sales from historical years (2015–2020 mainly; none since 2022).
