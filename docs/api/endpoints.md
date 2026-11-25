# API Endpoints, Environment and Dev Workflow

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## API Endpoints

### Authentication (Public — No token required)

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| POST   | `/api/auth/login`         | Login (returns JWT + role)         |
| POST   | `/api/auth/verify-admin`  | Verify admin password (for registration flow) |

> ⚠️ All endpoints below (except Auth and Photo Bridge) require an `Authorization: Bearer <token>` header — requests without valid tokens receive 401 Unauthorized.

### PO Tracker (Protected)

| Method | Endpoint                                    | Description                           |
|--------|---------------------------------------------|---------------------------------------|
| GET    | `/api/orders`                               | Order list (aggregated, cached)       |
| GET    | `/api/orders/:ordNo`                        | Order detail (single or grouped)      |
| GET    | `/api/orders/by-po/:poNo`                   | Order detail by PO Number             |
| GET    | `/api/orders/group/:cust/:addr/:kind/:mat/:duedate` | Group detail across 5 axes    |
| GET    | `/api/photos/ps/:itemNo` · `/api/photos/cad/:itemNo` | Item photos from network path (Photo Bridge, unauthenticated) — deprecated `/api/orders/photo/:itemNo` (base64) |

**Query Parameters for `/api/orders`:**

| Param      | Type   | Default   | Description                      |
|------------|--------|-----------|----------------------------------|
| `dateFrom` | string | 7 months ago | Start date (ISO format)       |
| `dateTo`   | string | today     | End date (ISO format)            |
| `dateType` | string | `All`     | SP selector: `OrdDate`, `DueDate`, `CustDueDate`, `FinDate`, `All` |
| `status`   | string | `pending` | `pending`, `finish`, or `All` |
| `noCache`  | string | —         | Flag to bypass cache             |

### Dashboard and Sales Analytics Details
Dashboard/report endpoint details moved to docs/sales/dashboard.md. Sales menu/navigation details moved to docs/sales/sales-menu.md.

### Documents — Unified DocumentLayout (Protected)

| Method | Endpoint                              | Description                        |
|--------|---------------------------------------|------------------------------------|
| GET    | `/api/procurement/documents/:docType` | Procurement document list (`SPA`/`SRA`/`SRB`/`SIR`) |
| GET    | `/api/procurement/document/:docNo`    | Procurement document detail (header + lines) |
| GET    | `/api/procurement/next-number/:docType` | Next document number (`PREFIX + YYMM + running no.`) |
| GET    | `/api/procurement/summary/:docType`   | Document count / total value summary |
| PUT    | `/api/procurement/document/:docNo`    | Update header fields — ⚠️ writes `DocuDate`, `VendorCode`, `CurrCode`, `ExchRate`, plus `DueDate`/`BuyName` (SPA) and `RefDocuNo` (SRA/SRB/SIR); the read-only policy allows only `BuyName`/`RefDocuNo` |
| GET    | `/api/requisition/documents/:docType` | Requisition document list (`SOA`/`SIA`/`SIB`/`SIP`/`SIS`) |
| GET    | `/api/requisition/document/:docuNo`   | Requisition document detail        |
| GET    | `/api/requisition/next-number/:docType` | Next document number (read without NOLOCK) |
| GET    | `/api/requisition/order/:ordNo`       | Order lookup used to prepare SOA / issue documents |
| GET    | `/api/sample/documents/:docType`      | Sample room document list (`SSA`/`SIM`) |
| GET    | `/api/sample/document/:docuNo`        | Sample room document detail (header + lines) |
| POST   | `/api/lock/acquire`                   | Acquire document edit lock (in-memory, auto-release after 15 min) |
| POST   | `/api/lock/release`                   | Release document edit lock         |
| GET    | `/api/lock/status/:docNo`             | Check document lock status         |

Routers: `procurementReceiving.js`, `orderLinesIssues.js`, `sampleDepartment.js` (all `requireRole('admin')`), and `lock.js` (any signed-in user).

### Photo Bridge (Network File Server → HTTP)

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/api/photos/ps/:itemNo`    | PS Photo (Cost) from `\\<FILE_SERVER>\Photo\Cost` |
| GET    | `/api/photos/cad/:itemNo`   | CAD Photo from `\\<FILE_SERVER>\Photo\Mold(CAD)` |
| GET    | `/api/photos/:itemNo`       | Legacy endpoint (backwards compatibility) |

### Search & System

| Method | Endpoint       | Description               |
|--------|----------------|---------------------------|
| GET    | `/api/search`  | Global search             |
| GET    | `/api/health`  | Health check (API + DB)   |

### Environment Setup

```bash
# 1. Clone repository
git clone <repo-url>

# 2. Frontend setup
cd "Jewelry Factory System/frontend"
npm install

# 3. Backend setup
cd "../backend"
npm install
cp .env.example .env
# Configure .env with actual credentials (DB_HOST, DB_USER, DB_PASS, DB_NAME)

# 4. Run both concurrently (using 2 separate terminals)
# Terminal 1: Backend
cd "Jewelry Factory System/backend"
npm run dev

# Terminal 2: Frontend
cd "Jewelry Factory System/frontend"
npm run dev
```

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

> ⚠️ Never commit actual `.env` files — use `.env.example` as the distribution template.

## Development Workflow

### Day-to-Day Development

1. **Open 2 terminals** — Backend (`npm run dev`) + Frontend (`npm run dev`).
2. **Vite Dev Server** (port 3000) automatically proxies `/api/*` to Backend (port 3001).
3. **Hot Reload**: Frontend supports HMR; Backend automatically restarts with nodemon.
4. **Test API**: Inspect with browser DevTools Network tab or direct `curl` requests to `:3001`.
### Theme Development

1. Theme variables declared in `src/index.css` → `@theme { ... }` block.
2. Theme overrides defined in `@layer base` → `.theme-<name> { ... }`.
3. Toggle themes via `ThemeContext` → `useTheme()` hook.
4. All components must reference theme tokens — hardcoded color values are strictly prohibited.
