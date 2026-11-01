import React, { createContext, useContext, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { BreadcrumbItem } from '../config/breadcrumbs';
import { menuConfig } from '../config/menuConfig';

interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  parentBreadcrumbs: BreadcrumbItem[];
  effectiveBreadcrumbs: BreadcrumbItem[];
}

function getFallbackBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === '/') {
    return [{ label: 'Overview' }, { label: 'Factory Overview' }];
  }
  if (pathname === '/dashboard/detail') {
    return [{ label: 'Overview' }, { label: 'Factory Overview', path: '/' }, { label: 'Metric Detail' }];
  }
  if (pathname.startsWith('/dashboard/sales-customer-detail')) {
    return [
      { label: 'Sales Analytics' },
      { label: 'Order Trends', path: '/dashboard/customer/trends' },
      { label: 'Order List' },
    ];
  }
  if (pathname === '/dashboard/customer' || pathname === '/dashboard/customer/' || pathname === '/dashboard/sales') {
    return [{ label: 'Sales Analytics' }, { label: 'Sales Summary' }];
  }
  if (pathname === '/dashboard/customer/matrix' || pathname === '/dashboard/customer-report') {
    return [{ label: 'Sales Analytics' }, { label: 'Customer Report Matrix' }];
  }
  if (pathname === '/dashboard/customer/trends' || pathname === '/dashboard/customer-trends') {
    return [{ label: 'Sales Analytics' }, { label: 'Order Trends' }];
  }
  if (pathname === '/dashboard/top-orders') {
    return [{ label: 'Sales Analytics' }, { label: 'Top Item Gallery' }];
  }
  if (pathname === '/dashboard/top-orders/analytics' || pathname.startsWith('/dashboard/qty')) {
    return [{ label: 'Sales Analytics' }, { label: 'Top Items Qty' }];
  }
  if (pathname.startsWith('/po-tracker/') && pathname !== '/po-tracker') {
    return [
      { label: 'Production' },
      { label: 'PO Tracker', path: '/po-tracker' },
      { label: 'Order Detail' },
    ];
  }
  if (pathname.startsWith('/item-detail')) {
    return [
      { label: 'Production' },
      { label: 'PO Tracker', path: '/po-tracker' },
      { label: 'Item Detail' },
    ];
  }
  if (pathname === '/po-tracker') {
    return [{ label: 'Production' }, { label: 'PO Tracker' }];
  }
  if (pathname === '/dashboard/production-summary') {
    return [{ label: 'Production' }, { label: 'Production Summary' }];
  }
  if (pathname === '/dashboard/production-forecast') {
    return [{ label: 'Production' }, { label: 'Production Forecast' }];
  }
  if (pathname === '/dashboard/fbe-order-track') {
    return [{ label: 'Production' }, { label: 'FBE Order Tracker' }];
  }
  if (pathname === '/subcontract/vendor-performance') {
    return [{ label: 'Subcontract Management' }, { label: 'Vendor Performance Dashboard' }];
  }

  // Check menuConfig for matching path
  for (const group of menuConfig) {
    if (group.path === pathname) {
      return [{ label: 'Overview' }, { label: group.label }];
    }
    const found = (group.items || []).find(item => item.path === pathname);
    if (found) {
      return [{ label: group.label }, { label: found.label }];
    }
  }

  // Category fallbacks
  if (pathname.startsWith('/subcontract')) return [{ label: 'Subcontract Management' }];
  if (pathname.startsWith('/procurement')) return [{ label: 'Procurement & Receiving' }];
  if (pathname.startsWith('/orders')) return [{ label: 'Order Lines & Issues' }];
  if (pathname.startsWith('/sample')) return [{ label: 'Sample Department' }];
  if (pathname.startsWith('/inventory')) return [{ label: 'Inventory Control' }];
  if (pathname.startsWith('/spare-parts')) return [{ label: 'Spare Parts' }];
  if (pathname.startsWith('/dashboard/production')) return [{ label: 'Production' }];
  if (pathname.startsWith('/dashboard')) return [{ label: 'Sales Analytics' }];

  return [];
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  breadcrumbs: [],
  setBreadcrumbs: () => {},
  parentBreadcrumbs: [],
  effectiveBreadcrumbs: [],
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const location = useLocation();

  // Reset breadcrumbs on route change so stale page breadcrumb isn't shown
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setBreadcrumbs([]);
  }

  const effectiveBreadcrumbs = useMemo(() => {
    return breadcrumbs.length > 0 ? breadcrumbs : getFallbackBreadcrumbs(location.pathname);
  }, [breadcrumbs, location.pathname]);

  const parentBreadcrumbs = useMemo(() => {
    return effectiveBreadcrumbs.length > 1 ? effectiveBreadcrumbs.slice(0, -1) : [];
  }, [effectiveBreadcrumbs]);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs, parentBreadcrumbs, effectiveBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbContext);
}
