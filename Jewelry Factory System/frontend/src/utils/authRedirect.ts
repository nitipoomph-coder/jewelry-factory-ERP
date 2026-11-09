// src/utils/authRedirect.ts
//
// Single source of truth for authentication-related navigation:
// - Role-based home page (where "/" and a successful login land)
// - Role-based route permission check (menuConfig `roles`)
// - Safe "return to" handling after login (prevents open redirects)

import { menuConfig } from '../config/menuConfig';

export const LOGIN_PATH = '/login';
export const RETURN_TO_PARAM = 'returnTo';

export const FACTORY_OVERVIEW_PATH = '/dashboard/overview';
export const SALES_HOME_PATH = '/dashboard/customer';

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
  if (pathname === '/' || pathname === LOGIN_PATH) return null;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/** Login URL that remembers where the user was going. */
export function buildLoginPath(currentPath: string | null | undefined): string {
  const returnTo = sanitizeReturnTo(currentPath);
  return returnTo ? `${LOGIN_PATH}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}` : LOGIN_PATH;
}

/** Where to send a user after login: the requested page if safe and permitted, otherwise the role home. */
export function resolvePostLoginPath(role: string, rawReturnTo: string | null | undefined): string {
  const returnTo = sanitizeReturnTo(rawReturnTo);
  if (returnTo) {
    const pathname = returnTo.split(/[?#]/)[0];
    if (isRouteAllowedForRole(pathname, role)) {
      return returnTo;
    }
  }
  return getHomePathForRole(role);
}
