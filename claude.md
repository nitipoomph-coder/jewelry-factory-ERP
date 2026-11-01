# Gemstone Lifecycle Management — Project Context

## 🛑 STRICT DATABASE GUARDRAIL (READ-ONLY 100% — ห้ามแตะต้องหรือแก้ไขฐานข้อมูลเด็ดขาด)

> ### ⚠️ กฎเหล็กความปลอดภัยสูงสุด (CRITICAL POLICY - NEVER VIOLATE)
> 1. **ห้ามแตะต้อง ดัดแปลง หรือแก้ไขโครงสร้างและข้อมูลใน Database ใดๆ ทั้งสิ้น (READ-ONLY 100%)**:
>    - ห้ามรันคำสั่ง DDL หรือ DML เด็ดขาด: `ALTER`, `CREATE`, `DROP`, `UPDATE`, `INSERT`, `DELETE`, `TRUNCATE`, `EXEC sp_rename`, ฯลฯ
>    - ห้ามแก้ไข Stored Procedures, Views, Tables, Functions, Triggers หรือ Indexes บน Database โดยเด็ดขาด ทั้งใน Production DB (`<DB_HOST>`) และ Test DB
> 2. **ต้องรักษา Backward Compatibility กับระบบเดิม (Legacy VB.NET / PCC Management System) 100%**:
>    - ฐานข้อมูลนี้ถูกใช้งานร่วมกับระบบเดิม (VB.NET) อยู่ตลอดเวลา
>    - การแก้ไข Stored Procedure ใดๆ (เช่น การเพิ่ม Parameter `@Status`) จะทำให้ระบบเก่าของโรงงานพังทันที (เกิด Parameter count mismatch / OLE DB error)
>    - Stored Procedures ทุกตัวต้องคงสถานะตาม **Baseline เดิมของระบบ (รับ 2 Parameters: `@FromDate`, `@ToDate`)**
> 3. **การประมวลผลและการกรองข้อมูล (Filtering, Grouping, Calculation) ให้ทำที่ Application Layer เท่านั้น**:
>    - หากต้องการกรองสถานะ (Pending/Finish), จัดกลุ่มลูกค้า, หรือคำนวณสถิติใหม่ ให้ทำในหน่วยความจำ (In-Memory) ฝั่ง Backend (Node.js/Express) หรือ Frontend (React) เท่านั้น ห้ามแก้ที่ Database!
> 4. **อ่านข้อมูลเป็นหลัก (READ-ONLY CORE POLICY)**:
>    - อนุญาตเฉพาะคำสั่ง `SELECT` หรือการ `EXECUTE` Stored Procedures ที่มีอยู่เดิมตาม Baseline เท่านั้น
>    - **ข้อยกเว้นงานระบบที่ได้รับอนุญาต (Controlled Application-Level Exceptions)**:
>      1. ตาราง `system_users` สำหรับการจัดการผู้ใช้ระบบเว็บ (Auth)
>      2. อัปเดตช่องหมายเหตุเฉพาะจุดใน `OrdDT` (Recvmark, Enamark, Crysmark, Assemmark, Shelfmark, Packmark, Prodmark) ผ่าน PO Tracker Remarks API
>      3. อัปเดตข้อมูลหัวเอกสารจัดซื้อรับเข้าเฉพาะฟิลด์ที่กำหนด (BuyName, RefDocuNo) ผ่าน Procurement API
>      *ห้ามสร้าง ลบ ดัดแปลง Table/View/Index/Procedure ใดๆ นอกเหนือจากนี้โดยเด็ดขาด*

## Project Overview

ระบบจัดการวงจรชีวิตพลอยและเครื่องประดับ (Gemstone Lifecycle Management) สำหรับโรงงานเครื่องประดับ
เป็นการ **Modernize** ระบบเดิมที่เขียนด้วย VB.net + SQL Server ให้เป็น Web Application แบบ Full-Stack
ใช้งานภายในองค์กร (Intranet) เชื่อมต่อฐานข้อมูลจริง (MSSQL — `<DB_SERVER>`) ผ่าน Stored Procedures

### Business Modules

| Module                 | รหัสเอกสาร                          | สถานะ              |
|------------------------|--------------------------------------|--------------------|
| Authentication         | JWT + Role-based (admin/sales)       | ✅ Live             |
| ภาพรวม (Dashboard)      | —                                    | ✅ Live (admin only) |
| Sales Analytics        | —                                    | ✅ Live (admin + sales) |
| Sales Summary          | — (Amount + Qty modes)               | ✅ Live (admin + sales) |
| Customer Report Matrix | — (Matrix Table)                     | ✅ Live             |
| Top Item Gallery       | —                                    | ✅ Live             |
| จัดซื้อและรับเข้า        | SPA, SRA, SRB, SIR                   | 🟡 DocumentLayout done |
| ออเดอร์และการเบิก       | SOA, SIA, SIB, SIP, SIS             | 🟡 DocumentLayout done |
| ห้องตัวอย่าง            | SSA, SIM                             | 🟡 DocumentLayout done |
| ตรวจสอบและนับสต็อก      | Check Dispatch/Sample/Purchase/Stock | ⬜ Placeholder      |
| Production / PO Tracker | —                                  | ✅ Live (core feature, admin only) |
| FBE Order Tracker       | —                                    | ✅ Live (FBE 17-Step Production Tracker) |
| Order Trends           | —                                    | ✅ Order volume trends and evidence |
| สต็อกอะไหล่             | SP-Order, SP-Issue, SP-Receive, …    | ⬜ Placeholder      |
| งานเหมา (Subcontract Management) | —                           | 🟡 UI Preview (1/3, ไม่มี Backend) |
| Audit — CCTV IT Audit Report | —                              | ✅ Live (admin only, Zero-DB) |

### Key Feature: PO tracker

ระบบ PO tracker เป็นฟีเจอร์หลักที่ใช้งานจริงแล้ว ทำหน้าที่:
- ดึงข้อมูล Order Stored Procedures (`PC_Show_OrdTrack_Sum_*`) ตาม **Baseline 2-parameter signature: `@FromDate`, `@ToDate`** (ห้ามส่ง `@Status` เด็ดขาด เพื่อคงความเข้ากันได้กับระบบ legacy VB.net 100%)
- Aggregate ข้อมูลฝั่ง Node.js (กรุ๊ปด้วย 5 แกน: Cust, PO, Type, ShipTo, Material)
- **การกรองสถานะ (Status Filter)** ทำใน Memory (Node.js/React):
  - `Pending`: กรองแถวที่ `UnFinishQty !== 0` (งานที่ยังค้างผลิต)
  - `Finish`: กรองแถวที่ `FinishQty !== 0` (งานที่เสร็จแล้ว)
  - `ALL`: ไม่กรอง แสดงทุกรายการ
- **การจัดกลุ่มลูกค้า (Customer Grouping)** ตรงตามตรรกะระบบเดิม 100%:
  - `N008`: N008, N048, N066-N075
  - `N044`: N044, N064, N065
  - `N051`: N051
  - `N098`: N098
  - `MLT`: U411-U426, MLT
  - `General`: ลูกค้าอื่นๆ ทั้งหมดที่ไม่ใช่กลุ่มข้างต้น
- **Dropdown วันที่เป็นอิสระ**: สลับเลือกเงื่อนไขวันที่ (Order Date, Factory Due Date, Cust Due Date, Finish Date) เพื่อเรียก SP ที่ต้องการได้โดยอิสระ โดยไม่ผูกมัดหรือบังคับเปลี่ยนค่าสถานะ
- **Real-Time Live Data (No Caching)**: ปิด In-Memory Cache เพื่อให้ข้อมูลสดใหม่ทันทีตรงกับ Database เสมอ และตัด `ItemPhoto` buffer ออกจาก payload เพื่อลดขนาด network bandwidth
- แสดงรูปสินค้าจาก **network path** (`/api/photos/ps|cad/:itemNo` — Photo Bridge) โดย SP list ส่ง `SampleItemNo` (ItemNo ตัวแทน/กลุ่ม) มาให้ frontend ประกอบ URL เอง — **เลิกใช้ base64/VARBINARY (GMItemPhoto) แล้วทั้งระบบ**

**Design Notes (POTrackerAdvanced.tsx / OrderTable.tsx):**
- **Filters — Toolbar + Popover + Chips (modern table-filter pattern, ไม่ใช่ sidebar)**: Group toggle และ Status toggle แสดงตลอดเวลาในแถบเดียวบรรทัดเดียว ส่วนฟิลเตอร์รอง (Week/Customer/PO/Type/ShipTo/Date Range) ซ่อนอยู่หลังปุ่ม "Filters" (มี badge บอกจำนวนที่เลือกไว้) กดแล้วเปิดเป็น popover ลอย (ใช้ pattern เดียวกับ View Columns popover ใน `OrderTable.tsx`) — เมื่อมีฟิลเตอร์ที่เลือกไว้ จะโชว์เป็น chip ที่ลบทีละตัวได้ใต้แถบ toolbar เพื่อให้เห็นว่าเลือกอะไรไว้โดยไม่ต้องเปิด popover ซ้ำ — เมื่อไม่มีฟิลเตอร์ใดเลือกไว้ พื้นที่ด้านบนจะเหลือแค่แถบ toolbar บรรทัดเดียว (โล่ง ไม่กระจุก) อ้างอิงจาก pattern ของ Linear/Notion/GitHub Issues (ไม่ใช่ sidebar แบบ BI dashboard เพราะ PO Tracker เป็นตารางข้อมูลเป็นหลัก ไม่ใช่ multi-chart report)
- **KPI Tiles → Smart KPI Toolbar**: เดิมเป็น flat icon-circle grid 5 ใบแยกกัน — **ปรับแล้ว** เป็น inline toolbar แถบเดียว: Priority Metrics (ACTIVE ORDERS, LATE, PENDING) แสดงตัวเลขใหญ่ด้านซ้าย | เส้นแบ่ง | Secondary Metrics (TOTAL QTY, TOTAL AMOUNT) ขนาดเล็กกว่า | ปุ่ม Refresh + "Last updated" ด้านขวา — ดีไซน์ align กับ Top Item Gallery Summary Header
- **Pagination — Pinned, ไม่ต้องเลื่อนจอ**: รวมเป็นแถบเดียวที่ด้านล่างตาราง (Showing X–Y of Z + page size selector + Prev/page numbers/Next ทั้งหมดอยู่แถวเดียวกัน) — `OrderTable.tsx` ไม่รับ props `totalCount`/`pageSize`/`onPageSizeChange` อีกต่อไป เพราะ Pagination UI ทั้งหมดย้ายไปอยู่ใน `POTrackerAdvanced.tsx` แล้ว และ Data Table card ใช้ flex column (`flex:1, minHeight:0`) ให้ตารางขยายเต็มพื้นที่ที่เหลือของจอเสมอ ส่วน scroll container ใน `OrderTable.tsx` เปลี่ยนจาก `maxHeight: calc(100vh - 280px)` (เลขคงที่ที่ไม่ตรงกับความสูงจริงของ Filters/KPI) เป็น `flex:1, minHeight:0` แทน — ทำให้แถบ pagination ติดอยู่ด้านล่างของจอเสมอ ไม่ต้อง scroll หน้าทั้งหน้าเพื่อกด Next
- **Line Detail Drawer & Order Line Table**:
  - ปรับ `OrderLineTable.tsx` ไม่ให้ตัดคำ (Wrap text) ในคอลัมน์แคบๆ เช่น 'Plating' เพื่อให้อ่านง่าย
  - พื้นหลังกล่องรูปใน `LineDetailDrawer.tsx` ใช้ `--color-product-canvas` เพื่อให้รูปสินค้าอ่านง่ายทุกธีม และปุ่มปิดใช้รูปแบบเดียวกับ Lightbox
- **Column Presets Synchronization**: ปรับปรุงค่าเริ่มต้นของกลุ่มคอลัมน์ (Sales, Production, All) ใน `orderDetailColumns.ts` ให้ตรงกับ Checkboxes ของระบบ VB.net เดิมแบบ 100% (เพิ่ม `QCDate`, `FinishQty` ใน Sales และ `OrdRemark` ใน Production)

### Key Feature: Top Item Gallery

หน้าแสดง Top-Ranked Items (สินค้าขายดี) แบบ Gallery Card Grid พร้อมระบบเปรียบเทียบปีต่อปี

