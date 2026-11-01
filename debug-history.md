# Debug History & Lessons Learned

## Issue: White Screen / Syntax Errors after UI Modifications
**Date:** 2026-06-20
**Component:** `CustomerReportPage.tsx`

### Symptoms:
The user experienced a "white screen" (app crash) or the app failed to compile after I attempted to remove the "View Controls" dropdowns and refactored the "Growth Comparisons" code.

### Root Cause 1: Broken JSX Structure (Unclosed Tags)
When using regex or text replacements to remove blocks of JSX (like the `Compare 2 Years` dropdowns), I accidentally deleted the closing `</div>` tag of a wrapper element.
This caused a cascading syntax error down the entire file (`TS17015: Expected corresponding closing tag for JSX fragment`), resulting in a compilation failure and white screen.

### Root Cause 2: Unmatched State Variables
When running scripts to refactor state (`growthYearA` to `growthComparisons`), the regex/string replacements failed to catch all instances because of slight indentation mismatches. The `growthYearA` variable was left undefined in the table rows and footers, causing runtime crashes (`Cannot find name 'growthYearA'`).

### Prevention & Lessons Learned:
1. **Always Verify JSX Hierarchy:** When deleting or replacing UI components, meticulously trace the opening and closing tags. If deleting a component, ensure the parent wrapper is either closed properly or deleted entirely if it's no longer needed.
2. **Use Strict Verification:** After every significant file modification, always run `npm run build` or `npx tsc --noEmit` to verify that there are no syntax or type errors before returning to the user.
3. **Avoid Loose Replacements on Large Files:** When refactoring a variable across a massive file, use AST-based tools or careful `multi_replace_file_content` chunks rather than a single massive `.cjs` replace script that might silently fail on whitespace mismatches.
4. **Subagent Testing:** If an issue is suspected, spawn a browser subagent to visually confirm the page loads without React errors in the console.
## Issue: Inline CSS Variables for Fonts Not Applied in Tailwind
**Date:** 2026-06-24
**Component:** Topbar.tsx

### Symptoms:
After standardizing the Topbar.tsx component, the user noticed the fonts looked different. The title text reverted to the browser default font rather than using ar(--font-display) and ar(--font-logo).

### Root Cause:
I attempted to apply the font by adding ont-display to the Tailwind className. However, ont-display and ont-logo were not actually configured as utility classes in Tailwind. Because Tailwind didn't recognize the class, it did nothing.

### Prevention & Lessons Learned:
1. **Always Verify Tailwind Config for Custom Classes:** Do not assume that because a CSS variable like --font-display exists, a corresponding Tailwind class ont-display also exists.
2. **Use Inline Styles for Unconfigured Variables:** If a custom font or CSS variable is not mapped to a Tailwind class, use inline styles (e.g., style={{ fontFamily: 'var(--font-display)' }}) to guarantee it is applied correctly, mirroring how the rest of the codebase handles it.

## Issue: Dangling Code Fragment Causes Severe Syntax Error
**Date:** 2026-06-24
**Component:** `TopOrdersGalleryPage.tsx` and `LoginPage.tsx`

### Symptoms:
After restoring the missing `return` statement in `TopOrdersGalleryPage.tsx`, another severe syntax error appeared around line 265 (`Unexpected token. Did you mean '{'}' or '&rbrace;'`). Simultaneously, the `LoginPage.tsx` typo (`awai \n t`) reappeared, crashing the build.

### Root Cause:
1. **Dangling Code Fragment:** In `TopOrdersGalleryPage.tsx`, the previous corrupted regex replacement left behind a dangling fragment of code (`/>color-danger-500)',...`) from the old `showFilters` UI block right after the `<Topbar />` component. This fragment broke the JSX structure.
2. **Reverted Fixes:** The fix for `LoginPage.tsx` was accidentally reverted (likely by IDE undo history or auto-save conflicts), bringing back the typo.

### Prevention & Lessons Learned:
1. **Clean Up Dangling Blocks:** When recovering from a corrupted file or doing manual string replacements, always check for trailing fragments of code that were cut off in the middle of a CSS string or JSX block.
2. **Monitor File Sync:** Be aware of concurrent edits or IDE auto-saves that might silently revert recent bug fixes. Always re-run `tsc --noEmit` after all edits.

## Issue: TS6133 Unused Variables and TS2786 Component Return Type Errors
**Date:** 2026-06-24
**Component:** TopOrdersGalleryPage.tsx and 4 other files

