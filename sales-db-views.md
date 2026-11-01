# Sales Database Views Preparation

> Environment status: **TEST DATABASE ONLY**. The view, row counts, audit findings, and validation results in this document are not from the production database.

> Do not run these scripts or enable this view in production until the production schema is checked separately and the user explicitly approves the change.

## Purpose
This file records what is needed before moving Sales report queries to SQL Server views.

Goal:
- Make Sales numbers consistent across Summary, Matrix, Customer Trends, Top Item Gallery, Order List, and Sales Dashboard.
- Keep formulas for amount, qty, shipped qty, gap qty, status, item type, and customer identity in one database layer.
- Reduce repeated `OrdHD + OrdDT` joins in backend route files.

Non-goal:
- Do not run SQL on production from this document.
- Do not replace all backend queries at once.
- Do not move UI state, URL behavior, or sidebar logic into database views.

## Verified Test Database State (2026-07-27)

Created in the test database:

- `dbo.VW_SalesOrderLineAnalytics`

Not created:

- Customer monthly aggregate view
- Item monthly aggregate view
- Customer group mapping table

Validation performed against the test database schema:

- Current view rows: `755,199`
- The view now matches `OrdHD` and `OrdDT` by both `OrdID` and `OrdNo`.
- The previous `OrdNo`-only join created `4` cross-matched rows for `CBC130022` and `CBC130023`.
- The test backend now references this view through `backend/routes/salesAnalytics.js`.
- `(OrderNo, OrderLineNo)` is not guaranteed unique because a line can contain different item records or different order versions.

Data quality notes:

- `11` records have a blank `ItemNo`.
- `211,633` records have a null or blank `GoodCode`.
- Use `COALESCE(NULLIF(LTRIM(RTRIM(d.GoodCode)), ''), d.ItemNo)` when a complete `ItemSKU` is required.
- `CustomerDueDate` is complete for order years `2023-2026`.
- Older data is incomplete: part of `2022` and all checked `2021` records are missing `CustomerDueDate`.

## Deep Audit Findings (2026-07-27)

- `OrdHD` has `176,074` rows. `OrdID` is unique in the current data, but the table has no primary key or index.
- `OrdDT` has `755,246` rows and also has no primary key or index.
- `GMCust.CustCode` is unique in the current data and does not multiply the view rows.
- Two order numbers, `CBC130022` and `CBC130023`, each have two header versions with different `OrdID` values.
- The previous `OrdNo`-only join created `4` cross-matched rows in 2013, adding Qty `22` and Amount `297.60`.
- The corrected `OrdID + OrdNo` join removes the cross-match, but the two extra order versions still add Qty `11` and Amount `148.80`. A canonical-version rule is still required.
- `BBQ160645 / Line 5` has three records with identical sales values. The two additional records add potential Qty `4` and Amount `67.76` in 2016.
- There are `47` `OrdDT` rows from six orders with no matching `OrdHD` record, plus `9` headers with no details.
- Under the existing Customer Trends filters for 2025-2026, no repeated `(OrdID, OrdNo, OrdLineNo)` groups were found.
- The 2025-2026 repeated lines found outside that scope use the excluded `BBD` prefix and contain different item records. Do not delete them automatically.
- The repeatable read-only audit is saved in `backend/sql/viewsDB/audit_VW_SalesOrderLineAnalytics.sql`.

## Current Sales Consumers
The views should support these current frontend pages and backend routes.

Frontend:
- `CustomerDashboardLayout.tsx` (Container)
- `CustomerDashboard.tsx` (Sales Summary)
- `CustomerReportPage.tsx` (Matrix)
- `OrderVolumeSummaryPage.tsx` (Order Trends)
- `TopOrdersGalleryPage.tsx`
- `TopOrdersAnalyticsPage.tsx`
- `POTrackerAdvanced.tsx`
- (Legacy: `SalesDashboard.tsx`, `SalesCustomerGroupDetail.tsx`)

