# Routing and Menu Permissions

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## 2026-11-09 Routing: Role Home & Login Return Path

### URL Map
- `/login` — Login page. Already-authenticated users are redirected into the app (`returnTo` honored).
- `/` — **No page of its own.** Redirects to the user's landing page (`RoleHomeRedirect` → `getLandingPath`). Generic "go home" buttons (Topbar logo, DocumentLayout Close, workspace switch) keep using `navigate('/')`.
- `/dashboard/overview` — Factory Overview (`Dashboard.tsx`, admin only). Menu id stays `home`, so stored per-user menu permissions are unaffected.

### Single Source of Truth — `src/utils/authRedirect.ts`
- `getHomePathForRole(role)`: admin → `/dashboard/overview`; every other role → `/dashboard/customer`.
- `isRouteAllowedForRole(pathname, role)`: menuConfig `roles` check (moved out of `App.tsx`, logic unchanged).
- `sanitizeReturnTo(value)`: accepts same-origin in-app paths only; rejects `//host`, absolute URLs, backslashes, control characters, `/`, and `/login` (open-redirect protection).
- `buildLoginPath(currentPath)` → `/login?returnTo=<encoded path>`.
- `resolvePostLoginPath(role, returnTo)`: the requested page when safe **and** permitted for the role, otherwise the role home.

### Flows
- Unauthenticated deep link → `ProtectedRoute` → `/login?returnTo=...` → after login, returns to the requested page.
- API 401 (expired token) → `fetchWithAuth` → `/login?returnTo=<current page>`. IP ban (403) and manual logout go to plain `/login`.
- Route not permitted for the role → role home (previously always `/dashboard/customer`).

### Known Gaps
- ~~Per-user `allowedMenus` did not block direct URL access~~ → resolved, see "2026-11-09 Menu Permission Enforcement".
- ~~401 handler did not clear `auth_allowed_menus`~~ → resolved (`clearStoredAuth()`).

## 2026-11-09 Menu Permission Enforcement

### Rule (same as Sidebar)
A user may open a page when their `allowedMenus` is unrestricted (`null`), contains `*`, or contains the page's **menu item id or its group id** (a group permission grants every child). Per-user permissions come from `backend/services/permissionService.js` (`backend/data/user_menu_permissions.json`, gitignored). Sales permissions include the Production group (`order-tracker`) and `po-tracker` — sales access to PO Tracker is intentional.

**Web access is granted per account**: every `PCCUser` account can pass the password check, but only an account listed in the permissions file with at least one menu has web access (`permissionService.hasWebAccess`). Unlisted accounts get no menus (no role defaults). Login with valid credentials but no access → **403** `NO_WEB_ACCESS` ("This account does not have access to the web system. Please contact the administrator."), audit `LOGIN_DENIED`, not counted toward the IP ban. `authMiddleware` checks the same rule on every API call, so a token of an account whose access was removed gets **401**. To grant access, tick at least one menu for the account in the admin permission editor.

**Sidebar-only shortcuts (`sidebarRoles`)**: a menu item with `sidebarRoles` is shown in the Sidebar only to those roles and changes no access. It is left out of `permissionMenuConfig` (`config/menuConfig.ts`), which route guards (`authRedirect.ts`) and the permission editor (`MenuPermissionsModal`, `UserAccessDrawer`) use. Current shortcut (admin): Order List under Sales Analytics.

### Frontend (UX guard) — `src/utils/authRedirect.ts`
- `canAccessRoute(pathname, role, allowedMenus)` = menuConfig `roles` **and** `isRouteAllowedForMenus` (most specific matching menu path wins; detail routes mapped via `DETAIL_ROUTE_OWNERS`, e.g. `/dashboard/detail` → `home`; routes owned by no menu are not restricted).
- `getLandingPath(role, allowedMenus)`: role home if permitted → else first permitted menu (menuConfig order) → else `/no-access` (`NoAccessPage.tsx`). Used by `/`, `ProtectedRoute` denials, and post-login fallback.
- `clearStoredAuth()` removes `auth_token`, `auth_role`, `auth_user`, `auth_allowed_menus` (logout, 401, IP ban).
- Permission changes made by an admin apply to the web UI at the user's next login.

### Backend (real enforcement) — `middleware/authMiddleware.js` + `middleware/apiMenuRules.js`
- `requireMenu(menuIds, { exceptPaths })` for page-owned APIs; `requireMenuByPath(rules, label)` for shared prefixes (first matching rule wins, `menus: null` = any signed-in user, **unmatched path = denied**); `hasMenu(user, menuIds)` for in-route checks.
- The API → menu map lives in `middleware/apiMenuRules.js` (ids must match `menuConfig.ts`).

| API | Required menu (item or group) | Notes |
|-----|-------------------------------|-------|
| `/api/orders` | `po-tracker` / `order-tracker` | — |
| `/api/order-tracking` | `fbe-order-track` / `order-tracker` | also `requireRole('admin','sales')` |
| `/api/production-summary` | `pro-sum` / `order-tracker` | `/holidays` open (shared with CCTV Report) |
| `/api/production-forecast` | `pro-forecast` / `order-tracker` | — |
| `/api/dashboard/years` | any signed-in user | year list metadata |
| `/api/dashboard` (`/`), `/detail/:cardType` | `home` | Factory Overview |
| `/api/dashboard/customer-summary` | `dash-cust` / `dash-matrix` / `sales-dashboard` | Sales Summary + Customer Report Matrix |
| `/api/dashboard/sales-orders` | `dash-cust` / `sales-dashboard` | Order List (`/dashboard/sales-customer-detail` web route mapped the same) |
| `/api/items/*` | `dash-top-orders` / `dash-top-orders-analytics` / `sales-dashboard` | Top Item Gallery + Top Items Qty |
| `/api/search` | any signed-in user | PO / Order / Customer results only searched and returned for users with `po-tracker` / `order-tracker`; Item results for everyone |

- Denied → `403 { ok: false, error: 'Forbidden: You do not have access to this page' }`. Reads permissions live, so changes apply to APIs immediately.
- When adding an endpoint: page-owned → `requireMenu` with the page's item id + group id; under `/api/dashboard` → add a rule to `DASHBOARD_MENU_RULES` (otherwise it is denied).