### Symptoms:
After restoring the missing braces in TopOrdersGalleryPage, the npm run build process still failed with multiple TS6133 (unused variables) errors across 5 files (Topbar.tsx, CustomerReportTable.tsx, CustomerReportPage.tsx, DashboardDetail.tsx, ItemDetailPage.tsx). Additionally, TopOrdersGalleryPage failed with TS2786 (TopOrdersGalleryPage cannot be used as a JSX component).

### Root Cause:
1. **Misplaced Return Statement:** During the previous automated refactor of TopOrdersGalleryPage.tsx, the primary component's return statement was accidentally injected *inside* the getRankStyle helper function. This caused the component to return void instead of JSX.Element, breaking the app compilation.
2. **Strict TypeScript Config:** The project is configured to reject unused locals. Previous UI simplifications left behind unused declarations (like useNavigate, icons, and React imports).

### Prevention & Lessons Learned:
1. **Careful Regex Placements:** Always verify the lexical scope when injecting code via string replacement. Restoring a return statement must happen at the component body level, not inside nested helper functions.
2. **Aggressive Cleanup:** When removing components (like Back buttons), always remember to also remove their imports to prevent the strict TS compiler from halting the build.

## Issue: PO Tracker SP ช้า + Index หายเกลี้ยง + `_All`/dateType อื่นพังเงียบ
**Date:** 2026-07-02
**Component:** `PC_Show_OrdTrack_Sum_*` (dbGeneration), `routes/orders.js`, `backend/sql/`