Backend routes currently querying sales/order data:
- `backend/routes/customerSummary.js`
- `backend/routes/customerReportMatrix.js`
- `backend/routes/orderVolumeSummary.js`
- `backend/routes/topOrdersGallery.js`
- `backend/routes/topOrdersAnalytics.js`
- `backend/routes/poTrackerAdvanced.js`
- `backend/routes/salesAnalytics.js` (legacy)

## Verified Source Tables

The created view currently reads from:

- `dbo.OrdHD`
- `dbo.OrdDT`
- `dbo.GMCust`

The created view does not join `dbo.GMGoodType`.

## Business Decisions Before Backend Adoption
These decisions affect every Sales report.

1. Date basis
   - Confirm that Sales reports use `OrdHD.OrdDate` as the main report date.
   - If some reports use `CustDueDate`, keep that as a separate filter field, not the default sales date.

2. Amount formula
   - Current behavior uses line amount: `ItemExchAmnt` fallback `ItemAmnt`.
   - Proposed canonical formula: `COALESCE(d.ItemExchAmnt, d.ItemAmnt, 0)`.

3. Qty formula
   - Ordered qty: `COALESCE(d.ItemQty, 0)`.
   - Shipped qty: `COALESCE(d.ExportQty, 0)`.
   - Gap qty: `CASE WHEN ItemQty > ExportQty THEN ItemQty - ExportQty ELSE 0 END`.

4. Sales status formula
   - `Shipped`: shipped qty >= ordered qty and ordered qty > 0.
   - `Partial`: shipped qty > 0 and shipped qty < ordered qty.
   - `Late`: not fully shipped and customer due date is before current date.
   - `Open`: remaining active line.
   - Confirm precedence if a late line is also partially shipped.

5. Customer group ownership
   - Current frontend group source is `frontend/src/config/customerGroups.ts`.
   - Long term, customer group mapping should move to DB if SQL views need group fields.
   - Safer first step: base views expose `CustCode`; backend still applies group mapping until DB mapping is approved.

6. Order inclusion rules
   - Confirm active order prefixes and exclusions.
   - Confirm whether sample, stock, test, closed, or cancelled orders should be excluded per Sales report.
   - Do not hardcode business exclusions in a base view unless every Sales report uses the same rule.

7. SQL Server compatibility
   - Production context says SQL Server 2012 Enterprise.
   - Avoid newer SQL features that SQL Server 2012 does not support.
   - Keep filters in API queries so they can use indexes.

## View Layer

### 1. `dbo.VW_SalesOrderLineAnalytics` - Created

One row per matching `OrdDT` record after matching the order version by `OrdID + OrdNo`.

Use for:
- Customer Trends
- Order List
- Top Item Gallery
- Top Items Qty
- Sales Dashboard drilldowns
- Matrix and Summary aggregation source

Current output fields include:
- `OrderNo`
- `OrderLineNo`
- `OrderDate`
- `OrderYear`
- `OrderMonth`
- `FactoryDueDate`
- `CustomerDueDate`
- `ShipDate`
- `CustomerCode`
- `CustomerName`
- `CustomerStatus`
- `Market`
- `SalesName`
- `Brand`
- `PONo`
- `PO2`
- `ShipTo`
- `OrderStamp`
- `OrderMaker`
- `ItemNo`
- `ItemSKU`
- `ItemDesc`
- `ItemType`
- `ProductType`
- Material, size, stone, plate, and set-type fields
- `Currency`
- `ItemWeight`
- `OrderQty`
- `ShippedQty`
- `OpenQty`
- `ItemPrice`
- `OrderAmount`
- `ShippedAmount`
- `OpenAmount`
- `CloseStatus`

Important:
- The `OrdHD` to `OrdDT` join is verified as `d.OrdID = h.OrdID AND d.OrdNo = h.OrdNo`.
- `OrderAmount` uses `COALESCE(ItemExchAmnt, ItemAmnt, 0)`.
- `ItemSKU` currently comes from `GoodCode`; use the fallback noted above before relying on it in all records.
- Do not use `(OrderNo, OrderLineNo)` as a unique frontend row key without an additional stable identifier or a duplicate-handling rule.

### 2. Customer Monthly Aggregate - Not Created

