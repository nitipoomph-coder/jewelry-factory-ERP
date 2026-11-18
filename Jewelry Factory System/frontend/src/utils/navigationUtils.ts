import type { NavMenuGroup, NavMenuItem } from '../types';
import { FACTORY_OVERVIEW_PATH } from './authRedirect';

export function isNavigationPathActive(
  itemPath: string | undefined,
  pathname: string,
  search: string = ''
): boolean {
  if (!itemPath) return false;
  if (pathname === itemPath) return true;

  // 1. Home / Factory Overview (and its Metric Detail drill-down)
  if (itemPath === FACTORY_OVERVIEW_PATH) {
    return pathname === FACTORY_OVERVIEW_PATH || pathname === '/dashboard/detail';
  }

  // 2. Sales Summary
  if (itemPath === '/dashboard/customer') {
    return (
      (pathname === '/dashboard/customer' && !pathname.startsWith('/dashboard/customer/')) ||
      pathname === '/dashboard/sales' ||
      pathname === '/dashboard/qty' ||
      (pathname === '/dashboard/customer-report' && new URLSearchParams(search).get('metric') !== 'qty')
    );
  }

  // 3. Customer Matrix
  if (itemPath === '/dashboard/customer/matrix') {
    return pathname === '/dashboard/customer/matrix';
  }

  // 4. Top Item Gallery
  if (itemPath === '/dashboard/top-orders') {
    return (
      pathname === '/dashboard/top-orders' ||
      pathname === '/dashboard/top-Orders' ||
      pathname === '/dashboard/top-order-lines' ||
      pathname === '/dashboard/Top-Order Lines'
    );
  }

  // 5. Top Items Qty
  if (itemPath === '/dashboard/top-orders/analytics') {
    return pathname === '/dashboard/top-orders/analytics';
  }

  // 6. PO Tracker & details
  if (itemPath === '/po-tracker') {
    return (
      pathname === '/po-tracker' ||
      pathname.startsWith('/po-tracker/') ||
      pathname.startsWith('/item-detail/')
    );
  }

  return false;
}

export function isNavigationItemActive(
  item: NavMenuItem,
  pathname: string,
  search: string = ''
): boolean {
  if (isNavigationPathActive(item.path, pathname, search)) return true;
  if (item.items && item.items.length > 0) {
    return item.items.some(child => isNavigationItemActive(child, pathname, search));
  }
  return false;
}

export function isNavigationGroupActive(
  group: NavMenuGroup,
  pathname: string,
  search: string = ''
): boolean {
  if (group.path && isNavigationPathActive(group.path, pathname, search)) return true;
  if (group.items && group.items.length > 0) {
    return group.items.some(item => isNavigationItemActive(item, pathname, search));
  }
  return false;
}

export function getActiveGroupId(
  groups: NavMenuGroup[],
  pathname: string,
  search: string = ''
): string | null {
  const found = groups.find(group => isNavigationGroupActive(group, pathname, search));
  return found ? found.id : null;
}
