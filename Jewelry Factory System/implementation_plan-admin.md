# Implementation Plan: Admin User Management & Session Tracking

This document outlines the architecture and steps to implement the requested Phase 1 - 6 for the Admin User Management system. This involves upgrading the authentication flow to support stateless session tracking (via JWT `jti`), building admin dashboards, and securing the system against brute-force attacks.

## User Review Required
> [!IMPORTANT]
> **Authentication Fallback Strategy**: Currently, the system uses a legacy `PCCUser` table (with plaintext passwords) alongside a newer `system_users` table (with hashed passwords). 
> **Decision needed**: Should the new login flow *only* authenticate against `system_users` (forcing admins to recreate users in the new system), or should it attempt to find the user in `system_users` first, and fallback to `PCCUser` if not found? 
> *(Recommendation: Fallback to `PCCUser` during a transition period, but all new Admin user management actions will only affect `system_users`)*

> [!WARNING]
> **In-Memory Cache for Session Revocation**: The plan proposes using an in-memory cache in `authMiddleware.js` to avoid querying the DB on every single API request. If you are running multiple Node.js instances (e.g., via PM2 cluster mode), in-memory caches will not sync across instances. Let me know if you are using a cluster, otherwise, an in-memory cache is perfect.

## Proposed Changes

### Database Schema (SQL Server)
We will create a new SQL migration script to add the necessary tables and columns:

#### [NEW] `sql/migrations/xxx_admin_user_management.sql`
- **Modify `system_users`**: Add columns `is_active` (BIT, default 1), `must_change_password` (BIT, default 0), `failed_logins` (INT, default 0), `locked_until` (DATETIME).
- **Create `user_sessions` table**: 
  - `jti` (VARCHAR(36), PK)
  - `user_id` (INT)
  - `issued_at` (DATETIME)
  - `expires_at` (DATETIME)
  - `ip_address` (VARCHAR(45))
  - `user_agent` (VARCHAR(255))
  - `revoked_at` (DATETIME, NULL)
- **Create `audit_logs` table**:
  - `id` (INT, PK, IDENTITY)
  - `admin_id` (INT)
  - `target_user_id` (INT)
  - `action` (VARCHAR(50))
  - `action_date` (DATETIME)
  - `ip_address` (VARCHAR(45))
  - `details` (NVARCHAR(MAX))

---

### Backend (Node.js / Express)

#### [MODIFY] `backend/routes/auth.js`
- **Login Endpoint**: 
  - Add brute-force check: Block login if `locked_until` > now.
  - On failed login: Increment `failed_logins`. If >= N (e.g., 5), set `locked_until`.
  - On successful login: Reset `failed_logins`.
  - Generate a `uuid` for `jti` and embed it in the JWT payload.
  - Insert session record into `user_sessions`.
  - If `must_change_password` is true, force the user to change it on the next screen.

#### [MODIFY] `backend/middleware/authMiddleware.js`
- **Revocation Check**: Extract `jti` and `userId` from the JWT.
- **In-Memory Cache**: Check an in-memory cache (TTL 5 mins) to see if the `jti` is valid. If not in cache, query `user_sessions` and `system_users.is_active`, then cache the result. 
- If `revoked_at` is set or `is_active` is false, reject with 401 Unauthorized.

#### [NEW] `backend/routes/adminUsers.js`
Create a new router for Phase 1, 3, and 4 requirements:
- `GET /users`: List all users with filtering.
- `POST /users`: Create new user (hashes password).
- `PUT /users/:id`: Edit user details, role.
- `POST /users/:id/reset-password`: Admin resets password (sets `must_change_password = 1`, auto-revokes active sessions).
- `POST /users/:id/deactivate`: Toggles `is_active`, auto-revokes all active sessions.
- `DELETE /users/:id`: Hard delete user (requires secondary confirmation).
- `GET /sessions`: List active sessions (`revoked_at IS NULL AND expires_at > GETDATE()`).
- `POST /sessions/:jti/kill`: Set `revoked_at = GETDATE()` and clear document locks for that session.
- `GET /audit`: List audit logs.

#### [MODIFY] `backend/routes/lock.js`
- Add a helper function `releaseLocksBySession(userId, jti)` to release any pending document locks when a session is killed (Phase 6).

---

### Frontend (React / TypeScript)

#### [MODIFY] `frontend/src/config/menuConfig.ts`
- Add an "Admin" group (only visible to users with `role === 'admin'`).
- Submenus: "User Management", "Active Sessions", "Audit Logs".

#### [NEW] `frontend/src/pages/admin/UserManagementPage.tsx`
- Phase 1 UI: Table displaying users with Search and Role/Status filters.
- Modals for "Create User", "Edit User", and "Confirm Delete / Deactivate".

#### [NEW] `frontend/src/pages/admin/ActiveSessionsPage.tsx`
- Phase 3 UI: Dashboard showing currently active sessions (Username, Role, IP, Login Time).
- "Kill Session" button per row.

#### [NEW] `frontend/src/pages/admin/AuditLogsPage.tsx`
- Phase 4 UI: Data table displaying the who, whom, what, and when for all admin actions.

### Design Aesthetics & UI Experience
The new Admin pages will be built using a **Premium & Dynamic Design** approach, significantly elevating the look and feel while remaining cohesive with your system:
- **Vibrant & Harmonious Color Palettes**: Using curated HSL colors to differentiate Status (Active/Inactive), Roles, and destructive actions (Kill Session, Delete User).
- **Glassmorphism & Shadows**: Elevated cards and modals using subtle blurs and modern shadow layering.
- **Micro-Animations**: Smooth hover effects on buttons, rows, and transitions when modals open/close.
- **Modern Typography**: High-readability fonts with clear hierarchies, making data-dense tables (like Audit Logs and Active Sessions) clean and easy to scan.
- **Dynamic Interaction**: Loading states, skeleton screens, and toast notifications will provide a fluid, alive user experience.

## Verification Plan
1. **Login & Session Issuance**: Verify that logging in creates a `user_sessions` entry and embeds `jti` in the JWT.
2. **Session Revocation**: Verify that manually killing a session immediately causes a 401 response on the next API call using that token.
3. **Deactivation**: Verify that deactivating a user instantly revokes all their active sessions.
4. **Brute Force**: Attempt to login with bad passwords 5 times and verify the account locks out.
5. **Audit Logging**: Ensure actions like "Create User" and "Kill Session" write correct rows to `audit_logs`.
