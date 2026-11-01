/**
 * Centralized Breadcrumb Configuration
 * 
 * Provides type-safe, centralized breadcrumbs across all modules in the application.
 * Module names and paths are standardized here to avoid redundant branding or inconsistent hierarchies.
 */

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

const CUSTOMER_TAB_LABELS: Record<string, string> = {
  matrix: 'Customer Report Matrix',
  trends: 'Order Trends',
  dashboard: 'Sales Summary',
};

export const BREADCRUMBS = {
  // ── Overview & Dashboard ──
  DASHBOARD: [
    { label: 'Overview' },
    { label: 'Factory Overview' },
  ],

  DASHBOARD_DETAIL: (metricTitle: string): BreadcrumbItem[] => [
    { label: 'Factory Overview', path: '/' },
    { label: metricTitle },
  ],

  // ── Sales Analytics ──
  TOP_ORDERS_GALLERY: [
    { label: 'Sales Analytics' },
    { label: 'Top Item Gallery' },
  ],

  SALES_CUSTOMER_GROUP_DETAIL: [
    { label: 'Sales Analytics' },
    { label: 'Order Trends', path: '/dashboard/customer/trends' },
    { label: 'Order List' },
  ],

  CUSTOMER_DASHBOARD_TAB: (activeTab: string): BreadcrumbItem[] => [
    { label: 'Sales Analytics' },
    { label: CUSTOMER_TAB_LABELS[activeTab] ?? CUSTOMER_TAB_LABELS.dashboard },
  ],

  // ── Production & Orders ──
  PRODUCTION_SUMMARY: [
    { label: 'Production' },
    { label: 'Production Summary' },
  ],

  PRODUCTION_FORECAST: [
    { label: 'Production' },
    { label: 'Production Forecast' },
  ],

  PO_TRACKER: [
    { label: 'Production' },
    { label: 'PO Tracker' },
  ],

  FBE_ORDER_TRACK: [
    { label: 'Production' },
    { label: 'FBE Order Tracker' },
  ],

  ORDER_DETAIL: (pageTitle: string): BreadcrumbItem[] => [
    { label: 'Production' },
    { label: 'PO Tracker', path: '/po-tracker' },
    { label: pageTitle },
  ],

  ITEM_DETAIL: (itemNo: string): BreadcrumbItem[] => [
    { label: 'Production' },
    { label: 'PO Tracker', path: '/po-tracker' },
    { label: itemNo },
  ],

  // ── Subcontract Management ──
  VENDOR_PERFORMANCE: [
    { label: 'Subcontract Management' },
    { label: 'Vendor Performance Dashboard' },
  ],

  // ── Documents (Procurement, Requisition, Sample) ──
  DOCUMENT: (groupLabel: string, itemLabel: string, docType: string): BreadcrumbItem[] => [
    { label: groupLabel },
    { label: `${itemLabel} (${docType})` },
  ],

  // ── Dynamic Placeholder Pages ──
  PLACEHOLDER: (groupLabel: string, displayTitle: string): BreadcrumbItem[] => [
    { label: groupLabel },
    { label: displayTitle },
  ],
} satisfies Record<string, BreadcrumbItem[] | ((...args: string[]) => BreadcrumbItem[])>;