**Design Notes (TopOrdersGalleryPage.tsx / TopOrdersGalleryGrid.tsx / TopOrdersSkeleton.tsx):**
- **Summary Header**: แถบด้านบนแสดง scope (Combined/Compare mode) + จำนวนรายการ Ranked + KPI Cards สำหรับ Volume & Value ด้วย `GallerySummaryKpi` component — รองรับทั้ง Combined mode (รวมทุกปี) และ Compare mode (เทียบ Base vs Compare year พร้อม % delta)
- **Gallery Grid**: ใช้ CSS Grid responsive (`gallery-grid` class) ด้วย `repeat(auto-fill, minmax(clamp(260px, 16vw, 320px), 1fr))` แสดงการ์ดสินค้าพร้อมรูปจาก Photo Bridge
- **Loading State — Skeleton (`TopOrdersSkeleton.tsx`)**: แสดง 2 ส่วน:
  1. **Summary Header Skeleton** — จำลองแถบ KPI ด้านบน (ชื่อหัวข้อ + กล่อง Volume/Value placeholder) เพื่อลด Layout Shift
  2. **Gallery Grid Skeleton** — 15 การ์ด placeholder ใช้ `gallery-grid` class เดียวกับของจริง แต่ละการ์ดมี: Header Row, Image Area (capsule shape), Footer Row 1-2 พร้อม shimmer animation (`linear-gradient 110deg, background-size 400%, 1.5s linear infinite`)
- **Filter Loading Overlay**: เมื่อเปลี่ยน filter (ไม่ใช่ initial load) จะแสดง semi-transparent overlay + spinner กลางจอ พร้อม `backdrop-filter: blur(2px)` และ `pointer-events: all` ป้องกันการกดระหว่างโหลด
- **Perspective Modes**: รองรับ 2 โหมด — `combined` (รวมทุกปี) และ `compare` (เทียบ 2 ปี head-to-head) สลับได้จาก Topbar
---

## Tech Stack

### Frontend

| Technology        | Version | Purpose                              |
|-------------------|---------|--------------------------------------|
| React             | 19.x    | UI Library                           |
| TypeScript        | 6.x     | Type Safety                          |
| Vite              | 8.x     | Build Tool & Dev Server              |
| Tailwind CSS      | 4.x     | Utility-First CSS (via `@tailwindcss/vite`) |
| React Router DOM  | 7.x     | Client-Side Routing                  |
| Lucide React      | 1.x     | Icon Library                         |
| Recharts          | 2.x     | Charting Library (Bar/Line/Pie)      |
| ExcelJS           | 4.x     | Excel File Export                    |
| FileSaver         | 2.x     | Client-Side File Download            |
| React Draggable   | 4.x     | Draggable UI Elements                |

### Backend

| Technology | Version | Purpose                         |
|------------|---------|----------------------------------|
| Node.js    | —       | Runtime                          |
| Express    | 5.x     | HTTP Framework                   |
| mssql      | 12.x   | SQL Server Driver (Connection Pool) |
| jsonwebtoken | 9.x  | JWT Authentication               |
| dotenv     | 17.x   | Environment Variable Management  |
| cors       | 2.x    | Cross-Origin Resource Sharing    |
| nodemon    | 3.x    | Dev Auto-Restart (devDependency) |

### Database

| Technology      | Details                               |
|-----------------|---------------------------------------|
| Microsoft SQL Server | Production: `<DB_HOST>` (เดิม: `<DB_SERVER>`) — SQL Server 2012 Enterprise |
| Connection      | TCP/IP, Port 1433, No Encryption     |
| Database        | `dbGeneration` (Order/Production), `dbInventory` (Procurement/Stock) |
| Key Tables      | `OrdHD`, `OrdDT`, `GMCust`, `GMItemPhoto`, `OrdTrackDT`, `OrdWeekPlanHD` |
| Stored Procedures | `PC_Show_OrdTrack_Sum_*` (OrdDate, DueDate, CustDueDate, FinDate, All) — รับ 2 params ตาม Baseline: `@FromDate`, `@ToDate` (การกรองสถานะกรองใน Memory) |

### Design System

| Design System | Details                                         |
|---------------|--------------------------------------------------|
| Theme Engine  | 3 themes via `ThemeContext` + CSS custom properties |
| Themes        | `modern-dark` (default), `dark-gold`, `royal-white` |
| Color System  | OKLCH color space                                |
| Fonts         | **Cinzel** (logo), **Roboto** (headings, body, and dense tables) |
| 60-30-10 Roles | `--color-ui-canvas` 60%, `--color-ui-surface` / `--color-ui-raised` 30%, `--color-ui-interactive` 10% |
| Interaction Color | Brand token only; semantic and chart colors never represent generic selection/action |
| Chart Colors  | `--color-chart-1` ~ `--color-chart-6` (semantic, ครบทุก theme) |
| Table Colors  | `--color-table-header`, `--color-table-row-alt`, `--color-table-footer` |
| Animations    | Skeleton shimmer and short state transitions only; no decorative continuous motion |
| Login Page    | Standard surface-based form with protected registration flow and fixed `royal-white` theme for predictable contrast. |

---

## Folder Structure

```
gemstone-lifecycle-management/
├── claude.md                          # ← ไฟล์นี้ (project context)
├── debug-history.md                   # 🔧 บันทึกปัญหาและการแก้ไข
├── PRODUCT.md                         # 📋 Product overview document
├── production_stages_mapping_log.md   # 📋 Production stages mapping reference
│
└── Jewelry Factory System/
    ├── .gitignore
    │
    ├── frontend/                      # ⭐ React + Vite + TypeScript
    │   ├── index.html                 # HTML entry point
    │   ├── vite.config.ts             # Vite config (proxy /api → :3001)
    │   ├── tsconfig.json              # TypeScript root config
    │   ├── tsconfig.app.json          # App-specific TS config
    │   ├── tsconfig.node.json         # Node TS config (vite.config)
    │   ├── eslint.config.js           # ESLint flat config
    │   ├── package.json
    │   │
    │   └── src/
    │       ├── main.tsx               # React entry (ThemeProvider wraps App)
    │       ├── App.tsx                # Route definitions (BrowserRouter + ProtectedRoute)
    │       ├── index.css              # 🎨 Global styles, theme variables, animations
    │       │
    │       ├── components/
    │       │   ├── layout/
    │       │   │   ├── AppLayout.tsx        # Shell layout (Sidebar + Topbar + Outlet)
    │       │   │   ├── DocumentLayout.tsx   # 🏗️ Unified Document Layout (IoC/Slot Injection)
    │       │   │   ├── Sidebar.tsx          # Left nav sidebar (role-based menu filtering)
    │       │   │   └── Topbar.tsx           # Top bar (search, theme switcher, breadcrumb)
    │       │   ├── dashboard/
    │       │   │   ├── StatCard.tsx              # Dashboard stat card component
    │       │   │   ├── CardDetailPanel.tsx       # Dashboard card drill-down panel (YoY comparison)
    │       │   │   ├── OrderTable.tsx            # PO Tracker order summary table (display-only)
    │       │   │   ├── overview/
    │       │   │   │   └── FactoryOutputTrendChart.tsx  # Custom HTML bar chart (not recharts)
    │       │   │   ├── customerSales/
    │       │   │   │   └── CustomerSalesChart.tsx       # ComposedChart (Bar + Line) for customer sales
    │       │   │   ├── productionSummary/
    │       │   │   │   ├── ProductionSummaryChart.tsx   # ComposedChart for production output by group
    │       │   │   │   ├── ProductionSummaryTable.tsx   # Data table for production output
    │       │   │   │   ├── ProductionSummaryToolbar.tsx # Toolbar component
    │       │   │   │   └── ProductionDashboardSkeleton.tsx # Loading skeleton
    │       │   │   ├── productionForecast/
    │       │   │   │   ├── ProductionForecastChart.tsx  # ComposedChart for forecast
    │       │   │   │   ├── ProductionForecastDashboard.tsx # Dashboard wrapper
    │       │   │   │   ├── ProductionForecastTable.tsx  # Data table for forecast
    │       │   │   │   └── ProductionForecastSkeleton.tsx # Loading skeleton
    │       │   │   ├── orderVolume/
    │       │   │   │   ├── OrderVolumeTrendChart.tsx    # ComposedChart (Line + Area) for trends
    │       │   │   │   ├── RiskCustomerChart.tsx        # BarChart for risk/overdue by customer
    │       │   │   │   └── VolumeFilterBar.tsx          # Filter toolbar
    │       │   │   ├── orderTracking/
    │       │   │   │   └── OrderTrackStepper.tsx        # FBE 17-step stepper
    │       │   │   ├── poTracker/
    │       │   │   │   └── OrderTable.tsx               # PO Tracker table (legacy path)
    │       │   │   ├── fbeOrderTrack/                   # FBE order tracking components
    │       │   │   └── topAnalytics/                    # Top analytics components
    │       │   ├── infographic/
    │       │   │   └── InfographicSalesTrends.tsx       # BarChart for customer trends comparison
    │       │   ├── period/
    │       │   │   └── PeriodSetupPanel.tsx             # ⭐ Centralized period filter popover (used across all dashboards)
    │       │   ├── sales/                               # Sales-specific sub-components
    │       │   ├── topOrders/                            # Top orders gallery sub-components
    │       │   ├── orderDetail/
    │       │   │   ├── LineDetailDrawer.tsx      # Order line detail side drawer (with photo tabs)
    │       │   │   ├── OrderLineTable.tsx        # Order lines data table
    │       │   │   ├── PhotoGalleryModal.tsx     # Photo gallery lightbox modal
    │       │   │   ├── format.ts                 # Number/date formatting utilities
    │       │   │   └── shared.tsx                # Shared order detail UI components
    │       │   ├── report/
    │       │   │   ├── CustomerReportFilters.tsx # Customer report filter panel
    │       │   │   └── CustomerReportTable.tsx   # Customer report matrix table
    │       │   ├── ui/
    │       │   │   └── CustomSelect.tsx     # ⭐ Shared custom dropdown (SSOT)
    │       │   └── navigation/
    │       │       └── NavGroup.tsx         # Collapsible nav group component
    │       │
    │       ├── pages/
    │       │   ├── audit/
    │       │   │   └── CCTVAuditPage.tsx      # 🛡️ CCTV IT Audit Report (/audit/cctv-report)
    │       │   ├── login/                     # Authentication page feature folder
    │       │   │   ├── LoginPage.tsx          # Page composition only
    │       │   │   ├── LoginPage.css          # Login-only layout, fields, modals, and responsive styles
    │       │   │   ├── login.constants.ts     # Copy, languages, images, and registration types
    │       │   │   ├── hooks/
    │       │   │   │   └── useLoginController.ts # Auth state and API workflow
    │       │   │   └── components/            # Forms, cover, language control, fields, and modals
    │       │   ├── Dashboard.tsx              # หน้าภาพรวม (home, admin only)
    │       │   ├── DashboardDetail.tsx         # Dashboard detail drilldown
    │       │   ├── SalesDashboard.tsx          # ⭐ Sales Summary By Rep
    │       │   ├── CustomerDashboard.tsx       # ⭐ Yearly Sales By Customer (metric: amount | qty)
    │       │   ├── CustomerReportPage.tsx      # ⭐ Customer Report (Matrix Table)
    │       │   ├── TopOrdersGalleryPage.tsx    # ⭐ Top Orders Gallery
    │       │   ├── TopOrdersAnalyticsPage.tsx  # Top Orders Analytics (draft)
    │       │   ├── POTrackerAdvanced.tsx       # ⭐ PO Tracker main (list view)
    │       │   ├── SalesCustomerGroupDetail.tsx     # ✅ Customer Order List
    │       │   ├── OrderDetailPage.tsx         # Order detail (by ord/po/group)
    │       │   ├── ItemDetailPage.tsx          # Item-level detail
    │       │   ├── ProductionSummaryPage.tsx   # ⭐ Production Summary (chart + table, period-aware)
    │       │   ├── ProductionForecastPage.tsx  # Production Forecast (wrapper)
    │       │   ├── OrderVolumeSummaryPage.tsx  # ⭐ Order Volume Summary (trends + risk)
    │       │   ├── FBEOrderTrackPage.tsx       # ⭐ FBE 17-step order tracker
    │       │   ├── PlaceholderPage.tsx         # Placeholder for unimplemented modules
    │       │   ├── document/
    │       │   │   ├── ProcurementDocPage.tsx   # 🏗️ จัดซื้อและรับเข้า (SPA, SRA, SRB, SIR)
    │       │   │   ├── RequisitionDocPage.tsx   # 🏗️ ออเดอร์และการเบิก (SOA, SIA, SIB, SIP, SIS)
    │       │   │   └── SampleDocPage.tsx        # 🏗️ ห้องตัวอย่าง (SSA, SIM)
    │       │   └── subcontract/
    │       │       └── VendorPerformanceDashboardPage.tsx  # 🟡 UI Preview เท่านั้น (ไม่มี Backend)
    │       │
    │       ├── services/
    │       │   ├── authAPI.ts              # 🔐 Authentication (login, verify-admin)
    │       │   ├── poTrackerAPI.ts          # PO Tracker endpoints
    │       │   ├── orderAPI.ts             # Order detail endpoints
    │       │   ├── dashboardAPI.ts         # Dashboard/sales/customer stats
    │       │   ├── customerSummaryAPI.ts   # Customer summary fetch
    │       │   ├── itemYearlySummaryAPI.ts # Item yearly comparison
    │       │   ├── orderVolumeSummaryAPI.ts # Order volume trends/risk
    │       │   ├── orderTrackingAPI.ts     # FBE order tracking
    │       │   ├── productionSummaryAPI.ts # Production summary (year/month/week/day)
    │       │   ├── procurementAPI.ts       # Procurement document endpoints
    │       │   ├── requisitionAPI.ts       # Requisition document endpoints
    │       │   └── sampleAPI.ts            # Sample room endpoints
    │       │
    │       ├── hooks/
    │       │   ├── useCctvAuditForm.ts          # CCTV audit form state (localStorage + import/export + holidays)
    │       │   ├── usePeriodSetup.ts            # ⭐ Centralized period filter state management
    │       │   ├── useCustomerSalesData.ts      # Customer sales data hook
    │       │   ├── useCustomerReportData.ts     # Customer report data hook
    │       │   ├── useCustomerPageFilters.ts    # Customer page filter state
    │       │   ├── useOrderVolumeSummaryData.ts # Order volume summary hook
    │       │   ├── usePOTrackerAdvanced.ts      # PO Tracker data hook
    │       │   └── useTopOrdersGalleryData.ts   # Top orders gallery hook
    │       │
    │       ├── config/
    │       │   ├── api.ts                  # API base URL config
    │       │   ├── breadcrumbs.ts          # Breadcrumb definitions
    │       │   ├── cctvAuditConfig.ts      # CCTV audit defaults (columns, ✓/✗ options, signatures, Thai labels)
    │       │   ├── menuConfig.ts           # Sidebar menu structure definition (role-based)
    │       │   ├── formConfigs.ts          # Document form field configurations (all doc types)
    │       │   ├── customerGroups.ts       # SSOT for customer group mapping (N008, MLT, etc.)
    │       │   ├── orderDetailColumns.ts   # Order detail table column definitions
    │       │   └── productionSummaryConfig.ts # Production step/group/mode definitions
    │       │
    │       ├── contexts/
    │       │   └── ThemeContext.tsx    # Theme provider (dark-gold/royal-white/modern-dark)
    │       │
    │       ├── types/
    │       │   └── index.ts           # Shared TypeScript interfaces
    │       │
    │       ├── utils/
    │       │   ├── fetchWithAuth.ts          # 🔐 Fetch wrapper with JWT Bearer token injection
    │       │   ├── cctvAuditForm.ts          # CCTV audit pure helpers (generate / edit / validate / export JSON)
    │       │   ├── periodUtils.ts            # Period helper functions (getDefaultCompareYear, parseMonths, monthRange)
    │       │   ├── customerTrendsUrl.ts      # Customer trends URL builder
    │       │   ├── navigationUtils.ts        # Navigation utility helpers
    │       │   ├── photoUrl.ts               # Photo URL builder (psPhotoUrl, attachPhotoFallback)
    │       │   ├── printChart.ts             # Print chart utility
    │       │   ├── errors.ts                 # Error utility types
    │       │   ├── exportPOTrackerExcel.ts   # 📊 Excel export for PO Tracker data
    │       │   ├── exportOrderDetailExcel.ts # 📊 Excel export for Order Detail data
    │       │   └── exportOrderVolumeDetailsExcel.ts # 📊 Excel export for Order Volume
    │       │
    │       └── assets/                # Static assets (images, icons)
    │           └── hero.png           # Login page hero image
    │
    └── backend/                       # ⭐ Express + MSSQL
        ├── server.js                  # Express app entry (+ Photo Bridge routes)
        ├── db.js                      # SQL Server connection pool (singleton)
        ├── .env                       # 🔒 Local env (gitignored)
        ├── .env.example               # Env template
        ├── package.json
        │
        ├── middleware/
        │   └── authMiddleware.js      # 🔐 JWT verification middleware (Bearer token)
        │
        ├── routes/
        │   ├── auth.js                # 🔐 /api/auth — Login & Admin verification
        │   ├── orders.js              # ⭐ /api/orders — PO Tracker APIs (protected)
        │   ├── dashboard.js           # /api/dashboard — Dashboard/Sales/Customer stats (protected)
        │   ├── search.js              # /api/search — Global search (protected)
        │   ├── procurement.js         # /api/procurement — Procurement document APIs (protected)
        │   ├── requisition.js         # /api/requisition — Requisition document APIs (protected)
        │   ├── sample.js              # /api/sample — Sample room APIs (protected)
        │   └── lock.js                # /api/lock — Document locking (protected)
        │
        └── sql/                        # 🗄️ SSOT ของ Stored Procedures + Indexes (กัน "หายตอน restore")
            ├── indexes.sql             # 9 covering indexes (NONCLUSTERED, ONLINE) สำหรับ PC_Show_OrdTrack_Sum_*
            ├── stored-procedures/      # SP เวอร์ชันปัจจุบัน (ตัดรูป base64 → ส่ง SampleItemNo)
            ├── _baseline/              # snapshot SP/columns/indexes เดิม (rollback + อ้างอิง)
            └── README.md               # วิธี apply + สรุปการเปลี่ยนแปลง
```