Aggregated customer/year/month view.

Use for:
- Sales and Qty Summary
- Sales Matrix
- Quantity Matrix

Output fields:
- `CustomerCode`
- `OrderYear`
- `OrderMonth`
- `OrderQty`
- `ShippedQty`
- `GapQty`
- `LineAmount`
- `OrderCount`
- `LateOrderCount`

Build from `dbo.VW_SalesOrderLineAnalytics`, grouped by customer/year/month, only if API performance requires it.

### 3. Item Monthly Aggregate - Not Created

Aggregated item/customer/year/month view.

Use for:
- Top Item Gallery
- Top Items Qty
- Item drivers inside Customer Trends

Output fields:
- `ItemNo`
- `ItemDesc`
- `ItemType`
- `ItemTypeName`
- `PrimaryCustomerCode`, if approved
- `OrderYear`
- `OrderMonth`
- `OrderQty`
- `ShippedQty`
- `LineAmount`
- `OrderCount`

Primary customer may be better computed in backend because it depends on active metric: amount or qty.

### 4. Optional `dbo.SalesCustomerGroup` - Not Created
Use a real table, not a hardcoded view, if customer group ownership moves to DB.

Columns:
- `GroupId`
- `GroupLabel`
- `CustomerPrefix`
- `SortOrder`
- `IsActive`

Reason:
- Customer group mapping changes over time.
- Frontend colors can stay in theme tokens, but group membership should be auditable if reports depend on it.

## Backend Migration Plan
Use a slow, verifiable migration. Do not switch every endpoint together.

All migration work in this section must start against the test database. Production remains unchanged until separately approved.

Current test status:

- All five endpoints in `backend/routes/salesAnalytics.js` now read from `dbo.VW_SalesOrderLineAnalytics`.
- Order, factory due, customer due, and ship date filters match the source query for the checked 2026 period.
- API response shapes were verified for customer groups, monthly analytics, type analytics, order rows, and top items.
- No production backend or production view has been changed.

1. Export the reviewed view definition to `backend/sql/viewsDB/VW_SalesOrderLineAnalytics.sql`.
2. Add read-only endpoints or feature flag, for example `USE_SALES_VIEWS=true`.
3. Compare old query output and view output for:
   - Same years
   - Same months
   - Same customer groups
   - Same metric amount and qty
4. Switch one endpoint first:
   - Recommended first endpoint: customer summary or customer trends.
5. Keep old query available until totals match within approved tolerance.
6. After all Sales pages match, remove duplicated formulas from route files.

## Validation Checklist
Use fixed test cases before changing production behavior.

Totals to compare:
- Grand total amount by year
- Grand total qty by year
- Customer monthly amount
- Customer monthly qty
- Top item qty
- Top item amount
- Shipped qty
- Gap qty
- Late order count

Pages to verify:
- Sales & Qty Summary
- Sales Matrix
- Quantity Matrix
- Customer Trends
- Order List
- Top Item Gallery
- Top Items Qty
- Sales Dashboard

## Decisions Still Needed

1. Should closed orders be included in historical Sales reports?
2. Should sample, stock, test, or inactive order prefixes be excluded?
3. Should customer group mapping stay in frontend or move to DB?
4. Is `GoodCode` officially the item SKU, with `ItemNo` used as fallback?
5. How should duplicate source rows be handled in detail screens and totals?

## Implementation Files Needed Later
Files to create or edit after approval:

- `backend/sql/viewsDB/VW_SalesOrderLineAnalytics.sql`
- `backend/routes/salesAnalytics.js`
- `backend/routes/topOrdersGallery.js`
- `backend/routes/customerReportMatrix.js`
- `backend/sql/README.md`
- `sales-db-views.md`

## Safety Rule

Do not switch backend endpoints to the new view until:

- The backend connection is confirmed to point to the test database.
- The current database definition is exported and reviewed.
- Old and new endpoint totals are compared.
- Duplicate-source handling is agreed.
- The user explicitly approves enabling the view in the test backend.

Do not create or alter the production view without a separate production review and explicit approval.
