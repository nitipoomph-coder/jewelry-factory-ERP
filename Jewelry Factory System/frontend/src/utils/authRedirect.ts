// src/utils/authRedirect.ts
//
// Single source of truth for authentication-related navigation:
// - Role-based home page and per-user landing page (where "/" and a successful login land)
// - Route access check: menuConfig `roles` + per-user menu permissions (`allowedMenus`)
// - Safe "return to" handling after login (prevents open redirects)
//
// NOTE: This guard is UX only (allowedMenus lives in browser storage). Real enforcement
// happens in the backend `requireMenu` middleware for APIs owned by a single page.

import { menuConfig } from '../config/menuConfig';

export const LOGIN_PATH = '/login';
export const RETURN_TO_PARAM = 'returnTo';
export const NO_ACCESS_PATH = '/no-access';
export const ALLOWED_MENUS_STORAGE_KEY = 'auth_allowed_menus';

export const FACTORY_OVERVIEW_PATH = '/dashboard/overview';
export const SALES_HOME_PATH = '/dashboard/customer';

/** Detail pages that are not menu entries but belong to one (path → owning menu ids). */
const DETAIL_ROUTE_OWNERS: { path: string; ids: string[] }[] = [
  { path: '/dashboard/detail', ids: ['home'] },
];

const MAX_RETURN_TO_LENGTH = 2048;

/** Home page for a role. Admin lands on Factory Overview; every other role lands on Sales Summary. */
export function getHomePathForRole(role: string | null | undefined): string {
  return (role || '').toLowerCase() === 'admin' ? FACTORY_OVERVIEW_PATH : SALES_HOME_PATH;
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

function isPathMatch(menuPath: string, pathname: string): boolean {
  const target = normalizePath(menuPath);
  return target === '/' ? pathname === '/' : (pathname === target || pathname.startsWith(target + '/'));
}

/** Checks the menuConfig `roles` (group → item → sub-item inheritance) for a pathname. */
export function isRouteAllowedForRole(pathname: string, role: string): boolean {
  const normalizedRole = (role || '').toLowerCase();
  const normalizedPath = normalizePath(pathname);

  for (const group of menuConfig) {
    if (group.path && isPathMatch(group.path, normalizedPath)) {
      if (group.roles && !group.roles.includes(normalizedRole)) {
        return false;
      }
    }

    if (group.items) {
      for (const item of group.items) {
        if (item.path && isPathMatch(item.path, normalizedPath)) {
          const effectiveRoles = item.roles || group.roles;
          if (effectiveRoles && !effectiveRoles.includes(normalizedRole)) {
            return false;
          }
        }
        if (item.items) {
          for (const subItem of item.items) {
            if (subItem.path && isPathMatch(subItem.path, normalizedPath)) {
              const effectiveRoles = subItem.roles || item.roles || group.roles;
              if (effectiveRoles && !effectiveRoles.includes(normalizedRole)) {
                return false;
              }
            }
          }
        }
      }
    }
  }

  return true;
}

/** Removes every auth value saved at login (logout, expired token, IP ban). */
export function clearStoredAuth(): void {
  for (const key of ['auth_token', 'auth_role', 'auth_user', ALLOWED_MENUS_STORAGE_KEY]) {
    localStorage.removeItem(key);
  }
}

/**
 * Per-user menu permissions saved at login. `null` means "no restriction"
 * (same rule as Sidebar); `['*']` means every menu.
 */
export function getStoredAllowedMenus(): string[] | null {
  try {
    const raw = localStorage.getItem(ALLOWED_MENUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : null;
  } catch {
    return null;
  }
}

interface MenuRouteEntry {
  path: string;
  /** The entry's own id followed by its ancestors' ids (permission on a group grants its children). */
  ids: string[];
}

function getMenuRouteEntries(): MenuRouteEntry[] {
  const entries: MenuRouteEntry[] = [];
  for (const group of menuConfig) {
    if (group.path) entries.push({ path: group.path, ids: [group.id] });
    for (const item of group.items || []) {
      if (item.path) entries.push({ path: item.path, ids: [item.id, group.id] });
      for (const subItem of item.items || []) {
        if (subItem.path) entries.push({ path: subItem.path, ids: [subItem.id, item.id, group.id] });
      }
    }
  }
  return [...entries, ...DETAIL_ROUTE_OWNERS];
}

/**
 * Checks per-user menu permissions for a pathname, using the most specific menu path that matches.
 * Mirrors Sidebar: allowed when unrestricted, `*`, or the entry id / any ancestor id is granted.
 * Routes that belong to no menu entry are not restricted here.
 */
export function isRouteAllowedForMenus(pathname: string, allowedMenus: string[] | null): boolean {
  if (!allowedMenus || allowedMenus.includes('*')) return true;
  const normalizedPath = normalizePath(pathname);

  let best: MenuRouteEntry | null = null;
  for (const entry of getMenuRouteEntries()) {
    if (isPathMatch(entry.path, normalizedPath) && (!best || normalizePath(entry.path).length > normalizePath(best.path).length)) {
      best = entry;
    }
  }
  if (!best) return true;
  return best.ids.some(id => allowedMenus.includes(id));
}

/** Full access check for a route: role (menuConfig `roles`) AND per-user menu permissions. */
export function canAccessRoute(pathname: string, role: string, allowedMenus: string[] | null): boolean {
  return isRouteAllowedForRole(pathname, role) && isRouteAllowedForMenus(pathname, allowedMenus);
}

/**
 * Landing page for a signed-in user: the role home when permitted, otherwise the first
 * permitted menu page (menuConfig order), otherwise the "no access" page.
 */
export function getLandingPath(role: string, allowedMenus: string[] | null): string {
  const roleHome = getHomePathForRole(role);
  if (canAccessRoute(roleHome, role, allowedMenus)) return roleHome;

  const firstAllowed = getMenuRouteEntries().find(entry =>
    !DETAIL_ROUTE_OWNERS.includes(entry) && canAccessRoute(entry.path, role, allowedMenus)
  );
  return firstAllowed ? firstAllowed.path : NO_ACCESS_PATH;
}

/**
 * Accepts only same-origin, in-app paths (e.g. "/po-tracker/po/123?tab=1").
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com"), backslash tricks,
 * control characters, the login page itself, and the root "/" (handled by role home).
 * Returns the normalized path or null.
 */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value || value.length > MAX_RETURN_TO_LENGTH) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;

  let parsed: URL;
  try {
    parsed = new URL(value, window.location.origin);
  } catch {
    return null;
  }
  if (parsed.origin !== window.location.origin) return null;

  const pathname = normalizePath(parsed.pathname);
  if (pathname === '/' || pathname === LOGIN_PATH || pathname === NO_ACCESS_PATH) return null;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/** Login URL that remembers where the user was going. */
export function buildLoginPath(currentPath: string | null | undefined): string {
  const returnTo = sanitizeReturnTo(currentPath);
  return returnTo ? `${LOGIN_PATH}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}` : LOGIN_PATH;
}

/** Where to send a user after login: the requested page if safe and permitted, otherwise the landing page. */
export function resolvePostLoginPath(
  role: string,
  allowedMenus: string[] | null,
  rawReturnTo: string | null | undefined,
): string {
  const returnTo = sanitizeReturnTo(rawReturnTo);
  if (returnTo) {
    const pathname = returnTo.split(/[?#]/)[0];
    if (canAccessRoute(pathname, role, allowedMenus)) {
      return returnTo;
    }
  }
  return getLandingPath(role, allowedMenus);
}
