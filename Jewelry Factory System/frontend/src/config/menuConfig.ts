import type { NavMenuGroup } from '../types';

export const menuConfig: NavMenuGroup[] = [
  // ── Overview (PCC) ──
  {
    id: 'home',
    label: 'Factory Overview',
    icon: 'home',
    path: '/',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin'],
    section: 'Overview',
    workspace: 'PCC',
  },
  {
    id: 'sales-dashboard',
    label: 'Sales Analytics',
    icon: 'trending-up',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin', 'sales'],
    section: 'Overview',
    workspace: 'PCC',
    items: [
      { id: 'dash-cust', label: 'Sales Summary', path: '/dashboard/customer' },
      { id: 'dash-matrix', label: 'Customer Report Matrix', path: '/dashboard/customer/matrix' },
      /* { id: 'dash-order-trends', label: 'Order Trends', path: '/dashboard/customer/trends' },*/
      { id: 'dash-top-orders', label: 'Top Item Gallery', path: '/dashboard/top-orders' },
      { id: 'dash-top-orders-analytics', label: 'Top Items Qty', path: '/dashboard/top-orders/analytics' },
    ],
  },

  // ── Production (PCC) ──
  {
    id: 'order-tracker',
    label: 'Production',
    icon: 'layout-list',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin', 'sales'],
    section: 'Production',
    workspace: 'PCC',
    items: [
      { id: 'po-tracker', label: 'PO Tracker', path: '/po-tracker' },
      { id: 'pro-sum', label: 'Production Summary', path: '/dashboard/production-summary' },
      { id: 'pro-forecast', label: 'Production Forecast', path: '/dashboard/production-forecast' },
      { id: 'fbe-order-track', label: 'FBE Order Tracker', path: '/dashboard/fbe-order-track' },
    ],
  },
  {
    id: 'subcontract',
    label: 'Subcontract Management',
    icon: 'handshake',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin'],
    section: 'Production',
    workspace: 'PCC',
    items: [
      { id: 'sub-vendor-performance', label: 'Vendor Performance Dashboard', path: '/subcontract/vendor-performance', roles: ['admin'] },
      { id: 'sub-vendor-price', label: 'Vendor Price History', path: '/subcontract/vendor-price-history' },
      { id: 'sub-aging', label: 'Aging Report', path: '/subcontract/aging-report' },
    ],
  },

  // ── Stone & Gem Procurement (Inventory Management System) ──
  {
    id: 'procurement',
    label: 'Procurement & Receiving',
    icon: 'package-check',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin'],
    section: 'Stone System',
    workspace: 'INVENTORY',
    items: [
      { id: 'spa', label: 'Gem Purchase Order', code: 'SPA', path: '/procurement/purchase' },
      { id: 'sra', label: 'Gem Receipt', code: 'SRA', path: '/procurement/receive' },
      { id: 'srb', label: 'Gem Receipt B', code: 'SRB', path: '/procurement/receive-b' },
      { id: 'sir', label: 'Gem Return', code: 'SIR', path: '/procurement/return' },
    ],
  },
  {
    id: 'orders',
    label: 'Order Lines & Issues',
    icon: 'clipboard-list',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin'],
    section: 'Stone System',
    workspace: 'INVENTORY',
    items: [
      { id: 'soa', label: 'Gem Order', code: 'SOA', path: '/orders/create' },
      { id: 'sia', label: 'Gem Issue', code: 'SIA', path: '/orders/issue' },
      { id: 'sib', label: 'Gem Issue (Type B)', code: 'SIB', path: '/orders/issue-b' },
      { id: 'sip', label: 'Gem Issue for Repair', code: 'SIP', path: '/orders/repair' },
      { id: 'sis', label: 'Gem Dispatch for Order', code: 'SIS', path: '/orders/dispatch-order' },
    ],
  },
  {
    id: 'sample',
    label: 'Sample Department',
    icon: 'flask-conical',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin'],
    section: 'Stone System',
    workspace: 'INVENTORY',
    items: [
      { id: 'ssa', label: 'Sample Request', code: 'SSA', path: '/sample/order' },
      { id: 'sim', label: 'Sample Dispatch', code: 'SIM', path: '/sample/dispatch' },
    ],
  },

  // ── Warehouse and Stock (Inventory Management System) ──
  {
    id: 'inventory',
    label: 'Inventory Control',
    icon: 'bar-chart-3',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin'],
    section: 'Stock & Warehouse',
    workspace: 'INVENTORY',
    items: [
      { id: 'check-dispatch', label: 'Check Dispatch for Order', path: '/inventory/check-dispatch' },
      { id: 'check-sample', label: 'Check Sample Issue', path: '/inventory/check-sample' },
      { id: 'check-purchase', label: 'Purchase Verification', path: '/inventory/check-purchase' },
      { id: 'audit', label: 'Stock Take', path: '/inventory/audit' },
      { id: 'check-stock', label: 'Inventory Balance', path: '/inventory/check-stock' },
      { id: 'check-status', label: 'Gem Status Tracking', path: '/inventory/check-status' },
    ],
  },
  {
    id: 'spare-parts',
    label: 'Spare Parts',
    icon: 'wrench',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin'],
    section: 'Stock & Warehouse',
    workspace: 'INVENTORY',
    items: [
      { id: 'sp-order', label: 'Spare Parts Order', path: '/spare-parts/order' },
      { id: 'sp-issue', label: 'Spare Parts Issue', path: '/spare-parts/issue' },
      { id: 'sp-receive', label: 'Spare Parts Receive', path: '/spare-parts/receive' },
      { id: 'sp-pr', label: 'Spare Parts Purchase Request', path: '/spare-parts/purchase-request' },
      { id: 'sp-po', label: 'Spare Parts Purchase Order', path: '/spare-parts/purchase-order' },
      { id: 'sp-check-order', label: 'Check Spare Parts Order', path: '/spare-parts/check-order' },
      { id: 'sp-check-stock', label: 'Spare Parts Inventory Balance', path: '/spare-parts/check-stock' },
      { id: 'sp-summary-stock', label: 'Summary Spare Parts Stock', path: '/spare-parts/summary-stock' },
      { id: 'sp-check-item', label: 'Check Spare Parts', path: '/spare-parts/check-item' },
      { id: 'sp-check-status', label: 'Spare Parts Status Tracking', path: '/spare-parts/check-status' },
    ],
  },

  // ── Administration & Security (Shared / ALL) ──
  {
    id: 'admin-security',
    label: 'Security & Audit',
    icon: 'shield-alert',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin'],
    section: 'Administration',
    workspace: 'ALL',
    items: [
      { id: 'admin-radar', label: 'Threat Radar', path: '/admin/security-radar' },
      { id: 'admin-users', label: 'User Management', path: '/admin/users' },
      { id: 'admin-audit', label: 'Audit Logs', path: '/admin/audit-logs' },
      { id: 'admin-sessions', label: 'Active Sessions', path: '/admin/sessions' },
      { id: 'audit-cctv-report', label: 'CCTV Report', code: 'CCTV', path: '/audit/cctv-report' },
    ],
  },
];
