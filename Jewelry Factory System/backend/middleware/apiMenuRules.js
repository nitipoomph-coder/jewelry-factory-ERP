/**
 * API → menu permission map (ids must match frontend src/config/menuConfig.ts).
 * Pass the page's item id AND its group id: a group permission grants its children.
 * Used by server.js with requireMenu / requireMenuByPath (middleware/authMiddleware.js).
 */

const PRODUCTION_GROUP = 'order-tracker';   // Production group
const SALES_GROUP = 'sales-dashboard';      // Sales Analytics group

/**
 * /api/dashboard is shared by three routers (productionDashboard, customerReportMatrix,
 * orderVolumeSummary) and several pages → per-path rules. First match wins; an unmatched
 * path is denied, so add a rule here whenever a new /api/dashboard endpoint is added.
 */
const DASHBOARD_MENU_RULES = [
  { match: p => p === '/years', menus: null },                                                // year list (metadata) — every dashboard page
  { match: p => p === '/' || p.startsWith('/detail/'), menus: ['home'] },                      // Factory Overview cards + drill-down
  { match: p => p === '/customer-summary', menus: ['dash-cust', 'dash-matrix', SALES_GROUP] },   // Sales Summary + Customer Report Matrix
  { match: p => p.startsWith('/sales-') || p === '/top-items', menus: ['dash-cust', SALES_GROUP] }, // Order Trends / Order List under Sales Summary
];

/** /api/items — Top Item Gallery + Top Items Qty. */
const TOP_ITEMS_MENUS = ['dash-top-orders', 'dash-top-orders-analytics', SALES_GROUP];

/** Search results of type PO / Order / Customer open PO Tracker pages. */
const PO_TRACKER_MENUS = ['po-tracker', PRODUCTION_GROUP];

module.exports = { PRODUCTION_GROUP, SALES_GROUP, DASHBOARD_MENU_RULES, TOP_ITEMS_MENUS, PO_TRACKER_MENUS };
