# PO Tracker

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

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
- **Filters — Toolbar + Popover**: Group toggle and Status toggle remain permanently visible in a single toolbar row. Secondary filters (Week/Customer/PO/Type/ShipTo/Date Range) are housed inside the "Filters" button, whose count badge shows how many are active; the FilterX button resets every filter. (Removable filter chips under the toolbar were planned but are not built.)
- **Summary row**: Pending (or Finished / All Orders, following Status) and Overdue (Cust Due) are the main numbers on the left; Overdue turns red only when it is above zero. PO, Total Qty and Amount follow as smaller, neutral numbers after a thin divider.
- **Flat layout (2026-11-27)**: one surface like the Order List and the Customer Report Matrix. No frames or shadows around the toolbar, the summary or the table; sections are separated by hairlines (`pages/POTracker.css`). Custom View / Filters use the shared `ErpButton`; `Reset Columns` shows only after a column was resized. Table: a thin line under each row, no line between columns except where a column group starts (Customer Data | Production — Stage | Book / QC | Pack / Tag | Issue / Plan, from `COLUMN_GROUPS`); the pinned block keeps its edge shadow. The pager is flat (current page tinted).
- **Photo size and hover preview (2026-11-27)**: when the Photo column is shown (N051 by default, any group through Custom View), the toolbar offers `Photo S | M | L` (40 / 72 / 112 px), saved per user (`po-tracker-photo-size:v1:<USERNAME>`). The size is passed as the CSS variable `--po-photo-size`; the Photo column's default width follows it (a width the user dragged still wins, and the photo never grows wider than its column). Hovering a photo for 200 ms shows a 260 px preview beside it (hidden on leave or scroll); a click still opens the full-screen photo. The photo is one representative item per row (`SampleItemNo` = first ItemNo of the PO).
- **Pagination — Pinned, Zero Whole-Page Scrolling**: Consolidated into a single pinned bottom toolbar (Showing X–Y of Z + page size selector + Prev/page numbers/Next unified in one row). `OrderTable.tsx` no longer accepts `totalCount`/`pageSize`/`onPageSizeChange` props since pagination logic lives in `POTrackerAdvanced.tsx`. The Data Table card utilizes flex column (`flex: 1, minHeight: 0`) to fill the remaining viewport, and the scroll container in `OrderTable.tsx` replaces fixed `maxHeight: calc(100vh - 280px)` with `flex: 1, minHeight: 0`, pinning pagination to the bottom of the screen permanently.
- **Column Widths — Smooth Resize, Remembered Per User (2026-11-24)**: `POTrackerAdvanced.tsx` owns `useColumnWidths('po-tracker', DEFAULT_COL_WIDTHS, { keys, stickyKeys: PINNED_KEYS })` and passes it to `OrderTable.tsx` as the `columnWidths` prop (also drives the Reset Columns button). Dragging changes only the `<col>` width, the table width and (for a pinned column) one small `<style>` rule per pinned column (`stickyClass(key)` on its header and body cells sets `left`), so the table body is not re-rendered or fully re-styled on every pointer move; widths of hidden columns stay saved. Only pinned cells get `position: sticky` / `z-index` — normal cells have no position, so they do not each create a stacking context. Known limit (accepted 2026-11-25): dragging a pinned column still repaints the whole table each frame (~20–25 ms per frame on the test machine); a guide-line preview applied on release was offered and declined for now. The visible column list comes from `getActiveColumnKeys()` in `orderTableConfig.tsx` (shared by both files). No transitions on rows/cells (they made the resize lag 0.2 s behind the pointer).
- **Line Detail Drawer & Order Line Table**:
  - `OrderLineTable.tsx` avoids awkward text wrapping in narrow columns (e.g., 'Plating') for clean readability. Its column widths use `useColumnWidths('order-detail-lines', ...)` the same way (remembered per user).
  - Photo container backgrounds in `LineDetailDrawer.tsx` utilize `--color-product-canvas` for high contrast across all themes, with close buttons mirroring the Lightbox pattern.
- **Column Presets Synchronization**: Default column presets (Sales, Production, All) in `orderDetailColumns.ts` achieve 100% parity with legacy VB.NET checkboxes (adding `QCDate`, `FinishQty` to Sales and `OrdRemark` to Production).

## 2026-09-25 PO Tracker Modernization & Strict DB Baseline Compatibility

The database policy that was repeated here is the guardrail at the top of `CLAUDE.md`.

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
