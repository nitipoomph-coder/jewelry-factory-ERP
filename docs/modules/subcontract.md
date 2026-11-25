# Subcontract Management (Planned)

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## Subcontract Management — Planned Module

### Status: 🟡 UI Preview 1/3 (No Backend)
Sidebar menu group `subcontract` (icon: `handshake`) includes 3 entries:
- `/subcontract/vendor-performance` — Vendor Performance Dashboard — **`VendorPerformanceDashboardPage.tsx`** implements the layout reference (Filters, KPI tiles, Chart cards, Detail table with grouped headers and Grand Total), but all values display `N/A` empty states with a top banner indicating "Live data connection pending". **Never introduce fabricated mock values** until real backend Stored Procedures are integrated.
- `/subcontract/vendor-price-history` — Currently implemented as `PlaceholderPage.tsx`.
- `/subcontract/aging-report` — Currently implemented as `PlaceholderPage.tsx`.

### Target Design Reference
Design blueprint based on the companion **"PCC System: Subcontract Management"** interface for future implementation:
- Flat icon-circle KPI tiles without gradients or glassmorphism (following PO Tracker design patterns).
- Filter sidebar/section displaying all filter controls simultaneously (Date Range, Subcontract, Department, Process, Item Group) rather than hiding behind toggles.
- Vendor Performance Dashboard: KPI row + 3 horizontal bar charts (On-Time Delivery %, Avg Lead Time, Defect Rate) + Detail table with grouped headers and Grand Total row.
- Vendor Price History: Multi-series line chart (vendor pricing over time) + Latest Price Comparison table + Price History Detail table with pagination.
- Aging Report: KPI row (Aging buckets 0-3 / 4-7 / 8-14 / >14 days) + paired Donut and Bar charts + Detail table.

**Note**: Backend APIs and Stored Procedures for vendor and subcontract data do not yet exist in the database — complete backend definitions must be created prior to production UI activation (strictly no mock data in production builds).