---

## Coding Rules

### General

1. **ภาษา**: Code ทั้งหมดเป็นภาษาอังกฤษ, Comments สามารถใช้ภาษาไทยได้
2. **Encoding**: UTF-8 ทุกไฟล์ (รองรับ Thai text)
3. **Line Ending**: CRLF (Windows environment)
4. **Git**: ห้าม commit `.env`, `node_modules/`, `dist/`, test scripts
5. **📋 Documentation Rule**: ทุกครั้งที่ทำการเพิ่ม/ลบ/แก้ไขฟีเจอร์ หรือแก้ bug ต้องอัปเดตไฟล์เอกสารให้ตรงกันเสมอ:
   - `claude.md` — อัปเดต Folder Structure, Business Modules, API Endpoints, และ Section ที่เกี่ยวข้อง
   - `debug-history.md` — บันทึกปัญหาที่เกิดขึ้นและวิธีแก้ไข (เฉพาะกรณี Bug/Error เท่านั้น)
6. **🔍 File Integrity Check Rule**: เมื่อได้รับมอบหมายให้อ่านหรือแก้ไขไฟล์ใด ๆ **ต้องตรวจสอบไฟล์นั้นทุกบรรทัดอย่างละเอียด ทั้งก่อนเริ่มงานและหลังจบงานเสมอ** เพื่อป้องกันปัญหาโค้ดขาดหาย (Missing code/JSX tags) หรือ Syntax errors จากการทำ Replace/Edit พลาด
7. **🧹 Safe Refactoring & De-duplication Rule**: เวลาได้รับมอบหมายให้ "เก็บงานให้สะอาด ไม่ซ้ำซ้อน" ต้องทำตามลำดับนี้เพื่อไม่ให้เกิดความเสียหายหรือขยายสโคปเกินคำขอ:
   - **หาความซ้ำซ้อนด้วยหลักฐาน ไม่ใช่ความจำ**: ใช้ Grep ค้นชื่อ component/function/keyframe ที่จะรวมหรือลบทุกครั้ง เพื่อยืนยันว่าไม่มีที่อื่นอ้างอิงอยู่ก่อนที่จะลบ (เช่น เช็คว่า `@keyframes` ไม่ถูกเรียกใช้จริงก่อนลบ, เช็คว่า component ที่ดูซ้ำมีจุดต่างกันตรงไหนก่อนรวม)
   - **แยกของเดิมกับของใหม่ก่อนแก้**: ถ้าเจอ pattern ที่ดูแปลก (เช่น `setState` ใน `useEffect`, การใช้ `any`) ให้เช็คด้วย `git show HEAD:<path>` ก่อนว่าเป็นโค้ดเดิมที่มีอยู่แล้วหรือเพิ่งเพิ่มเข้ามาในรอบนี้ — ถ้าเป็นของเดิมและอยู่นอกสโคปที่ผู้ใช้ขอ **ห้ามแก้โดยไม่ถามก่อน** ให้แจ้งแยกไว้เฉย ๆ เพื่อไม่ scope-creep
   - **รวม component ซ้ำให้ดู superset ของทุกที่ที่ใช้งานจริงก่อน**: ถ้าพบ component หน้าตาเดียวกันถูก copy-paste ไว้หลายไฟล์ (เช่น dropdown), ให้อ่าน props/usage จากทุกจุดที่เรียกใช้ก่อนรวม แล้วย้ายไปไว้ที่ `src/components/ui/` เป็น Single Source of Truth — ถ้าการรวมทำให้ visual เปลี่ยนเล็กน้อย (เช่น border-radius ไม่ตรงกัน) ให้แจ้งผู้ใช้ว่าทำไปเพื่อ unify ความสอดคล้อง
   - **ใช้ TodoWrite ติดตามทุกขั้นตอนเมื่อแก้หลายไฟล์พร้อมกัน** เพื่อไม่ให้พลาดไฟล์ใดไฟล์หนึ่ง
   - **ตรวจซ้ำหลังแก้เสมอด้วยเครื่องมือจริง ไม่ใช่อ่านตาเปล่า**: รัน `npx tsc --noEmit -p tsconfig.app.json` และ `npx eslint <files ที่แก้>` ทุกครั้งหลังแก้ไขเพื่อยืนยันว่า build ผ่านจริง

### Frontend Rules

1. **Component Style**: ใช้ Functional Components + Hooks เท่านั้น (ไม่ใช้ Class Components)
2. **Styling**: ใช้ Tailwind CSS v4 เป็นหลัก, inline `@theme` variables ใน `index.css`
3. **Theme Variables**: สีทั้งหมดต้องอ้างอิงผ่าน CSS Custom Properties ใน `@theme` block — ห้าม hardcode สี และ component ใหม่ต้องเลือก role token (`--color-ui-*`) ก่อน palette token
4. **Type Safety**: ทุก component ต้อง type props ด้วย TypeScript interfaces (ประกาศใน `types/index.ts` หรือ inline)
5. **Routing**: ใช้ React Router v7 (`BrowserRouter` + `Routes` + `Route`), layout ผ่าน `<Route element={<AppLayout />}>`
6. **API Calls**: แยก API calls ไว้ใน `services/` folder — ห้ามเรียก fetch ตรงใน component
7. **Icons**: ใช้ `lucide-react` เท่านั้น — import เฉพาะ icon ที่ใช้ (tree-shakable)
8. **Menu Config**: Menu structure ทั้งหมดอยู่ใน `config/menuConfig.ts` — ห้าม hardcode menu ใน Sidebar
9. **Font Stack**:
   - Headings: `font-display` → Roboto
   - Body text: `font-body` → Roboto
   - Logo/Brand: `font-logo` → Cinzel
10. **Loading Skeletons & Refetching**: เมื่อมีการเพิ่ม/แก้ไข กล่องข้อมูล (Boxes/Cards) ในหน้าจอใด ๆ ต้องอัปเดตส่วนแสดงสถานะกำลังโหลด (Loading Skeleton) ให้สอดคล้องกันทั้งหน้าจอ เพื่อลด Layout Shift สำหรับการโหลดครั้งแรก (Initial Load)
    - **สำหรับการโหลดซ้ำ (Refetch/Refresh)**: ให้ใช้ Dim Effect (`opacity-50 pointer-events-none` เป็นเวลา ~450ms) ครอบพื้นที่ข้อมูลเป้าหมายแทนการแสดง Spinner หรือ Skeleton ซ้ำ เพื่อไม่ให้รบกวนสายตาและบล็อกการกดรัวๆ
11. **UI Components & UX**:
    - หลีกเลี่ยงการใช้ native `<datalist>` สำหรับ Dropdown ที่ซับซ้อน ให้ใช้ Custom React Dropdown component แทน เพื่อให้สามารถกำหนด CSS, z-index, hover states และ interaction ได้เต็มที่
    - **Accessibility & Contrast**: สีตัวอักษรปกติต้องมี Contrast ratio อย่างน้อย 4.5:1 และข้อความขนาดใหญ่ต้องอย่างน้อย 3:1 ทุกธีม ใช้พื้นผิวทึบเมื่อพื้นหลังรบกวนการอ่าน
    - **Capitalization**: ใช้มาตรฐานเดียวกันทั้งแอป เช่น Title Case ("Sales", "Password") แทนที่จะผสม ALL CAPS กับ Title Case ใน level เดียวกัน

### System-Wide Responsive And Loading Standard