> ⚠️ **สถานะปัจจุบัน (2026-10-08):** Index (Fix #2) **ยังอยู่และใช้งานจริง** — แต่การแก้ SP ทั้งหมด (Fix #1, #3) และการส่ง `@Status` (Fix #4) **ถูกยกเลิก** เพราะทำให้ระบบ VB.NET เดิมพัง → SP บน DB เป็นตัวเดิม, backend ส่งแค่ `@FromDate`/`@ToDate`, กรองสถานะใน Memory และนโยบายตอนนี้คือ **ไม่แตะ DB 100%**

### Symptoms:
งานหลักคือตัดการดึงรูปแบบ base64 (VARBINARY จาก `GMItemPhoto`) ออกจากระบบ + เร่ง SP ให้เร็วขึ้น ระหว่างเช็คข้อมูลจริงก่อนแก้ พบปัญหาที่ซ่อนอยู่หลายจุด

### Root Causes (สิ่งที่เจอตอนเช็คข้อมูลจริง):
1. **Index หายเกลี้ยง เหลือแค่ `PK_GMCust`** — ตาราง `OrdHD` (176k), `OrdDT` (755k), `OrdTrackDT`, `OrdWeekPlanHD` เป็น HEAP ไม่มี index เลย → SP วิ่ง full scan + correlated subquery ต่อแถว = คอขวดตัวจริง (แม้ในเอกสารจะระบุว่าเคยสร้าง index ครบแล้วก็ตาม)
2. **`GROUP BY` ด้วยก้อน VARBINARY(MAX)** — SP `LEFT JOIN GMItemPhoto` แล้ว `MAX(CAST(ItemPhoto AS VARBINARY(MAX)))` ในทุก aggregate CTE + outer query ยัง group by blob อีกชั้น + โอน base64 หลาย MB มา Node ทุกครั้ง
3. **`_All` ALTER ไม่ได้** — อ้าง `LEFT JOIN VPC_OrdSum_Detail` ซึ่งเป็น view ที่ binding error (อ้างตาราง `MasterFileProduct`/`Item_Head` ที่หายหลัง restore) → `_All` เดิมรันไม่ได้อยู่แล้ว (broken เงียบ)
4. **@Status drift** — มีเพียง SP `_OrdDate` ที่ประกาศ `@Status` ส่วน `_DueDate`/`_CustDueDate`/`_FinDate`/`_All` เป็นเวอร์ชันเก่าไม่มี param นี้ แต่ backend ส่ง `@Status` ให้ทุกตัว → dateType อื่นนอกจาก Order Date error "too many arguments" (พังเงียบ)

### Fixes:
1. **ตัดรูปออกจาก SP ทั้ง 5** → เปลี่ยน `MAX(CAST(...ItemPhoto...))` เป็น `MIN(OrdDT.ItemNo) AS SampleItemNo` + ลบ join `GMItemPhoto` + ลบ blob ออกจาก GROUP BY (ยืนยัน `GMItemPhoto` เป็น 1:1 → SumQty/SumItem/SumAmnt/row count เท่าเดิมเป๊ะ pure perf win)
2. **สร้าง 9 covering index** (NONCLUSTERED, `ONLINE=ON`, `DATA_COMPRESSION=PAGE`) — ไม่แตะ heap/clustered เพื่อลดความเสี่ยงต่อระบบ VB.net เดิม (`backend/sql/indexes.sql`)
3. **ลบ dead join `VPC_OrdSum_Detail`** ใน `_All` (join แบบ LEFT ไม่ select คอลัมน์ใดเลย = no-op ต่อผลลัพธ์เพราะ GROUP BY ยุบ row ซ้ำ) → `_All` กลับมาใช้ได้
4. **backend ส่ง `@Status` เฉพาะ SP `_OrdDate`** (`if (spName.endsWith('_OrdDate'))`) → dateType อื่นกลับมาทำงาน
5. เก็บ SP/Index/baseline เป็นไฟล์จริงใน `backend/sql/` เป็น SSOT กัน "หายตอน restore"

### Prevention & Lessons Learned:
1. **เช็คข้อมูลจริงก่อนเสมอ (dump SP + `sys.indexes` + `sys.columns` + count):** เอกสาร (claude.md) บอกว่า index ครบ แต่ของจริงเหลือตัวเดียว — อย่าเชื่อเอกสารอย่างเดียว
2. **ก่อนตัด join ที่อยู่ใน 段 aggregate ต้องเช็ค cardinality:** ถ้า `GMItemPhoto` เป็น 1:many การลบ join จะทำให้ยอด SUM เปลี่ยน — ที่นี่เป็น 1:1 เลยปลอดภัย (ยืนยันด้วย `HAVING COUNT(*)>1`)
3. **แก้ SP ทีละตัว + เทียบ row/sum ก่อน-หลัง:** จับ `_All` ที่พังและ @Status drift ได้เพราะรันทดสอบทีละตัว
4. **สร้าง index แบบ `ONLINE=ON` บน Enterprise:** ตรวจก่อนว่าไม่มี LOB column (จะ block online clustered build บน SQL 2012) — ที่นี่ไม่มี LOB ในตารางเป้าหมาย

## Issue: Over-engineering UI and Unimported Variables Cause React Crash & Hidden Elements
**Date:** 2026-07-07
**Component:** `LineDetailDrawer.tsx` and `OrderDetailPage.tsx`

### Symptoms:
1. Opening the Line Detail Drawer caused a complete app crash (White Screen).
2. After fixing the crash, clicking the photo thumbnail inside the Drawer appeared to do nothing (the full-screen photo didn't show up).
3. The user expressed confusion over a completely new dark-mode design that they never requested.

### Root Cause:
1. **Unimported Function:** While attempting to fix a date formatting bug, I replaced `formatColumnValue` with `formatV` but forgot to add `formatV` to the import statement at the top of `LineDetailDrawer.tsx`. This caused a `ReferenceError: formatV is not defined` when React attempted to render the component, resulting in a white screen.
2. **z-index Conflict:** I moved the photo Lightbox logic to the parent `OrderDetailPage.tsx` and gave it a `zIndex` of 1000. However, the `LineDetailDrawer` had a `zIndex` of 9001. When the photo was clicked, the Lightbox opened successfully but rendered *behind* the Drawer, making it invisible to the user.
3. **Misinterpreting User Intent:** The user provided a screenshot of the existing UI and asked to "design it better and make the photo viewing match the top gallery." I misinterpreted this as a request for a complete UI overhaul and hallucinated a complex dark-mode layout, completely overwriting their functional component.

### Prevention & Lessons Learned:
1. **Always Verify Imports:** Whenever replacing or adding function calls via automated text replacement, rigorously check the import block to ensure all dependencies are available. A missing import in React causes fatal runtime crashes.
2. **Double-Check Stacking Contexts (z-index):** When implementing global overlays (like Modals or Lightboxes), always verify the `zIndex` against other elevated components like Drawers or Navbars to prevent z-index wars and hidden overlays.
3. **Don't Over-engineer:** Stick strictly to what the user asks for. If a user asks for a specific fix (like photo zooming behavior), do not rewrite the entire component layout unless explicitly instructed to do so.
4. **Git Checkout for Quick Recovery:** When a component is hopelessly over-engineered or broken, using `git checkout` to revert to the last working state and starting fresh is safer and faster than trying to patch the broken new code.

## Issue: Missing "Group" Column in PO Tracker (FBD+PF1+PL3)
**Date:** 2026-07-08
**Component:** `PC_Show_OrdTrack_Sum_*` SPs and `OrdTrackDT`

### Symptoms:
The user noticed that the "Group" column (which showed values like `FBD+PF1+PL3`, `PF1+PL1`) was missing in the new PO Tracker. Initial assumption was that this string was dynamically concatenated in the Stored Procedure based on pending quantities.

### Root Cause:
After reviewing the old VB.net source code (`PC_Face_OrdTrack_Sum.vb`), we discovered that the "Group" column was actually a direct mapping to the `OrdMaker` field. The user confirmed that `OrdMaker` is physically stored in the database within the `dbo.OrdTrackDT` table.
The new SPs (`PC_Show_OrdTrack_Sum_*`) simply omitted selecting `OrdTrackDT.OrdMaker`, which is why the column disappeared.

### Prevention & Lessons Learned:
1. **Don't assume dynamic logic for legacy fields:** What looks like a dynamically calculated string (`FBD+PF1+PL3`) might just be a hardcoded/pre-calculated value stored in a physical database column (`OrdMaker`).
2. **Verify against the source DB:** Always check the related tables (`OrdTrackDT`) for missing columns before attempting to recreate complex grouping logic in Node.js.

## Issue: Mixed Dashboard API/Route File Grew Into Multiple Domains
**Date:** 2026-07-16
**Component:** frontend services and backend dashboard/items routes

### Symptoms:
1. dashboardAPI.ts contained dashboard core, customer summary, customer sales analytics, top items, and item yearly summary clients.
2. backend/routes/dashboard.js contained dashboard core, customer summary, sales analytics, top items, and detail endpoints.
3. backend/routes/items.js contained only item yearly summary behavior, but the generic file name made ownership unclear.

### Root Cause:
New analytics endpoints were added into the nearest existing dashboard files. That was fast initially, but it made ownership unclear and increased the risk of accidental edits across unrelated domains.

### Fixes:
1. Split frontend service clients into customerSummaryAPI.ts, customerSalesAPI.ts, and itemYearlySummaryAPI.ts.
2. Kept dashboardAPI.ts focused on dashboard core and added compatibility re-exports so existing imports can migrate gradually.
3. Split backend routes into customerSummary.js, customerSales.js, and itemYearlySummary.js while preserving existing URL prefixes.
4. Kept routes/items.js as a compatibility wrapper and mounted the new routers in server.js.

### Prevention & Lessons Learned:
1. Split by domain responsibility before renaming files. If one file still contains multiple domains, extract the domains first.
2. Preserve endpoint URLs during structure refactors unless the change is explicitly planned as a breaking API migration.
3. For draft pages like TopOrdersAnalyticsPage.tsx, keep changes limited to import boundaries until the final UX/data model is confirmed.

## Issue: Deselected Customer Group Chip Retained a Dark Border
**Date:** 2026-07-23
**Component:** `SalesCustomerGroupAnalytics.tsx`

### Symptoms:
After selecting a customer group and then clicking `All`, the previously selected chip retained a dark frame. It looked like a stuck focus ring, but browser inspection confirmed that neither `:focus` nor `:focus-visible` was active.

### Root Cause:
The base React inline style used the `border` shorthand, while the selected state conditionally overrode only `borderColor`. When the chip changed from selected to inactive, React removed the conditional `borderColor`, but the unchanged `border` shorthand was not reapplied. The border color therefore fell back to `currentColor`, making the chip's text color become its border color.

### Fix:
Replaced the `border` shorthand with explicit `borderWidth`, `borderStyle`, and `borderColor` properties in the base styles. The selected state now overrides the same `borderColor` property, so React reliably restores `var(--color-border-light)` when the chip becomes inactive. The same correction was applied to month options that used the same pattern.

### Verification:
A browser interaction test simulated `N051 Group -> All`. After deselection, the computed border color matched `--color-border-light`, the outline was `none`, and both focus states were false.

### Prevention & Lessons Learned:
1. Do not mix CSS shorthand and longhand properties across conditional React inline-style states.
2. Keep the same property keys in base, active, hover, and disabled style objects.
3. When a visual state appears stuck, inspect computed styles and pseudo-classes before assuming it is a focus problem.
4. Test the complete state transition, not only the initial selected appearance.

## Issue: 60-30-10 Role Tokens Did Not Follow the Active Theme
**Date:** 2026-07-29
**Component:** `src/index.css` theme and role tokens

### Symptoms:
`body` had the correct theme class, but `--color-ui-canvas`, `--color-ui-surface`, and `--color-ui-interactive` still resolved to Modern Dark values in Royal White and Dark Gold.

### Root Cause:
The role aliases were declared only on `:root` by Tailwind's `@theme`. Their references to palette tokens were resolved at the root scope before the palette overrides on the themed `body` element applied.

### Fix:
Redeclared the 60-30-10 role aliases on `body`, the same element that receives the theme class. Each role now resolves against the active theme palette. Focus-ring opacity and semantic status tokens were also adjusted to meet contrast requirements.

### Verification:
Headless browser tests confirmed distinct computed canvas, surface, and interaction values for all three themes. Text/status contrast passes 4.5:1, focus indicators pass 3:1, and desktop/mobile pages have no document-level horizontal overflow.

### Prevention & Lessons Learned:
1. Declare alias tokens on the same element that owns palette overrides, or repeat aliases inside each theme scope.
2. Test computed custom-property values after switching themes; checking class names alone is insufficient.
3. Verify focus and semantic colors as composited contrast, including alpha transparency.

## Issue: High-Resolution Screens Looked Undersized And Loading Replaced The App Shell
**Date:** 2026-07-29
**Component:** `AppLayout.tsx`, `ThemeContext.tsx`, shared page layouts, and `src/index.css`

### Symptoms:
1. At 2560x1440, some pages kept a narrow fixed composition or used CSS scaling, leaving large unused areas and making the interface feel unlike 1920x1080.
2. Mobile layouts inherited desktop widths, causing crowded controls or page-level horizontal scrolling.
3. Loading and theme changes could cover the full screen, including navigation that was already available.

### Root Cause:
Pages used unrelated fixed widths, nested `100vh` containers, and in one case CSS `zoom` instead of sharing a responsive shell. Loading states were implemented as page or theme overlays rather than data-region states.

### Fix:
1. Added one `100dvh` app shell with container-based reflow, shared content-frame variants, mobile sidebar overlay behavior, and local overflow for wide tools and tables.
2. Removed whole-page CSS `zoom`, stabilized the compact ERP type scale, and enforced zero letter spacing across the interface.
3. Replaced full-screen and spinner-only loading with footprint-matched skeletons inside each page outlet. Theme changes now apply immediately.

### Verification:
Representative Sales, PO Tracker, Order Detail, Item Detail, document, vendor, placeholder, and login screens were checked at 390x844, 1440x900, and 2560x1440. Tested app screens had no document-level horizontal overflow, and all three themes resolved their own role tokens.

### Prevention & Lessons Learned:
1. Do not solve monitor differences by scaling the whole application; let layouts add columns or reflow around the available content width.
2. Keep navigation mounted during loading and skeleton only the data that has not arrived.
3. Test actual screenshots plus computed overflow at mobile, standard desktop, and high-resolution desktop sizes.

## Issue: Login Fields Showed Double Or Retained Focus Borders
**Date:** 2026-07-30
**Component:** `src/pages/LoginPage.tsx` and `src/index.css`

### Root Cause:
1. The focused floating fieldset already used a 2px brand border, while a page-level style added a second 2px focus `box-shadow` around it.
2. The border rule grouped `:focus` with `:not(:placeholder-shown)`. A filled field therefore kept the brand border after focus moved to another field.

### Fix And Verification:
Removed the redundant shadow and limited the 2px brand border to `:focus`. Filled but unfocused fields now return to the default 1px border while their labels remain floated. Browser state-matrix verification covered empty blur, empty focus, filled focus, focus transfer, and filled blur; only the active field retained the brand border.

## Issue: Frontend Compilation And React Lifecycle Errors
**Date:** 2026-07-30
**Component:** frontend application shell, dashboards, PO Tracker, document pages, and shared UI

### Symptoms:
1. TypeScript could not parse `App.tsx` and `Sidebar.tsx` because duplicated and incomplete code blocks had been left in both files.
2. ESLint reported 74 errors from unsafe `any` values, conditional hooks, state resets inside effects, mixed Fast Refresh exports, and untyped browser APIs.
3. The project color-token check failed on hardcoded Login and dashboard colors.

### Root Cause:
Partial merges left the app shell structurally invalid. Several pages also stored values that could be derived from route or request keys, then synchronized those values with immediate `setState` calls in effects. Table configuration and React components shared one module, which broke Fast Refresh boundaries.

### Fix:
1. Rebuilt the damaged app shell while preserving all existing routes, including Executive Overview.
2. Replaced effect-driven state synchronization with route-keyed and request-keyed state, added cancellation guards, and typed API/document records and error handling.
3. Moved PO table column configuration into `orderTableConfig.tsx` and split the theme hook from its provider.
4. Added Login palette tokens and replaced hardcoded component colors with design tokens.

### Verification:
`npm run lint` and `npm run build` both pass. The production build transforms 2,396 modules successfully; only the existing bundle-size advisory remains. The running frontend on port 3000 returns HTTP 200.

### Prevention & Lessons Learned:
1. Run TypeScript and ESLint after resolving large or interrupted merges.
2. Derive loading from a request key instead of synchronously resetting loading state in an effect.
3. Keep shared constants and hooks in modules separate from Fast Refresh component exports.
4. Add new palette values to `src/index.css` before using them in UI code.

## Issue: Login Form Was Undersized And Misaligned On Mobile
**Date:** 2026-07-30
**Component:** `src/pages/LoginPage.tsx`

### Symptoms:
The mobile Login page split the viewport between a decorative cover and the form, while the inner form stage remained 500px tall. The result was cramped vertical space, narrow or clipped content, and excessive empty space after scrolling past the cover.

### Root Cause:
The mobile breakpoint reused the desktop split-panel model with fixed `35vh` and `65vh` sections. That conflicted with the fixed-height form stage and its desktop padding. The shared `.parchment-form` surface color also painted a separate rectangular block inside the parchment page.

### Fix:
Mobile now uses one full-height form surface, hides the decorative cover, applies safe-area padding and a bounded responsive form width, and allows the longer registration state to scroll. Inputs and the primary action keep usable touch heights, while the desktop split layout remains unchanged.

### Verification:
CDP viewport checks at 320x568, 384x768, 390x844, and 1366x768 confirmed no horizontal document overflow. The registration form remains vertically scrollable on short screens, focus borders return to 1px after blur, and both `npm run lint` and `npm run build` pass.

## Issue: Login Floating Labels Did Not Align With The Outline
**Date:** 2026-07-30
**Component:** `src/pages/login/LoginPage.css` and `src/index.css`

### Root Cause:
Floating-field rules existed in both the global stylesheet and the Login feature stylesheet. The two copies used different negative offsets for the fieldset while sharing the same label transforms, so source order determined which outline position won. The hidden legend also inherited a different font from the visible label, making the border gap width inaccurate.

### Fix:
Removed all global floating-field rules from `src/index.css` and kept one scoped implementation under `.parchment-form` in `LoginPage.css`. The 11px legend now offsets the fieldset by half its height, and the visible label uses a 24px line box with matching center-based transforms. The legend uses the same font and font size as the scaled label, plus 5px clearance on each side.

### Verification:
Browser state checks covered empty blur, Username focus, Username filled blur, and Password focus. Empty labels center within the 57px input, floated label centers align with the top outline, legend gaps are exactly 10px wider than their labels, and both fields use identical relative positions. `npm run lint` and `npm run build` pass.

## Issue: Matrix Table Ignored Global Toolbar Filters
**Date:** 2026-08-07
**Component:** \CustomerReportPage.tsx\ and \CustomerDashboardLayout.tsx\

### Symptoms:
The user selected specific filter values (e.g., Months: Jan, Feb) in the global toolbar popover, but the Customer Matrix table still rendered columns for unselected months (Jun, Jul, Aug, Sep).

### Root Cause:
The \CustomerReportPage.tsx\ component originally had its own local sidebar filter component (\CustomerReportFilters.tsx\). When the local sidebar was removed to comply with UI design rules (Toolbar + Popover + Chips), the local states (\selMonths\, \selGroups\, \aseYear\) in \CustomerReportPage.tsx\ were left initializing from \searchParams\ only once on mount. They were never wired up to the \useOutletContext\ provided by the new \CustomerDashboardLayout.tsx\ which managed the global toolbar state.

### Fix:
1. Removed all unused local state definitions from \CustomerReportPage.tsx\.
2. Imported \useOutletContext\ and mapped the global \selectedYears\, \selectedMonths\, and \selGroups\ directly to the active variables used by the Matrix table.
3. Cleaned up remaining unused imports across the frontend project to ensure \
pm run build\ completed successfully.

### Prevention & Lessons Learned:
1. **Context Mapping After UI Refactors:** When moving local component filters to a global layout toolbar, always ensure child Outlets are updated to consume the new `useOutletContext` instead of relying on stale local state or one-time URL parsing.
2. **Comprehensive Build Checks:** Always run `npm run build` in addition to `tsc --noEmit` to catch unused imports and variables across the entire project after deleting files.

## Issue: Popover Dropdown Clipped inside Topbar by Responsive `overflow-x: auto`
**Date:** 2026-08-24
**Component:** `index.css`, `CustomerDashboardLayout.tsx`, `Topbar.tsx`

### Symptoms:
The "Customer Groups" and "Period" dropdown popovers were trapped and vertically cropped inside the Topbar frame on smaller screen widths, whereas the "UI Themes" dropdown floated normally.

### Root Cause:
In responsive `@container` media queries, `.app-topbar__page-actions` had `overflow-x: auto` applied. In CSS, any non-visible overflow creates a scroll/clip boundary that traps `position: absolute` child elements. The `.app-topbar__system-actions` container where "UI Themes" lived had `overflow: visible`, which is why it floated freely.

### Fix:
1. Changed `overflow-x: auto` to `overflow: visible` on `.app-topbar__page-actions`.
2. Ensured `.sales-summary-popover` and `.sales-gallery-period-menu` have `z-index: 1000` to float above all table and card elements.

### Prevention & Lessons Learned:
1. **Never place `overflow-x: auto` or `overflow: hidden` on a toolbar container that hosts absolute popovers.** If scrolling is needed, wrap only the non-popover buttons in a dedicated scroll track.
2. **Test popovers at multiple viewport widths (mobile, tablet container, desktop) to ensure stacking contexts are not broken by container queries.**

## Issue: Metric Toggle ($ Sales vs # Qty) Caused Full Page Remount & Chart Flickering
**Date:** 2026-08-24
**Component:** `CustomerDashboard.tsx`

### Symptoms:
Clicking the `$ Sales` / `# Qty` segmented control caused the entire chart and KPI cards to violently flicker and blink without smooth transition.

### Root Cause:
1. `switchMetric` invoked `navigate('/dashboard/customer?...')`, triggering a full route navigation that unmounted the page component.
2. The KPI card container had `key={`kpis-...-${metric}`}`, forcing React to destroy and recreate the DOM on every metric switch.
3. The Recharts `<Bar>` components lacked explicit `isAnimationActive` and `animationDuration` configuration.

### Fix:
1. Changed `switchMetric` to use `setSearchParams(nextParams, { replace: true })` in-place without page remount.
2. Removed `-${metric}` from the KPI card key so React updates values smoothly.
3. Added `isAnimationActive={true}`, `animationDuration={600}`, and `animationEasing="ease-in-out"` to `<Bar>` components.

## Issue: Color Token Linter Failures (Hex & Literal Colors in UI)
**Date:** 2026-08-24
**Component:** `DeliveryAndDepartmentOutlook.tsx`, `OrderVolumeSummaryPage.tsx`, `SalesCustomerGroupDetail.tsx`, `SalesDashboard.tsx`, `TopOrdersGalleryPage.tsx`, `Sidebar.tsx`

### Symptoms:
`npm run lint` failed due to `scripts/check-color-tokens.mjs` catching hardcoded hex colors (`#f59e0b`, `#10b981`, `#fff`), named colors (`white`), and Tailwind palette utility classes (`hover:text-white`).

### Root Cause:
New component development introduced direct literal colors instead of referencing CSS variable tokens defined in `src/index.css`.

### Fix:
1. Replaced all literal hex and named colors with design tokens:
   - Warning: `var(--color-warning-50)`, `var(--color-warning-500)`, `var(--color-warning-600)`
   - Success: `var(--color-success-50)`, `var(--color-success-500)`, `var(--color-success-600)`
   - Danger: `var(--color-danger-50)`, `var(--color-danger-500)`, `var(--color-danger-600)`
   - Text & Inverse: `var(--color-text-primary)`, `var(--color-text-inverse)`, `var(--color-overlay-text)`, `var(--color-sidebar-text-active)`
## Issue: Sales Monthly Analytics API 500 Error (`Invalid column name 'ExportAmnt'`)
**Date:** 2026-08-24
**Component:** `backend/routes/orderVolumeSummary.js` and `dbo.VW_Web_OrderTrends`

### Symptoms:
The Order Trends page displayed a red banner: `Sales monthly analytics API error: 500`.

### Root Cause:
The backend route was querying `v.ExportAmnt` and `v.ProductType`. However, the physical database view `dbo.VW_Web_OrderTrends` created on MS SQL Server contains `ItemPrice`, `ItemAmnt`, `ItemQty`, and `ExportQty`, but not `ExportAmnt` or `ProductType`. SQL Server threw `RequestError: Invalid column name 'ExportAmnt'`.

### Fix:
1. Updated `backend/routes/orderVolumeSummary.js` to compute `shippedAmount` inline using `ISNULL(v.ExportQty * v.ItemPrice, 0)`.
2. Extracted `productTypeCode` dynamically using `CASE WHEN LEFT(v.ItemNo, 3) IN ('BBS', 'BES', 'BNS', 'BRS') THEN LEFT(v.ItemNo, 3) ELSE 'OTHERS' END`.
3. Verified all 5 endpoints (`sales-monthly-analytics`, `sales-type-analytics`, `sales-weekly-analytics`, `sales-delivery-outlook`, `sales-orders`) returning HTTP 200 with authentic data.

### Prevention & Lessons Learned:
1. **Always verify physical columns on MS SQL Server via `INFORMATION_SCHEMA.COLUMNS` before referencing them in backend query templates.**
2. **When views are updated or simplified, ensure all query projections match the exact column schema.**

## Issue: Bar Charts Showing Gaps Despite barGap={0}
**Date:** 2026-10-01
**Components:** `ProductionSummaryChart.tsx`, `CustomerSalesChart.tsx`, `InfographicSalesTrends.tsx`

### Symptoms:
User reported bars within the same group still had visible gaps even after setting `barGap={0}` on the chart container.

### Root Cause:
The `<Bar>` components had `maxBarSize` props (e.g., `maxBarSize={38}`, `maxBarSize={calculatedMaxBar}`, `maxBarSize={30}`) that capped the width of individual bars. When the available chart width was larger than the total of all max-sized bars, recharts rendered the bars at their max width with empty space between them — making it look like there was still a gap.

### Fix:
Removed all `maxBarSize` props from every `<Bar>` component across the system. Bars now expand to fill the allocated category space naturally and sit flush against each other.

### Prevention & Lessons Learned:
1. **`barGap` alone is not sufficient** — `maxBarSize` can override bar width and create visual gaps even when `barGap={0}`.
2. When standardizing chart spacing, audit **both** the chart container props (`barGap`, `barCategoryGap`) **and** the individual `<Bar>` component props (`maxBarSize`, `barSize`).

## Issue: Recharts `radius` Prop on `<Cell>` Causes TS Errors
**Date:** 2026-10-01
**Components:** `RiskCustomerChart.tsx`, `ProductionForecastChart.tsx`

### Symptoms:
TypeScript compilation errors: `Property 'radius' does not exist on type 'IntrinsicAttributes & CellProps'`.

### Root Cause:
The `radius` prop was being passed to individual `<Cell>` components inside `<Bar>`. In recharts, `radius` is only valid on the parent `<Bar>` element, not on `<Cell>`.

### Fix:
Moved `radius={[0, 0, 0, 0]}` to the parent `<Bar>` component and removed `<Cell>` mapping entirely (since it was only used for radius). Cleaned up unused `Cell` imports.

### Prevention & Lessons Learned:
1. **Recharts type constraints**: `radius` belongs on `<Bar>`, not `<Cell>`. When applying corner radius, always set it on the parent bar element.
2. After removing component usage, always clean up the corresponding import statement.

## Issue: Production Summary Table Avg Row Showing "0" Instead of "-"
**Date:** 2026-10-01
**Component:** `ProductionSummaryTable.tsx`

### Symptoms:
The "Avg.(Day/Pcs)" row in the Production Summary table displayed `0` for months with no data, while all other rows correctly showed `-`.

### Root Cause:
The `renderCell` function had a special `isAvg` parameter that bypassed the zero-check: `if (val === 0 && !isAvg) return '-'`. This was intentionally designed so that average rows would always show a number, but the user found `0` misleading for empty months.

### Fix:
Simplified `renderCell` to a single check: `if (!val || val === 0 || isNaN(val)) return '-'`. Removed all `isAvg` parameter usages. Now all zero values display `-` consistently across the entire table.

### Prevention & Lessons Learned:
1. **Consistent zero-handling**: Use a single rendering function for all cells without special cases per row type. If a row needs different formatting, create a separate formatter rather than overloading a boolean flag.

