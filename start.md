# Jewelry Factory System (ERP) - AI Onboarding Guide

## 1. Project Overview
This project is an Enterprise Resource Planning (ERP) platform developed for a sterling silver and brass jewelry manufacturing facility.
The primary goal is to modernize the legacy system (originally built on Windows Forms / Crystal Reports) into a **Modern Web Application** featuring interactive dashboards, enabling management to monitor production status, purchase orders (PO), and sales performance in real time.

## 2. Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS (located in `Jewelry Factory System/frontend`)
- **Backend:** Node.js, Express (located in `Jewelry Factory System/backend`)
- **Database:** Microsoft SQL Server (MS SQL)
- **Start Project:** Run `npm run dev` in the `Jewelry Factory System` directory (uses `concurrently` to run both frontend and backend simultaneously).

## 🛑 Strict Database Guardrails (CRITICAL — NEVER VIOLATE)
1. **Database is 100% READ-ONLY:** Never execute DDL or DML statements (`ALTER`, `CREATE`, `DROP`, `UPDATE`, `INSERT`, `DELETE`, `TRUNCATE`). Do not modify Stored Procedures, Views, Tables, or Indexes on either Production (`<DB_HOST>`) or Test databases.
2. **Preserve 100% Backward Compatibility with Legacy Systems (VB.NET):** The database is actively shared with the legacy system at all times. Stored procedures `PC_Show_OrdTrack_Sum_*` must strictly receive only 2 parameters: `@FromDate` and `@ToDate` (Never pass `@Status`).
3. **Filtering, Grouping, and Calculations Must Occur at the Application Layer:** Perform all status filtering (Pending/Finish), customer grouping, and metric aggregation in-memory within Node.js or React—never at the database level.
4. **Permitted Write Exceptions:**
   - Table `system_users` (for web authentication)
   - Specific remark fields in `OrdDT` (`Recvmark`, `Enamark`, `Crysmark`, `Assemmark`, `Shelfmark`, `Packmark`, `Prodmark`) via the PO Tracker Remarks API
   - Header fields `BuyName` / `RefDocuNo` via the Procurement API

**Current Database State:**
- ✅ **22 Covering Indexes** (`backend/sql/indexes.sql`) + **View `VW_Web_SalesDashboard`:** Created and active in production (Do not drop or create additional indexes/views).
- ❌ **Stored Procedures `PC_Show_OrdTrack_Sum_*`:** Original legacy baseline definitions remain active (experimental modifications broke the legacy VB.NET app and were rolled back). Files in `backend/sql/stored-procedures/` are deprecated drafts—**do not execute them**.
- If any document conflicts with this section, **this section takes precedence**.

> For comprehensive details, see `claude.md` (top section).

## 3. Core Documentation (AI Knowledge Base)
**⚠️ To all AI Assistants: Read these documents before writing code to understand the business logic, database relationships, and design system of this project.**

### 📍 Core Manuals (Must-Read)
0. `claude.md`
   - **Content:** Full project context (DB guardrails, business modules, tech stack versions, design system/themes, directory structure, customer groups).
   - **Note:** Comprehensive document (~100KB). Always read the top section (rules, overview, tech stack) first, then consult specific sections as needed.

1. `docs/design/PRODUCT.md` 
   - **Content:** Product philosophy and UI/UX guardrails.
   - **Note:** Emphasizes high information density (Data-Dense). Never build generic spreadsheets or cluttered UIs. Use semantic colors meaningfully (e.g., Red = Overdue).

2. `docs/legacy/LEGACY_PCC_SYSTEM_ARCHITECTURE.md`
   - **Content:** Legacy data architecture and multi-facility operational differences.
   - **Note:** Explains the legacy database schema, operational differences between FBE and CLL production lines, and Stage Delta formulas (WIP / Bottlenecks).

3. `docs/design/DESIGN.md` + `Jewelry Factory System/frontend/design.md` + `frontend/src/index.css`
   - **Content:** Comprehensive design guidelines, 60-30-10 color rule, tri-theme support, component density, and allowed CSS tokens.
   - **Note:** Read before modifying any UI. Never hardcode colors; always use CSS design tokens from `index.css` (verify with `npm run lint:colors` in frontend).

4. `Jewelry Factory System/backend/sql/ERP_DATA_MAPPING_AND_LOGIC.md` + `backend/sql/README.md`
   - **Content:** Field-level ERP mappings, calculation business logic, and active database views/indexes.

### 📍 Domain-Specific References (Read when working on related features)
5. `docs/legacy/PO_TRACKER_REVAMP_PLAN.md` & `docs/legacy/LEGACY_PO_TRACKER_ARCHITECTURE.md`
   - **Content:** Architecture and data sources for the PO Tracker and Order Detail line items (100% aligned with legacy VB.NET architecture).
   - **Note:** Consult when implementing PO reports or order detail views. Details mapping fields from Stored Procedures (`PC_Show_OrdTrack_Sum_*`), table `OrdTrackDT`, table `OrdTrack`, 5-axis/6-axis grouping rules, and customer-specific column renaming (N044/KSP).

6. `docs/legacy/production_stages_mapping_log.md`
   - **Content:** Manufacturing stages and sequencing for production lines.
   - **Note:** Logic for the 17-step pipeline (Grind, Tumbling, Assemble, etc.) utilized in the Order Tracker module.

7. `docs/sales/sales-db-views.md` & `docs/sales/sales-menu.md` & `DATA_FETCHING_NOTES.txt`
   - **Content:** Sales analytics architecture, customer grouping presets, and API call sequencing for Top Orders and Customer Sales.
   - **Note:** Essential when working on Sales Analytics, Customer Report Matrix, or Top Item Gallery.

8. `docs/sales/dashboard.md`
   - **Content:** Context for the primary operations dashboard and Customer Dashboard reporting suite.

9. `docs/debug-history.md`
   - **Content:** Resolved issues, root cause analyses, and lessons learned (e.g., SP performance, `@Status` drift, z-index layering, Group column mapping to `OrdMaker`).
   - **Note:** Consult before debugging or touching SP/PO Tracker code to avoid regression. Always document new bugs/fixes here.

10. `Jewelry Factory System/implementation_plan-admin.md`
    - **Content:** Implementation roadmap for Admin User Management & Session Tracking.

11. `docs/GIT_WORKFLOW_GUIDE.md`
    - **Content:** Project Git conventions and multi-environment synchronization workflows.

---
**🤖 Instructions for AI Agents:**
1. Never speculate or hallucinate database schemas; always verify against the `.md` documentation files.
2. Keep the root directory clean; never leave log files, temporary scripts, or one-off scratch files in the root.
3. Before introducing new features, verify that the design complies with `docs/design/PRODUCT.md` and `docs/design/DESIGN.md`.