- `AppLayout` is the shared responsive shell for every protected route. It uses `100dvh`; only the content outlet scrolls.
- Use `app-content-frame--dashboard` (max 1860px), `app-content-frame--dashboard-wide` (max 2400px), or `app-content-frame--workspace` (full width) according to the work surface.
- Use container breakpoints at 1200px, 1120px, and 620px. Below 820px viewport width, the sidebar opens as an overlay with a scrim.
- Never use CSS `zoom`, whole-page transforms, or viewport-based font scaling. Reflow grids, stack panels, wrap controls, or use local scrolling.
- Keep compact ERP typography fixed through `--erp-text-*` tokens and keep letter spacing at zero. Large screens gain working area, not larger type.
- Wide tables and toolbars may scroll inside their own region; the page document must not overflow horizontally.
- Keep Sidebar and Topbar visible during data loading. Skeletons replace only data-dependent content and must match the final layout footprint.
- Theme switching is immediate and must never display a full-screen loading overlay.
- Verify representative pages at 390x844, 1440x900, and 2560x1440 in `royal-white`, `dark-gold`, and `modern-dark`.

## Frontend Architecture Rules (UI Layout Patterns)

เพื่อป้องกันการเกิดภาวะโค้ดปนเปื้อน (Code Pollution) และลดความเกี่ยวเนื่องกันอย่างหนาแน่นเกินไป (Tight Coupling) ระบบจึงถูกขับเคลื่อนด้วยหลักการ **Inversion of Control (IoC) / Slot Injections** ผ่านคอมโพเนนต์ส่วนกลางสูงสุดตัวเดียวคือ `DocumentLayout.tsx`

## Skills & Portfolio Data Rules
1. **Single Source of Truth:** ข้อมูลสกิล ผลงาน หรือใบเซอร์ทั้งหมดของระบบ ต้องสถิตอยู่ภายในไดเรกทอรี `src/config/` เท่านั้น (ห้าม Hardcode สตริงข้อมูลลงในไฟล์ UI `.tsx` โดยตรง)
2. **Icon Mapping:** ให้ผูกตัวแปร Object ของ Icon Library (`lucide-react`) เข้ากับโครงสร้างของอาเรย์ข้อมูลในไฟล์ Config โดยตรง เพื่อหลีกเลี่ยงการใช้คำสั่ง `switch-case` ค้นหาชื่อไอคอนภายหลังในฝั่ง Component

### กฎเหล็กในการรักษามาตรฐานสากล:
1. **DocumentLayout (The Shell)** มีหน้าที่รับผิดชอบแต่เพียงระบบรอบนอก (เช่น โครงปุ่มทูลบาร์, กล่องแถบค้นหาเอกสารฝั่งซ้าย, ระบบสถานะ Loading/Error) โดยจะ**ไม่รับรู้ข้อมูลเชิงธุรกิจใดๆ** ทั้งสิ้น
2. **ห้ามทำการ Hardcode หรือฝังเงื่อนไขเฉพาะเมนู** (เช่น ดักเงื่อนไขข้อมูลพลอย หรือยิงเรียก URL API ของรูปภาพ PS/CAD) ภายในไฟล์ `DocumentLayout.tsx` เด็ดขาด
3. หากมีหน้าจอใดที่ต้องการแสดงผลโครงสร้างข้อมูลเฉพาะตัว ให้ทำการป้อนโค้ด JSX ชิ้นส่วนนั้นผ่านกล่องรับฝาก (Extensible Props Slots) แทน:

```typescript
// คุณสมบัติยืดหยุ่นที่ถูกจัดเตรียมไว้ให้หน้าลูกเรียกใช้
interface DocumentLayoutProps {
  renderHeaderSummary?: (header: any, lines: any[]) => React.ReactNode; // ชิ้นส่วนสรุปหัวด้านบน
  renderSubDetailPanel?: (selectedLine: any, idx: number) => React.ReactNode; // ชิ้นส่วนข้อมูลเชิงลึกขอด้านล่างฟอร์ม
  renderRightSidePanel?: (selectedLine: any, idx: number) => React.ReactNode; // ชิ้นส่วนรูปภาพ/สถิติแถบขวา
  renderFooterStats?: (lines: any[]) => React.ReactNode; // แถบข้อมูลสรุปท้ายตารางประมวลผล
  customModal?: React.ReactNode; // กล่องเปรียบเทียบรูปภาพป๊อปอัปภายนอก
}

### Backend Rules

1. **Module System**: CommonJS (`require` / `module.exports`) — `"type": "commonjs"` ใน package.json
2. **DB Connection**: ใช้ `getPool()` จาก `db.js` เสมอ — ห้ามสร้าง connection ใหม่เอง
3. **SQL Injection**: ใช้ parameterized queries (`request.input()`) เท่านั้น — ห้ามใช้ string interpolation กับ user input
4. **Error Handling**: ทุก route ต้อง `try/catch` และ return `{ ok: false, error: message }`
5. **Response Format**: ทุก API ต้อง return format `{ ok: boolean, data?: any, error?: string }`
6. **Logging**: ใช้ `console.log` + emoji prefix สำหรับ debug (`[EXEC SP]`, `[CACHE HIT]`, `❌`)
7. **Caching**: ใช้ In-Memory Cache ที่มีอยู่ (`cache` Map + `inFlight` Map) สำหรับ heavy queries ทั่วไป แต่สำหรับ PO Tracker ให้ดึงข้อมูลสดจาก DB ตลอดเวลา (ไม่ cache) เพื่อความถูกต้องแบบ Real-Time
8. **Photo Handling**: เสิร์ฟรูปจาก network file share ผ่าน Photo Bridge (`/api/photos/ps|cad/:itemNo` ใน `server.js` → `res.sendFile`) — **เลิกใช้ `toBase64Photo()`/VARBINARY แล้วทั้งระบบ**, ไม่ join `GMItemPhoto` ใน query ใด ๆ
9. **Stored Procedures**: เรียกผ่าน `request.execute(spName)` — ส่งเฉพาะ **2 Parameters Baseline (`@FromDate`, `@ToDate`)** เท่านั้น ห้ามส่ง `@Status` หรือ parameter เพิ่มเติมเด็ดขาด และห้ามแก้ไข/ALTER SP บน DB (การกรองสถานะทำใน Memory)

### Database Rules

1. **STRICT READ-ONLY (ห้ามแก้ไข DB เด็ดขาด)**: ห้ามรันคำสั่ง DDL/DML, ห้ามแก้ไข Table, View, Stored Procedure หรือ Index บน Database ใดๆ ทั้งสิ้น เพื่อรักษาความเข้ากันได้กับระบบเดิม (Legacy VB.NET) 100%
2. **Connection Pool**: ใช้ pool size max=20, min=2, idle timeout 1 นาที
3. **Request Timeout**: 300 วินาที (5 นาที) — dataset ขนาดใหญ่
4. **Date Handling**: ใช้ `sql.DateTime` สำหรับ date parameters ที่ส่งไป SP
5. **VARBINARY**: Cast photo columns เป็น `VARBINARY(MAX)` ใน SELECT
6. **NULL Handling**: ใช้ `ISNULL()` ใน WHERE clause สำหรับ nullable columns

---

## Commands

### Frontend (Working Directory: `Jewelry Factory System/frontend`)

```bash
# Development server (port 3000, proxy /api → localhost:3001)
npm run dev

# Production build (TypeScript check + Vite build)
npm run build

# Lint (ESLint flat config)
npm run lint

# Preview production build locally
npm run preview
```

### Backend (Working Directory: `Jewelry Factory System/backend`)

```bash (ถ้าใช้งานแล้วกรุณาปิดกลับคืนด้วย)
# Production start
npm start              # → node server.js

# Development with auto-reload
npm run dev            # → nodemon server.js
```

### Health Check

```bash
# ตรวจสอบว่า API + DB เชื่อมต่อได้
curl http://localhost:3001/api/health
```

### Environment Setup

```bash
# 1. Clone repo
git clone <repo-url>

# 2. Frontend setup
cd "Jewelry Factory System/frontend"
npm install

# 3. Backend setup
cd "../backend"
npm install
cp .env.example .env
# แก้ไข .env ใส่ค่าจริง (DB_HOST, DB_USER, DB_PASS, DB_NAME)

# 4. Run both (ใช้ 2 terminals)
# Terminal 1: Backend
cd "Jewelry Factory System/backend"
npm run dev

# Terminal 2: Frontend
cd "Jewelry Factory System/frontend"
npm run dev
```

---

## API Endpoints

### Authentication (Public — ไม่ต้อง token)

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| POST   | `/api/auth/login`         | Login (returns JWT + role)         |
| POST   | `/api/auth/verify-admin`  | Verify admin password (for registration flow) |

> ⚠️ ทุก endpoint ด้านล่าง (ยกเว้น Auth และ Photo Bridge) ต้องส่ง `Authorization: Bearer <token>` header — ถ้าไม่ส่งจะได้ 401 Unauthorized

### PO Tracker (Protected)

| Method | Endpoint                                    | Description                           |
|--------|---------------------------------------------|---------------------------------------|
| GET    | `/api/orders`                               | รายการ Order (aggregated, cached)      |
| GET    | `/api/orders/:ordNo`                        | รายละเอียด Order (single or grouped)  |
| GET    | `/api/orders/by-po/:poNo`                   | รายละเอียด Order by PO Number         |
| GET    | `/api/orders/group/:cust/:addr/:kind/:mat/:duedate` | รายละเอียด Group by 5 axes   |
| GET    | `/api/photos/ps/:itemNo` · `/api/photos/cad/:itemNo` | Item photo จาก network path (Photo Bridge, unauthenticated) — เลิกใช้ `/api/orders/photo/:itemNo` (base64) แล้ว |

**Query Parameters for `/api/orders`:**

| Param      | Type   | Default   | Description                      |
|------------|--------|-----------|----------------------------------|
| `dateFrom` | string | 7 months ago | Start date (ISO format)       |
| `dateTo`   | string | today     | End date (ISO format)            |
| `dateType` | string | `All`     | SP selector: `OrdDate`, `DueDate`, `CustDueDate`, `FinDate`, `All` |
| `status`   | string | `pending` | `pending` or `finish` or `All`   |
| `noCache`  | string | —         | Set to skip cache                |

### Dashboard and Sales Analytics Details
Dashboard/report endpoint details moved to dashboard.md. Sales menu/navigation details moved to sales-menu.md.

### Documents — Unified DocumentLayout (Protected)

| Method | Endpoint                              | Description                        |
|--------|---------------------------------------|------------------------------------|
| GET    | `/api/procurement/list`               | รายการเอกสารจัดซื้อ (SPA/SRA/SRB/SIR) |
| GET    | `/api/procurement/:docNo`             | รายละเอียดเอกสารจัดซื้อ              |
| GET    | `/api/requisition/list`               | รายการเอกสารเบิก (SOA/SIA/SIB/SIP/SIS) |
| GET    | `/api/requisition/:docNo`             | รายละเอียดเอกสารเบิก                 |
| GET    | `/api/sample/list`                    | รายการเอกสารห้องตัวอย่าง (SSA/SIM)   |
| GET    | `/api/sample/:docNo`                  | รายละเอียดเอกสารห้องตัวอย่าง          |
| POST   | `/api/lock/acquire`                   | ล็อคเอกสารสำหรับแก้ไข                |
| POST   | `/api/lock/release`                   | ปลดล็อคเอกสาร                      |

### Photo Bridge (Network File Server → HTTP)

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/api/photos/ps/:itemNo`    | PS Photo (Cost) จาก `\\<FILE_SERVER>\Photo\Cost` |
| GET    | `/api/photos/cad/:itemNo`   | CAD Photo จาก `\\<FILE_SERVER>\Photo\Mold(CAD)` |
| GET    | `/api/photos/:itemNo`       | Legacy endpoint (backwards compat)       |

### Search & System

| Method | Endpoint       | Description               |
|--------|----------------|---------------------------|
| GET    | `/api/search`  | Global search             |
| GET    | `/api/health`  | Health check (API + DB)   |

---

## Development Workflow

### Day-to-Day Development

1. **เปิด 2 terminals** — Backend (`npm run dev`) + Frontend (`npm run dev`)
2. **Vite Dev Server** (port 3000) จะ proxy `/api/*` ไปที่ Backend (port 3001) อัตโนมัติ
3. **Hot Reload**: Frontend มี HMR, Backend มี nodemon auto-restart
4. **Test API**: ใช้ browser DevTools Network tab หรือ `curl` ตรงไปที่ `:3001`

### Adding a New Page

1. สร้าง page component ใน `src/pages/NewPage.tsx`
2. เพิ่ม route ใน `src/App.tsx` ภายใต้ `<Route element={<AppLayout />}>`
3. เพิ่ม menu item ใน `src/config/menuConfig.ts`
4. (ถ้าต้องเรียก API) สร้าง service ใน `src/services/newPageAPI.ts`
5. (ถ้ามี type ใหม่) เพิ่ม interface ใน `src/types/index.ts`

