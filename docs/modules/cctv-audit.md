# CCTV IT Audit Report

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## 2026-10-14 CCTV IT Audit Report (Audit → CCTV Report)

### 1. Overview
- **Route**: `/audit/cctv-report` (admin only) · Menu `Audit → CCTV Report` (`menuConfig.ts`, id `audit-cctv-report`)
- **Purpose**: Daily CCTV camera operation auditing interface → Prints A4 landscape sheets → Signed with physical pen for ISO / IT Audit compliance.
- **UI**: No table checkboxes — statuses display as text characters `✓` / `✗` / `-` (cycling: Empty → OK → NG → NA → Empty).
- **Files**: `pages/audit/CCTVAuditPage.tsx`, `components/audit/CctvAuditTable.tsx`, `hooks/useCctvAuditForm.ts`, `utils/cctvAuditForm.ts`, `config/cctvAuditConfig.ts`, types `Cctv*` in `types/index.ts`, and `.cctv-*` print styles in `index.css`.

### 2. Zero-DB Architecture (Strict 100% READ-ONLY Compliance)
- **Zero new backend endpoints and zero database writes**.
- Official factory holidays fetched from pre-existing endpoint `GET /api/production-summary/holidays?year=` → table `GMHoliday` (SELECT only) via `getHolidays()` in `productionSummaryAPI.ts`.
- `GMHoliday` provides date-only entries (no holiday titles) → Divider rows render standard "Holiday" text.
- Forms persist as JSON: React state + `localStorage` (key `cctv-audit-form`) + Import/Export JSON files (`cctv-audit-YYYY-MM.json`) — **Always export JSON files as persistent proof before printing**, as browser localStorage can be cleared.

### 3. JSON Schema (`CctvAuditForm`, `schemaVersion: 1`)
- `columns[]`: `{ id, label, type: 'date'|'status'|'text', width?, fixed? }`. The first column must always be `date` (holiday rows merge via `colSpan = columns.length - 1`).
- `rows[]`: `{ id, type: 'data'|'holiday', date: 'YYYY-MM-DD', cells?: Record<columnId, value>, holiday?: { name, source: 'company'|'sunday'|'manual' } }`.
- `cells` bind to `columnId` rather than array indices, allowing columns to be added, deleted, or reordered without corrupting data.
- Dates are stored as ISO strings (not raw `Date` objects) to prevent timezone shifts across systems.
- Holidays are captured as immutable snapshots upon form generation, preventing past monthly records from drifting if database holiday tables are subsequently updated.
- Generating a new month clones columns, signatures, and location metadata from the current form while clearing document serial numbers. The "Include Sundays as Holidays" toggle automatically generates Sunday dividers, and users can toggle individual rows between workday and holiday status directly from the UI.

### 4. Print Standards
- Uses named print page `cctv-landscape` (`@page { size: A4 landscape; margin: 10mm }`) bound to `.cctv-sheet`.
- Forces crisp white paper / black text styling across all active themes during print jobs; gray holiday divider strips enforce `print-color-adjust: exact`; `thead` repeats across multiple pages, and signature blocks are protected from page splits.
- Action toolbars and holiday toggle controls are flagged with `.no-print` to prevent inclusion on printed reports.