### Adding a New API Route

1. สร้าง route file ใน `backend/routes/newRoute.js`
2. Register ใน `backend/server.js`: `app.use('/api/new-route', require('./routes/newRoute'))`
3. ใช้ `const { getPool, sql } = require('../db');` สำหรับ DB access
4. Wrap ด้วย `try/catch` + return `{ ok: boolean, ... }`

### Theme Development

1. Theme variables ประกาศใน `src/index.css` → `@theme { ... }` block
2. Theme overrides อยู่ใน `@layer base` → `.theme-<name> { ... }`
3. Toggle ผ่าน `ThemeContext` → `useTheme()` hook
4. ทุก component ต้องใช้ theme variables — ห้ามใช้ hardcoded colors

### Database Considerations

- **Strict Read-Only & Zero-Modification**: ห้ามแตะต้องหรือรันคำสั่งแก้ไข DB ใดๆ เด็ดขาด (100% Read-Only) เพื่อรักษาความเข้ากันได้กับระบบ legacy VB.net
- **SP Parameter Compatibility (Baseline 2 Params)**: SP ทั้ง 5 ตัวรองรับเฉพาะ 2 parameters ตาม Baseline: `@FromDate` (DateTime) และ `@ToDate` (DateTime) — ห้ามส่ง `@Status` หรือ parameter ใดๆ เพิ่มเติมเด็ดขาด เพราะจะทำให้ระบบ VB.NET เดิมที่เชื่อมต่อกับ DB ตัวนี้พังทันที (Parameter count mismatch)
- **Application-Layer Filtering**: การกรองสถานะ 'pending' / 'finish' / 'all' ทำที่ Memory ฝั่ง Backend และ Frontend เท่านั้น
- **Aggregation**: Backend Node.js ทำ grouping เพิ่มเติม (5 แกน: Cust, PO, Kind, ShipTo, Material + CustDueDate) หลังจาก SP ส่งผลลัพธ์กลับมาแล้ว
- **Connection Pool**: Pool จะ auto-reconnect เมื่อเกิด error — ไม่ต้อง restart server

---

## Database: Stored Procedures & Baseline Architecture (Server <DB_HOST>)

> ⚠️ **STRICT GUARDRAIL**: Database อยู่ในสถานะ **Baseline ดั้งเดิม 100% ห้ามรันสคริปต์แก้ไข/ALTER เด็ดขาด** 
> ทุก Stored Procedure ต้องรองรับการทำงานร่วมกับระบบเดิม (PCC Management System บน VB.NET) อย่างสมบูรณ์ ห้ามแตะต้อง DB โดยเด็ดขาด

### Stored Procedures — Baseline 5 ตัว ✅

SP ทั้ง 5 ตัวใช้โครงสร้าง CTE เดียวกัน ต่างกันแค่ **WHERE clause วันที่** ที่ใช้กรอง:

| SP Name | WHERE Date Column | สถานะ |
|---------|-------------------|--------|
| `dbo.PC_Show_OrdTrack_Sum_OrdDate` | `OrdHD.OrdDate BETWEEN @FromDate AND @ToDate` | ✅ Baseline (2 params) |
| `dbo.PC_Show_OrdTrack_Sum_DueDate` | `OrdHD.DueDate BETWEEN ...` | ✅ Baseline (2 params) |
| `dbo.PC_Show_OrdTrack_Sum_CustDueDate` | `OrdHD.CustDueDate BETWEEN ...` | ✅ Baseline (2 params) |
| `dbo.PC_Show_OrdTrack_Sum_FinDate` | `OrdHD.FinDate BETWEEN ...` | ✅ Baseline (2 params) |
| `dbo.PC_Show_OrdTrack_Sum_All` | ไม่กรองวันที่ (ดึงทั้งหมด) | ✅ Baseline (2 params) |

**Parameters ที่รับ (Baseline ทุกตัวรับ 2 parameters เท่านั้น):**
```sql
@FromDate DateTime,
@ToDate DateTime
```
*(ห้ามเพิ่ม `@Status` หรือ parameter อื่นลงใน Stored Procedure เด็ดขาด)*

**Backend เรียกใช้ที่:** `routes/poTracker.js` (และ `routes/orders.js`) → `request.execute(spName)` โดยส่งเฉพาะ `@FromDate` และ `@ToDate`

**โครงสร้าง CTE ภายใน SP (ทุกตัวเหมือนกัน):**
1. `DupOnePONo` — หา PO ที่มี OrdHD 1 record (ลูกค้า N008 group)
2. `DupMorPONo` — หา PO ที่มี OrdHD > 1 record (ลูกค้า N008 group)
3. `CTE_Track` — ROW_NUMBER() PARTITION BY เพื่อดึง OrdTrackDT ล่าสุด
4. `OrdDT_Aggregate` — SUM qty ทุกขั้นตอนการผลิต (ลูกค้าทั่วไป)
5. `CTO_OrdDT_Aggregate` — SUM qty (ลูกค้า N008 group, PO เดียว → Group by ShipTo)
6. `CTM_OrdDT_Aggregate` — SUM qty (ลูกค้า N008 group, หลาย PO)
7. **Final SELECT**: 3 UNION ALL (ลูกค้าทั่วไป + N008 PO เดียว + N008 หลาย PO)

### Database Indexes (Reference Only — 🛑 ห้ามรันสคริปต์สร้าง/แก้ไข Index บน DB เด็ดขาด)

> ⚠️ **STRICT POLICY**: ข้อมูล Index ด้านล่างเป็นเพียงการบันทึกโครงสร้างทางเทคนิคเพื่อการอ้างอิงเท่านั้น **ห้ามนำสคริปต์ไปรันสร้างหรือดัดแปลง Index บน Database เด็ดขาด** (ฐานข้อมูลถูกควบคุมโดยผู้ดูแลระบบและใช้งานร่วมกับระบบเดิม)

#### OrdHD (ตาราง Header ออเดอร์ — ใช้หนักสุด)
| Index Name | Key Columns | INCLUDE | ใช้เพื่อ |
|-----------|-------------|---------|--------|
| `PK_OrdHD` | `OrdNo` (CLUSTERED) | — | PK |
| `IX_OrdHD_OrdDate` | `OrdDate` | OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, DueDate, CustDueDate, CustQCDate | SP: OrdDate, All |
| `IX_OrdHD_DueDate` | `DueDate` | OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, OrdDate, CustDueDate, CustQCDate | SP: DueDate |
| `IX_OrdHD_CustDueDate` | `CustDueDate` | OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, OrdDate, DueDate, CustQCDate | SP: CustDueDate |
| `IX_OrdHD_CustCode_PONo` | `CustCode, PONo` | OrdNo, OrdKind, OrdMat, CustMultiAddr, OrdDate, DueDate, CustDueDate, CloseStatus | GROUP BY, JOIN, subquery |
| `IX_OrdHD_PONo` | `PONo` | OrdNo, CustCode, OrdKind, OrdMat, CustMultiAddr, OrdDate, DueDate, CustDueDate, CloseStatus | DupOnePONo/DupMorPONo CTE |
| `IX_OrdHD_CloseStatus` | `CloseStatus` | OrdNo, CustCode, PONo | CloseStatus lookup |

#### OrdDT (ตาราง Detail ออเดอร์)
| Index Name | Key Columns | INCLUDE | ใช้เพื่อ |
|-----------|-------------|---------|--------|
| `PK_OrdDT` | `OrdNo, OrdLineNo` (CLUSTERED) | — | PK |
| `IX_OrdDT_OrdNo` | `OrdNo` | ItemNo, ItemQty, StoneQty, FitQty, WijQty, WstQty, CastQty, ControlQty, GrindQty, PolishQty, PlateQty, QCQty, FinishQty, ExportQty, ItemExchAmnt | JOIN + SUM aggregate |
| `IX_OrdDT_ItemNo` | `ItemNo` | — | JOIN GMItemPhoto |

#### GMCust (ตารางลูกค้า)
| Index Name | Key Columns | INCLUDE | ใช้เพื่อ |
|-----------|-------------|---------|--------|
| `PK_GMCust` | `CustID` (CLUSTERED) | — | PK (มีอยู่แล้ว ✅) |
| `IX_GMCust_CustCode` | `CustCode` | CustName, SalesName | CustCode lookup |

#### GMItemPhoto (ตารางรูปสินค้า)
> ❌ **ไม่ต้องสร้าง index บนตารางนี้แล้ว** — ระบบเลิก join `GMItemPhoto` (เลิกใช้ base64) เปลี่ยนไปเสิร์ฟรูปจาก network path

#### OrdTrackDT (ตาราง Track ออเดอร์)
| Index Name | Key Columns | INCLUDE | ใช้เพื่อ |
|-----------|-------------|---------|--------|
| `IX_OrdTrackDT_Composite` | `CustCode, PONo, OrdMat, OrdKind, CustDueDate, CustMultiAddr` | OrdSGS, TrackTest, OORDate, BookDate, QC1-3 fields, ProdRiskIssue, ... | JOIN condition |
| `IX_OrdTrackDT_CTE` | `CustCode, OrdKind, OrdMat, CustMultiAddr, CustDueDate, OrdTrackID DESC` | — | CTE_Track PARTITION BY |

#### OrdWeekPlanHD (ตาราง Week Plan)
| Index Name | Key Columns | INCLUDE | ใช้เพื่อ |
|-----------|-------------|---------|--------|
| `IX_OrdWeekPlanHD_PlanDate` | `PlanDate` | PlanYear, PlanWeek | JOIN DueDate |

**SQL Script สำหรับ Index:** `backend/sql/indexes.sql` (22 ตัว) และ View `VW_Web_SalesDashboard` — **สร้างบน DB แล้วและใช้งานอยู่จริง** เก็บไฟล์ไว้เป็น SSOT เผื่อ DB ถูก restore — **🛑 AI ห้ามรัน/สร้าง/ลบ Index หรือ View เพิ่มเอง** (นโยบายไม่แตะ DB 100%) ส่วนไฟล์ใน `backend/sql/stored-procedures/` เป็นแบบร่างที่ยกเลิก ห้ามรันเด็ดขาด

---

## Environment Variables

### Backend `.env`

```env
DB_HOST=<SQL Server hostname or IP>
DB_PORT=1433
DB_NAME=<database name>
DB_USER=<username>
DB_PASS=<password>
API_PORT=3001
JWT_SECRET=<random secret key for JWT signing>
APP_ADMIN_PASSWORD=<admin login password>
APP_SALES_PASSWORD=<sales login password>
```

> ⚠️ ห้าม commit ไฟล์ `.env` จริง — ใช้ `.env.example` เป็น template

---

## Important Notes

1. **ระบบนี้เป็น Internal Tool** — ใช้งานภายใน LAN ของโรงงาน มีระบบ Authentication ผ่าน JWT + Role-based (admin/sales) แล้ว — sales เข้าได้เฉพาะ Sales Analytics และ Customer Dashboard, admin เข้าได้ทุกหน้า
2. **Data จาก Production DB** — ระวังเรื่อง query performance, ใช้ cache เสมอสำหรับ heavy queries
3. **Thai Language UI** — ข้อความในระบบเป็นภาษาไทย และใช้ Roboto เป็น font หลักของ UI/ตาราง
4. **Legacy Migration** — กำลัง migrate จาก VB.net ทีละ module, หลายหน้ายังเป็น Placeholder
5. **Photo Data** — รูปสินค้าเก็บเป็น VARBINARY ใน DB, แปลงเป็น base64 ตอน serve — ระวัง payload size

---

## Order Prefixes Analysis (As of May 25, 2026)

จากการตรวจสอบความเคลื่อนไหวล่าสุด (Latest `OrdDate`) ของคำนำหน้าออเดอร์ในฐานข้อมูลทั้งหมด (OrdHD) พบว่าสามารถแบ่งกลุ่มออเดอร์ที่ใช้งานได้และใช้งานไม่ได้ ดังนี้:

### ✅ Active Orders (ใช้งานได้ มีความเคลื่อนไหวปี 2025-2026)
| Prefix | จำนวนออเดอร์ทั้งหมด | การเคลื่อนไหวล่าสุด | หมายเหตุ |
|--------|---------------------|---------------------|----------|
| **BBC** | 118,809 | 2026-05-25 | ตรงกับปุ่มในระบบเก่า |
| **BBQ** | 14,221 | 2026-05-25 | ตรงกับปุ่มในระบบเก่า |
| **BBD** | 5,206 | 2026-05-25 | ⚠️ ไม่มีปุ่มในระบบเก่า แต่มีออเดอร์ใช้งานอยู่ |
| **BBI** | 818 | 2026-05-22 | ⚠️ ไม่มีปุ่มในระบบเก่า แต่มีออเดอร์ใช้งานอยู่ |
| **BBF** | 62 | 2026-05-21 | ตรงกับปุ่มในระบบเก่า |
| **BBP** | 1,461 | 2026-05-19 | ตรงกับปุ่มในระบบเก่า |
| **BBT** | 1,126 | 2026-05-15 | ตรงกับปุ่มในระบบเก่า |
| **BBX** | 189 | 2026-05-08 | ⚠️ ไม่มีปุ่มในระบบเก่า แต่มีออเดอร์ใช้งานอยู่ |
| **BBK** | 353 | 2026-04-30 | ตรงกับปุ่มในระบบเก่า |
| **BBR** | 1,610 | 2026-04-09 | ตรงกับปุ่มในระบบเก่า |
| **BBL** | 4,909 | 2026-04-09 | ตรงกับปุ่มในระบบเก่า |
| **BBS** | 762 | 2026-04-06 | ตรงกับปุ่มในระบบเก่า |
| **BBE** | 38 | 2025-04-29 | ตรงกับปุ่มในระบบเก่า |

### ❌ Inactive/Dead/Sample Orders (ใช้งานไม่ได้ ข้อมูลขยะที่ไม่มีการเคลื่อนไหวแล้ว)
*คำนำหน้าเหล่านี้ไม่มีความเคลื่อนไหวมาหลายปีแล้ว และถูกบล็อกออกจากสถิติใน Dashboard ทั้งหมด เพื่อความแม่นยำของตัวเลข*

- **BTC** (5,231) — ล่าสุด 2022-10-14
- **BBA** (3,354) — ล่าสุด 2022-10-13
- **BOC** (1,378) — ล่าสุด 2022-10-12
- **BPC** (1,263) — ล่าสุด 2022-09-30
- **LBC** (608) — ล่าสุด 2020-11-26
- **LBS** (104) — ล่าสุด 2020-05-13 *(งานตัวอย่าง)*
- **LBT** (17) — ล่าสุด 2020-02-28
- **BTS** (1) — ล่าสุด 2020-01-08
- **LLC** (239) — ล่าสุด 2016-07-29
- **GBT** (296) — ล่าสุด 2016-03-02
- **IBT** (37) — ล่าสุด 2016-02-18
- **SBC** (6,005) — ล่าสุด 2016-02-08
- **SBT** (3,151) — ล่าสุด 2015-12-23
- **CBT** (146) — ล่าสุด 2015-10-23
- **SPC** (337) — ล่าสุด 2015-09-11
- **SPT** (143) — ล่าสุด 2015-08-21
- **KBT** (586) — ล่าสุด 2015-08-19
- **KPT** (87) — ล่าสุด 2015-08-19
- **BRC** (11) — ล่าสุด 2015-07-17
- **GGT** (1) — ล่าสุด 2015-06-25
- **CPT** (13) — ล่าสุด 2015-03-23
- **CBC** (379) — ล่าสุด 2015-02-02
- **BLC** (5) — ล่าสุด 2014-10-27
- **BPT** (256) — ล่าสุด 2013-03-26
- **GPT** (4) — ล่าสุด 2013-03-23
- **BTT** (20) — ล่าสุด 2013-01-11
- **CPC** (3) — ล่าสุด 2012-06-22
- **GBC** (2) — ล่าสุด 2011-09-02
- **GTT** (4) — ล่าสุด 2011-08-31

---

## Document Page Design Standard

- **Unified Layout**: ทุกหน้าเอกสาร (เช่น จัดซื้อ, เบิก, ห้องตัวอย่าง) ต้องใช้โครงสร้างร่วมกันผ่าน `DocumentLayout.tsx` เพื่อลดความซ้ำซ้อนของโค้ด
- **Flat & Enterprise UI**: งดใช้สี Gradients (`bg-gradient-*`) ใช้โทนสีเรียบ แบน และชัดเจน เพื่อความเป็นมืออาชีพระดับองค์กร (Enterprise ERP / SAP-like)
- **Visual Distinctness**: ใช้ `border`, และ `bg-[var(--color-surface-*)]` เพื่อแบ่งสัดส่วนเนื้อหา (Header, Details, Lines) ให้ชัดเจน
- **Data Configuration**: โครงสร้างฟอร์มและตารางต่างๆ ต้องกำหนดที่เดียวใน `formConfigs.ts` เพื่อให้จัดการง่าย

## Operational Data Visualization Standard (System-Wide)

This standard applies to every dashboard, report, KPI, chart, and infographic in the system. A visualization is an operational control, not decoration. It must help the user understand a situation, identify the cause, or continue to the records that require action. If a visual does none of these better than a number or table, do not add it.

### Information Architecture

- Arrange analytical pages in the order `Scope/Filters -> Summary -> Explanation -> Details/Action`.
- Show the easiest overview first, then let users switch or drill down to exact records without opening a duplicate menu page.
- Keep active filters, sort, selected measure, and drill-down context when moving between overview and detail.
- Before adding any local selector, audit the existing page-level filters. Reuse an existing control when its meaning and scope are the same; add a second control only when it intentionally controls an independent dataset and the distinction is visible.
- Display the active data scope, unit, period, comparison basis, and last refresh time where relevant.
- Search affects only the dataset explicitly labeled by that search field. It must not silently change unrelated KPIs or charts.

### Choosing The Right Display

- Use a KPI for one exact result that users must recognize quickly.
- Use a line or column chart for change over time.
- Use stacked columns/bars for total plus composition; use 100% stacked only when the question is share, not volume.
- Use sorted horizontal bars for rankings.
- Use small multiples with the same scale when comparing periods or groups would make one chart crowded.
- Use a table when users need exact rows, many attributes, reconciliation, export, or direct actions.
- Use a funnel only for a real sequential process where each stage shares the same population.
- Avoid pie/donut charts for trends or many categories, 3D charts, decorative gauges, gradients, illustrations, and animation that does not communicate state.
- Do not repeat a KPI as a chart unless the chart adds trend, composition, distribution, or comparison.

### KPI Requirements

- Every KPI must include a clear label, formatted value, unit, and active period.
- A delta or trend arrow is allowed only when its comparison period and calculation are explicit.
- Do not mix order count, item quantity, weight, and amount under an ambiguous label such as `Total`.
- When a KPI combines categories, provide a compact breakdown or a direct path to the contributing records.

### Interaction And Drill-Down

- Tooltips must show exact values, units, category, period, and denominator/percentage when applicable.
- Clicking, tapping, or keyboard-activating a meaningful data point must filter or open the corresponding detail records when those records exist.
- Show drill-down context as a title, breadcrumb, or removable filter chips, with a clear reset/back action.
- Keep chart legends and series names consistent with filters, tables, exports, and domain terminology.
- Hover-only information is insufficient. The same information and action must be available by keyboard and touch.

### Color And Accessibility

- ใช้กฎ 60-30-10 ทั้งระบบ: `--color-ui-canvas` ประมาณ 60% สำหรับพื้นแอป, `--color-ui-surface` / `--color-ui-raised` ประมาณ 30% สำหรับพื้นที่ทำงาน, และ `--color-ui-interactive` ประมาณ 10% สำหรับ action/selection/focus
- สัดส่วนนี้เป็นเป้าหมายด้านลำดับสายตาของแต่ละหน้าจอ ไม่ใช่การนับพิกเซล และสีสถานะ/กราฟเป็นข้อยกเว้นเชิงข้อมูลที่ต้องใช้เท่าที่จำเป็น
- ปุ่มหลัก, link, selected tab/filter, active navigation และ focus ring ใช้ Brand role เดียวเท่านั้น ห้ามใช้ success/warning/danger หรือสี customer group แทนสถานะ interactive
- Use color only for defined meaning: status, severity, selection, process stage, or data series.
- Keep the same meaning and series color consistent across the system. Do not assign decorative colors to categories with no analytical purpose.
- Color must never be the only identifier; use labels, icons, patterns, ordering, or text as a second cue.
- Provide visible keyboard focus, sufficient contrast in every theme, screen-reader names, and readable labels at all supported sizes.
- ห้ามใส่ hex, rgb, hsl, oklch, named color หรือ Tailwind palette color ใน component; เพิ่ม token ที่ `src/index.css` และรัน `npm run lint:colors` (`npm run lint` เรียกให้อัตโนมัติ)

### Data Integrity

- KPI, chart, table, and export totals must use the same filter scope and calculation definitions.
- Clearly distinguish zero, missing, unavailable, and not-applicable values. Never silently remove them.
- Comparison charts must use compatible units and scales. Side-by-side period comparisons use the same axis scale unless a difference is clearly disclosed.
- Currency, quantity, weight, percentage, date, and timezone formats must be consistent with the domain and locale.
- Production screens use production-stage language and status semantics. Sales screens use customer, order, item, shipment, quantity, and amount semantics. Do not mix the domains without an explicit cross-domain view.

### States, Responsive Behavior, And Performance

- Provide loading skeleton, empty, error, partial-data, stale-data, and permission-denied states.
- Empty states must identify the active scope and offer a useful recovery action such as clearing filters.
- On smaller screens, reduce simultaneous comparisons, allow purposeful scrolling, or switch views. Never overlap, clip, or shrink labels until unreadable.
- Reuse fetched data when only changing presentation. Memoize expensive derived datasets and avoid unnecessary API requests.
- Keep motion between 150-250 ms and use it only to explain selection, transition, loading, or drill-down.

### Domain Examples

- Customer Trends: monthly order type mix -> filtered order lines.
- Production: delayed work by stage -> affected jobs or orders.
- Procurement: overdue or pending purchase orders -> matching PO records.
- Dispatch: shipment volume/status by period -> matching shipment rows.

### Definition Of Done

- Every visual has a named business question and a user action or decision it supports.
- Filters update all in-scope KPIs, charts, details, and exports consistently.
- Drill-down returns the correct records and can be cleared without losing the page context.
- Displayed totals reconcile with the API and detail records for the same scope.
- The workflow is tested on desktop and mobile with mouse, keyboard, and touch where applicable.
- Loading, empty, error, zero, partial-data, and long-label cases are verified.

## Testing & Cleanup Rules

- ห้ามลบหน้าเพจเดิม (เช่น `SOAPage.tsx`, `ProcurementPage.tsx`) จนกว่าการสร้าง Unified Layout และเพจใหม่จะเสร็จสมบูรณ์และทดสอบแล้วว่าไม่มีข้อผิดพลาด
- ก่อนลบไฟล์เก่า ต้องตรวจสอบ Routing ใน `App.tsx` ว่าชี้ไปยัง Component ใหม่ทั้งหมดแล้ว
- ตรวจสอบให้แน่ใจว่าได้ย้าย API Calls ไปไว้ใน Services อย่างถูกต้องแล้ว

---

## Split Domain Documents

Detailed dashboard/report guidance has moved to dashboard.md.

Detailed Sales Analytics menu, naming, breadcrumb, and Customer Trends guidance has moved to sales-menu.md.


## Subcontract Management (งานเหมา) — Planned Module

### สถานะ: 🟡 UI Preview 1/3 (ไม่มี Backend)
Sidebar menu group `subcontract` (icon: `handshake`) มี 3 รายการ:
- `/subcontract/vendor-performance` — Vendor Performance Dashboard — **`VendorPerformanceDashboardPage.tsx`** มี Layout ตามภาพต้นแบบแล้ว (Filters, KPI tiles, Chart cards, Detail table grouped headers + Grand Total) แต่ทุกค่าเป็น `N/A`/empty-state ทั้งหมด พร้อม banner "ยังไม่เชื่อมต่อข้อมูลจริง" ที่หัวหน้า — **ห้ามใส่เลขสมมติ/mock ไปแทนของจริงเด็ดขาด** จนกว่าจะมี Backend SP จริง
- `/subcontract/vendor-price-history` — ยังเป็น `PlaceholderPage.tsx`
- `/subcontract/aging-report` — ยังเป็น `PlaceholderPage.tsx`

### Target Design Reference
ผู้ใช้ส่งภาพหน้าจอจากระบบพี่น้อง **"PCC System: Subcontract Management"** มาเป็นต้นแบบดีไซน์สำหรับโมดูลนี้ในอนาคต ลักษณะสำคัญที่ต้องทำตามเมื่อพัฒนาจริง:
- KPI tiles แบบ flat icon-circle ไม่มี gradient/glassmorphism (ดู Design Notes ของ PO Tracker — ใช้แนวทางเดียวกัน)
- Filter sidebar/section แสดงฟิลด์กรองทั้งหมดพร้อมกัน (Date Range, Subcontract, Department, Process, Item Group) ไม่ซ่อนหลัง toggle
- Vendor Performance Dashboard: KPI row + 3 horizontal bar charts (On-Time Delivery %, Avg Lead Time, Defect Rate) + Detail table พร้อม grouped headers และแถว Grand Total
- Vendor Price History: Multi-series line chart (ราคาต่อ vendor ข้ามเวลา) + ตาราง Latest Price Comparison + ตาราง Price History Detail พร้อม pagination
- Aging Report: KPI row (Aging buckets 0-3/4-7/8-14/>14 วัน) + Donut chart + Bar chart คู่กัน + Detail table

**หมายเหตุ**: ยังไม่มี Backend API หรือ Stored Procedure สำหรับข้อมูล Vendor/Subcontract ในระบบ — ต้องสร้างใหม่ทั้งหมดก่อนเริ่ม build หน้าจอจริง (ห้ามสร้างข้อมูลตัวอย่าง/mock มาแสดงแทนข้อมูลจริงในระบบ production)

---

## 2026-07-16 API/Route Domain Split Notes

### Scope
- Split mixed dashboard/customer sales/item yearly code by domain responsibility while preserving existing endpoint URLs.
- This is a structure-only refactor for API client files and Express route files; business query behavior should remain the same.
- TopOrdersAnalyticsPage.tsx is still a draft page, so only import boundaries were updated there. Do not perform a heavy component rewrite until the page direction is confirmed.

### Frontend Service Ownership
- src/services/dashboardAPI.ts: dashboard core only (years, dashboard cards, card detail, sales summary) plus temporary compatibility re-exports.
- src/services/customerSummaryAPI.ts: customer summary fetch for /api/dashboard/customer-summary.
- src/services/customerSalesAPI.ts: sales customer groups, sales monthly/type analytics, sales orders, and top items.
- src/services/itemYearlySummaryAPI.ts: item yearly and item/customer yearly comparison endpoints under /api/items.

### Backend Route Ownership
- backend/routes/dashboard.js: dashboard core endpoints only.
- backend/routes/customerSummary.js: /api/dashboard/customer-summary.
- backend/routes/customerSales.js: /api/dashboard/sales-* and /api/dashboard/top-items endpoints with shared sales filters.
- backend/routes/itemYearlySummary.js: item yearly summary endpoints.
- backend/routes/items.js: compatibility wrapper for itemYearlySummary.
- backend/server.js mounts the new routers under the same /api/dashboard and /api/items prefixes, so frontend URLs do not change.

### Refactor Rule
- When moving more code, split by real business responsibility first, then rename. Do not rename a large file blindly if it still contains multiple domains.

---
## Route Comment Standard

Use short guide comments that make ownership obvious at first read.

For backend route files, prefer a top overview block with:
- Route
- Page/Menu
- Description
- Filter policy or data boundary

Inside route handlers, add only short section labels for important boxes/queries, for example KPI cards, Top 30 Items, drilldown rows, or comparison data. Avoid comments that explain obvious syntax.

---
## 2026-07-30 Presentation & Code Quality Updates (Phase 1-4)

### Scope
- Addressed security vulnerabilities in Login (DB auth, bcrypt, removed localStorage tokens on logout).
- Built Executive Overview page (`/dashboard/overview`) as the main entry point for client presentations.
- Refactored frontend structure for maintainability.

### Frontend Structural Refactoring (Phase 4)
- **LoginPage**: Extracted massive inline styles into `LoginPage.css`.
- **SalesCustomerGroupAnalytics**: Refactored massive 1,700+ line component into modular sub-components for KPIs, charts, filters, and drill-down tables.
- **TopOrdersGalleryPage**: Separated gallery cards and ranking tables into dedicated sub-components.
- Centralized UI notifications into a shared Toast component for consistent error and success handling across the application.

---

## 2026-09-03 FBE Order Tracker Module (ระบบติดตามสถานะคำสั่งผลิต FBE)

### 1. ภาพรวมและเส้นทางไฟล์ (Module Overview & File Architecture)
- **Route**: `/production/fbe-order-track`
- **Frontend Page**: `src/pages/FBEOrderTrackPage.tsx`
- **Stepper Component**: `src/components/dashboard/orderTracking/OrderTrackStepper.tsx`
- **Frontend Service**: `src/services/orderTrackingAPI.ts` -> `getOrderTracking(ordNo, ordLineNo)`
- **Backend Route**: `backend/routes/orderTracking.js` (`GET /api/order-tracking/track?ordNo=...&ordLineNo=...`)
- **Photo Bridge Endpoints**:
  - Primary: `/api/photos/ps/:itemNo` (ภาพถ่ายจริงจาก Photo Server)
  - Fallback: `/api/photos/cad/:itemNo` (ภาพเรนเดอร์ CAD)
  - Helper: `src/utils/photoUrl.ts` (`psPhotoUrl`, `attachPhotoFallback`)

### 2. แหล่งที่มาของข้อมูลและการเชื่อมโยงฐานข้อมูล (Data Sources & Schema Mapping)
1. **ข้อมูลคำสั่งผลิตและสเปกชิ้นงาน (Order Header & Detail Specs)**:
   - ตาราง `OrdHD`: ดึง `CustCode`, `OrdDate`, `DueDate`, `PONo`
   - ตาราง `OrdDT`: ดึง `ItemNo`, `ItemMat`, `ItemCust`, `ItemDesc`, `ItemStone`, `ItemPlate`, `ItemSize`, `ItemQty`, `OrdLineNo`
   - เงื่อนไข SQL: `OrdHD.OrdNo = @ordNo AND OrdDT.OrdLineNo = @ordLineNo`
2. **สายการผลิต 17 ขั้นตอนของ FBE (17 Production Steps Pipeline)**:
   - ลำดับขั้นตอน:
     1. Grind (ลงหิน - `GR`)
     2. Tumbling 1 (ร่อน 1 - `TB`, Dept: `TB1`)
     3. Assemble 1 (ประกอบ 1 - `AS`, Dept: `AS1`)
     4. Laser 1 (เลเซอร์ 1 - `LS`, Dept: `LS1`)
     5. Filing 1 (กระดาษทราย 1 - `FL`, Dept: `FL1`)
     6. Tumbling 2 (ร่อน 2 - `TB`, Dept: `TB2`)
     7. Epoxy (ทาสี - `EP`)
     8. Filing 2 (กระดาษทราย 2 - `FL`, Dept: `FL2`)
     9. Lapping (ตัดเหลี่ยม - `LP`)
     10. Copper (ชุบทองแดง - `CP`)
     11. Polish 1 (ขัดเงา 1 - `PL`, Dept: `PL1`)
     12. Assemble 2 (ประกอบ 2 - `AS`, Dept: `AS2`)
     13. Laser 2 (เลเซอร์ 2 - `LS`, Dept: `LS2`)
     14. Filing 3 (กระดาษทราย 3 - `FL`, Dept: `FL3`)
     15. Polish 2 (ขัดเงา 2 - `PL`, Dept: `PL2`)
     16. IQC (ตรวจสอบ - `IQ`)
     17. Plating (ชุบ - `PT`)
3. **การอ่านยอดส่ง (Send) และยอดรับ (Receive)**:
   - ฝั่งส่ง: ตาราง `${prefix}SenHD` (DocuDate, DocuStatus, DocuNo) INNER JOIN `${prefix}SenDT` (SenQty) WHERE `ProFac = 'FBE' AND OrdNo = @ordNo AND OrdLineNo = @ordLineNo`
   - ฝั่งรับ: ตาราง `${prefix}RecHD` (DocuDate, DocuNo) INNER JOIN `${prefix}RecDT` (RecQty) WHERE `ProFac = 'FBE' AND OrdNo = @ordNo AND OrdLineNo = @ordLineNo`
   - ยอดคงเหลือประจำขั้นตอน: `Balance = RecQty - SenQty`
4. **กฎการประเมินสถานะของขั้นตอน (Step Status Logic)**:
   - `status = 2` (**เสร็จสิ้น / Done**): มีเอกสาร และ `balance === 0` (หรือส่งงานต่อครบแล้ว)
   - `status = 1` (**กำลังทำ / In-Progress / WIP**): มีเอกสารรับเข้า และ `balance > 0`
   - `status = 0` (**รอ / Pending**): ยังไม่มีการบันทึกเอกสารเข้าสู่ขั้นตอนนี้

### 3. กฎและข้อกำหนดการออกแบบ (Design Standards & Strict Guardrails)
1. **โครงสร้างโฟลเดอร์และการแยกไฟล์ Component (Strict Module Encapsulation)**:
   - **กฎเหล็ก**: ทุกครั้งที่สร้าง Feature หรือระบบใหม่ ให้สร้างโฟลเดอร์แยกเฉพาะเรื่องนั้นๆ ภายใต้ `src/components/...` เสมอ ห้ามวางไฟล์ Component กองรวมกันมั่วๆ ในโฟลเดอร์หลัก
   - Component ที่ทำหน้าที่ซับซ้อนจะต้องถูก Refactor แยกเป็น Sub-components เสมอ (เช่น แยก Table, Chart, Filters ออกจากหน้าเพจหลัก)
2. **ห้าม Hardcode สีเด็ดขาด (Strict No Hardcoded Colors)**:
   - ทุกองค์ประกอบต้องใช้ CSS Design Tokens จาก `src/index.css` 100%
   - ผ่านการตรวจสอบโดย `npm run lint:colors` (0 violations)
   - คอนทราสต์ต้องผ่านเกณฑ์ WCAG 2.1 Level AA (ข้อความ >= 4.5:1, เส้นขอบและเส้นเชื่อมต่อ >= 3.0:1)
2. **โครงสร้าง 2 คอลัมน์แบบ Single-Screen Fit (จอไม่เลื่อน)**:
   - **ฝั่งซ้าย (~75%)**:
     - *Order Information*: กริด 3 คอลัมน์ แสดงข้อมูลครบถ้วน ตัวอักษรขนาด 12.5px - 13.5px อ่านชัดบนจอโปรเจคเตอร์
     - *Active Step Highlight Banner*: แถบสีส้มอ่อนระบุขั้นตอนปัจจุบันและยอดขั้นตอนที่ทำเสร็จแล้ว
     - *Production Progress*: ไทม์ไลน์ 17 ขั้นตอนแบบเชื่อมต่อสมบูรณ์
     - *Step History Table*: ตารางบันทึกประวัติการรับ-ส่งงาน จัดขอบชัดเจน เลื่อนเฉพาะภายในกล่อง
   - **ฝั่งขวา (~25%)**:
     - *Item Photo*: แสดงรูปถ่ายขนาดกระชับ 375px จัดวางรูปกึ่งกลางอย่างพอดี ไม่มีกรอบซ้อน และไม่มีแคปชันท้ายรูป
     - *Summary Dashboard*: วงแหวน Donut Gauge พร้อมสถิติ 4 ตัวเลขสถานะขนาดใหญ่แบบไร้กรอบ
3. **ช่องค้นหาและการสแตนด์บาย (Search Bar & Empty Standby)**:
   - ค่าเริ่มต้นของ `ordNo` และ `ordLineNo` เป็นค่าว่าง (`''`) ไม่ใส่ตัวอย่าง ("เช่น...") และไม่มีการยิงค้นหาอัตโนมัติบน `useEffect` mount
   - ก่อนค้นหา: ตัวเลขสถิติและข้อมูลแสดงขีด `-` อย่างสุภาพ
4. **ไทม์ไลน์ 17 ขั้นตอน (Production Progress Stepper)**:
   - นำตัวเลขจำนวน Qty ออกจากโหนด เพื่อความสบายตา
   - แถววันที่:
     - ขั้นตอนที่เสร็จแล้ว: แสดงวันที่แล้วเสร็จ (`DD/MM`)
     - ขั้นตอนที่กำลังทำ: แสดงข้อความ **`กำลังทำ`** สีส้ม พร้อมไฟกระพริบช้าๆ นุ่มนวล 2.4 วินาที (`.step-current-blink`, `.text-current-blink`)
     - ขั้นตอนถัดไป: แสดงข้อความ **`รอ`**
5. **ตาราง Step History**:
   - คอลัมน์ Status: ตัวอักษรหนาเข้ม (**800**) มีสีตามสถานะ ไม่มีกรอบ/พื้นหลัง (`เสร็จแล้ว (Y)` สีเขียว, `กำลังทำ (O)` สีส้ม)
   - พื้นหลังตารางใช้สีเดียวกับตัวการ์ด (`var(--color-ui-surface)`) เรียบเนียน ไม่ใช้ลายแถบม้าลาย
6. **แผงสรุปความคืบหน้ารวม (Summary Card)**:
   - Donut Gauge: สไตล์ทางการระดับ Executive มีสถานะประมวลผลหมุนแบบสมูท (`cubic-bezier`) เมื่อ loading พร้อมคำว่า `ประมวลผล...`
   - เมื่อแสดงผล: ตัวเลขเปอร์เซ็นต์ขนาดใหญ่ `24px` หนา คมชัด พร้อมคำว่า `ความคืบหน้า`
   - สถิติตัวเลข 4 ช่อง: ขนาด `26px` ไร้กรอบ (ทั้งหมด=สีน้ำเงิน, เสร็จแล้ว=สีเขียว, กำลังทำ=สีส้ม, คงเหลือ=สีกรม/เทา)

### 4. Period Setup Consolidation (Sept–Oct 2026) — ✅ Completed
- **Goal**: Consolidate redundant "Period Setup" logic into a single centralized hook `usePeriodSetup` + UI component `PeriodSetupPanel.tsx`.
- **Scope**: All dashboards — CustomerDashboard, CustomerReport, SalesDashboard, ProductionSummary, ProductionForecast, OrderVolumeSummary.
- **Key Files**:
  - `src/hooks/usePeriodSetup.ts` — Centralized state management (presets, compare years, week/month/day ranges, URL sync)
  - `src/components/period/PeriodSetupPanel.tsx` — Shared popover UI with preset buttons, month/week/day selectors, compare year checkboxes
  - `src/utils/periodUtils.ts` — Shared helpers (`getDefaultCompareYear`, `parseMonths`, `monthRange`)
- **Supported Presets**: `full-year`, `ytd`, `this-month`, `last-month`, `month`, `week`, `day`, `custom`
- **Default Period**: `full-year` (changed from `month` on 2026-10-01)
- **Compare Target**: Checkbox-based activation (Compare 1 / Compare 2) with auto-selection of compare year
- **Status**: ✅ Completed and deployed across all dashboard pages.

---

## 2026-09-25 PO Tracker Modernization & Strict DB Baseline Compatibility

### 1. นโยบายความปลอดภัยฐานข้อมูลขั้นเด็ดขาด (Strict Zero-DB-Modification Policy)
- **🛑 ห้ามแก้ไขฐานข้อมูลเด็ดขาด (READ-ONLY 100%)**: ไม่ว่ากรณีใดๆ ห้ามรันคำสั่ง DDL/DML, ห้าม ALTER/CREATE/DROP Stored Procedure, Table, View หรือ Index บนเซิร์ฟเวอร์ฐานข้อมูลทั้งสิ้น
- **การเข้ากันได้กับระบบเดิม (Legacy VB.NET / PCC Management System)**:
  - Stored Procedures ทั้ง 5 ตัว (`PC_Show_OrdTrack_Sum_OrdDate`, `_DueDate`, `_CustDueDate`, `_FinDate`, `_All`) ต้องคงโครงสร้างตาม **Baseline ดั้งเดิมที่รับ 2 Parameters (`@FromDate`, `@ToDate`)**
  - หากมีการแก้ไขหรือเพิ่ม parameter (เช่น `@Status`) ใน DB จะทำให้ระบบ VB.NET เดิมที่เชื่อมต่อผ่าน OLE DB ไม่สามารถดึงข้อมูลได้ (Parameter count mismatch)
  - ความต้องการในการกรองหรือคำนวณใหม่ ต้องดำเนินการที่ระดับ Application Layer (Node.js backend / React frontend) เท่านั้น

### 2. สถาปัตยกรรมและ Logic ล่าสุดของระบบ PO Tracker
1. **Backend Signature Compatibility (`routes/poTracker.js`)**:
   - Backend เรียก Stored Procedure โดยส่งเฉพาะ 2 parameters ตาม Baseline: `@FromDate` และ `@ToDate` เท่านั้น
   - ตัดการส่ง parameter `@Status` ออก 100%
   - ปิด In-Memory Cache เพื่อให้หน้าจอแสดงผลข้อมูลสดใหม่ทันทีเสมอ (Real-Time Fresh Data)
   - ตัด binary buffer ของ `ItemPhoto` ออกจาก JSON response เพื่อประหยัด bandwidth และความรวดเร็วในการส่งข้อมูล
2. **การกรองสถานะในหน่วยความจำ (In-Memory Status Filter)**:
   - `Pending`: กรองแถวที่ `UnFinishQty !== 0` (งานที่ยังค้างผลิต/ยังไม่เสร็จ)
   - `Finish`: กรองแถวที่ `FinishQty !== 0` (งานที่เสร็จแล้ว)
   - `ALL`: ไม่กรองข้อมูล แสดงรายการทั้งหมด
3. **การจัดกลุ่มลูกค้า (Customer Group Mapping)**:
   - `N008`: ลูกค้า `N008`, `N048`, `N066-N075`
   - `N044`: ลูกค้า `N044`, `N064`, `N065`
   - `N051`: ลูกค้า `N051`
   - `N098`: ลูกค้า `N098`
   - `MLT`: ลูกค้า `U411-U426`, `MLT`
   - `General`: ลูกค้าอื่นๆ ทั้งหมดที่ไม่ตรงกับเงื่อนไขข้างต้น
4. **Dropdown วันที่เป็นอิสระ (Decoupled Date Filter)**:
   - Dropdown วันที่ทำหน้าที่เลือก SP ตามเดิม (Order Date, Factory Due Date, Cust Due Date, Finish Date)
   - การสลับปุ่มสถานะ (Pending / Finish / ALL) จะไม่ไปบังคับสลับเงื่อนไขวันที่อีกต่อไป

---

## 2026-10-01 Chart UI Standardization & Production Summary Improvements

### 1. Bar Chart System-Wide Standardization
All bar charts across the system have been standardized with consistent styling rules:

- **Square Edges**: All bar charts use `radius={[0, 0, 0, 0]}` — no rounded corners on any bar.
- **Zero Bar Gap**: All grouped bar charts use `barGap={0}` — bars within the same category group are flush against each other with no spacing.
- **No Max Bar Size**: Removed `maxBarSize` constraints from all `<Bar>` components to allow bars to fill available space naturally without gaps.
- **Unused `Cell` imports removed**: Cleaned up unused `Cell` imports from `RiskCustomerChart.tsx` and `ProductionForecastChart.tsx`.

**Affected Chart Files:**

| File | Chart Type | Changes |
|------|-----------|---------|
| `ProductionSummaryChart.tsx` | `ComposedChart` | `barGap={0}`, removed `maxBarSize={38}`, `radius=[0,0,0,0]` |
| `ProductionForecastChart.tsx` | `ComposedChart` | `barGap={0}`, `radius=[0,0,0,0]`, removed unused `Cell` import |
| `CustomerSalesChart.tsx` | `ComposedChart` | `barGap={0}`, removed `maxBarSize={calculatedMaxBar}`, `radius=[0,0,0,0]` |
| `RiskCustomerChart.tsx` | `BarChart` | `barGap={0}`, `radius=[0,0,0,0]`, removed unused `Cell` import |
| `InfographicSalesTrends.tsx` | `BarChart` | `barGap={0}`, removed `maxBarSize={30}`, `radius=[0,0,0,0]` via custom shape |
| `FactoryOutputTrendChart.tsx` | Custom HTML bars | `borderRadius: 0` (was `4px 4px 1px 1px`) |

### 2. Production Summary Table Improvements (`ProductionSummaryTable.tsx`)
- **Increased row height**: From `22px`/`24px` to `30px` for all rows (data, total, avg) to match Forecast table density.
- **Increased padding**: Cell padding raised from `2px` to `4px`/`6px`/`8px` across all cells for better readability.
- **Font size increase**: Cell font size raised from `10px`/`10.5px`/`11px` to `11px`/`12px`/`13px`.
- **First column width increase**: From `58px`/`75px` to `75px`/`95px` to accommodate label text.
- **Avg row label**: Changed from `Avg.(Day/Pcs)` (with forced `fontSize: 9.5px`) to `Avg / Day` (using standard font size).
- **Zero value display**: Fixed `renderCell` logic — zero values now display `-` consistently (previously avg rows showed `0`).

### 3. Period Setup Default Change
- **Default preset** changed from `month` to `full-year` in `usePeriodSetup.ts`.
- When `full-year` is selected, `monthFrom` defaults to `1` and `monthTo` defaults to `12` (full range).
- This ensures the "Year" filter mode displays all 12 months of data by default.

### 4. Compare Target Checkbox
- Added checkbox-based activation for Compare Year selection in `PeriodSetupPanel.tsx`.
- Users can toggle Compare 1 / Compare 2 independently via checkboxes.
- When a checkbox is activated, the compare year auto-selects the nearest available year.


## 2026-10-14 CCTV IT Audit Report (Audit → CCTV Report)

### 1. ภาพรวม
- **Route**: `/audit/cctv-report` (admin only) · เมนู `Audit → CCTV Report` (`menuConfig.ts`, id `audit-cctv-report`)
- **วัตถุประสงค์**: ผู้ใช้ติ๊กผลตรวจกล้องวงจรปิดรายวันบนหน้าจอ → สั่งพิมพ์ A4 แนวนอน → เซ็นชื่อ/ลงวันที่ด้วยปากกา ใช้เป็นหลักฐาน ISO / IT Audit
- **UI**: ไม่ใช้ checkbox ในตาราง — สถานะแสดงเป็นตัวอักษร `✓` / `✗` / `-` (คลิกเพื่อวน ว่าง → OK → NG → NA → ว่าง)
- **ไฟล์**: `pages/audit/CCTVAuditPage.tsx`, `components/audit/CctvAuditTable.tsx`, `hooks/useCctvAuditForm.ts`, `utils/cctvAuditForm.ts`, `config/cctvAuditConfig.ts`, types `Cctv*` ใน `types/index.ts`, สไตล์ `.cctv-*` ท้าย `index.css`

### 2. Zero-DB (ตามกฎ READ-ONLY 100%)
- **ไม่มี Backend Endpoint ใหม่ และไม่เขียนลง DB**
- วันหยุดดึงจาก endpoint เดิม `GET /api/production-summary/holidays?year=` → ตาราง `GMHoliday` (SELECT เท่านั้น) ผ่าน `getHolidays()` ใน `productionSummaryAPI.ts`
- `GMHoliday` ส่งมาเป็นวันที่อย่างเดียว (ไม่มีชื่อวันหยุด) → แถวเส้นคั่นแสดงคำว่า "วันหยุด"
- ฟอร์มเก็บเป็น JSON: React state + `localStorage` (key `cctv-audit-form`) + Import/Export ไฟล์ `.json` (`cctv-audit-YYYY-MM.json`) — **Export เก็บไว้เป็นหลักฐานก่อนพิมพ์เสมอ** เพราะ localStorage หายได้

### 3. โครงสร้าง JSON (`CctvAuditForm`, `schemaVersion: 1`)
- `columns[]` — `{ id, label, type: 'date'|'status'|'text', width?, fixed? }` คอลัมน์แรกต้องเป็น `date` เสมอ (แถววันหยุด merge ด้วย `colSpan = columns.length - 1`)
- `rows[]` — `{ id, type: 'data'|'holiday', date: 'YYYY-MM-DD', cells?: Record<columnId, value>, holiday?: { name, source: 'company'|'sunday'|'manual' } }`
- `cells` ผูกกับ `columnId` ไม่ใช่ลำดับ → เพิ่ม/ลบ/สลับคอลัมน์โดยข้อมูลเดิมไม่เพี้ยน
- วันที่เป็น string (ไม่ใช้ `Date` ตรงๆ) เพื่อเลี่ยง timezone เลื่อนวัน
- วันหยุดถูกฝังเป็น snapshot ตอน Generate — ฟอร์มเดือนเก่าไม่เปลี่ยนแม้ `GMHoliday` ถูกแก้ภายหลัง
- Generate เดือนใหม่จะคัดลอก columns/signatures/location จากฟอร์มปัจจุบัน แต่ล้างเลขที่เอกสาร; ติ๊ก "วันอาทิตย์เป็นวันหยุด" เพื่อแทรกวันอาทิตย์เป็นเส้นคั่นอัตโนมัติ; ผู้ใช้สลับแถวเป็นวันหยุด/วันทำงานเองได้ (ไอคอนปฏิทิน, ไม่ถูกพิมพ์)

### 4. Print
- ใช้ named page `cctv-landscape` (`@page { size: A4 landscape; margin: 10mm }`) ผูกกับ `.cctv-sheet`
- ตอนพิมพ์บังคับกระดาษขาว/ตัวหนังสือดำทุกธีม; แถบวันหยุดสีเทาใช้ `print-color-adjust: exact` (มีใน `@media print` เดิม); `thead` ซ้ำทุกหน้า; กล่องลายเซ็นไม่แบ่งหน้า
- ปุ่ม/Toolbar/คอลัมน์สลับวันหยุดใช้ `.no-print`
