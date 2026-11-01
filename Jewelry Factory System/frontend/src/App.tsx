import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import DashboardDetail from './pages/DashboardDetail';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerDashboardLayout from './pages/CustomerDashboardLayout';
import CustomerReportPage from './pages/CustomerReportPage';
import ItemDetailPage from './pages/ItemDetailPage';
import LoginPage from './pages/login/LoginPage';
import OrderDetailPage from './pages/OrderDetailPage';
import PlaceholderPage from './pages/PlaceholderPage';
import POTrackerAdvanced from './pages/POTrackerAdvanced';
import OrderVolumeSummaryPage from './pages/OrderVolumeSummaryPage';
import SalesCustomerGroupDetail from './pages/SalesCustomerGroupDetail';
import TopOrdersAnalyticsPage from './pages/TopOrdersAnalyticsPage';
import TopOrdersGalleryPage from './pages/TopOrdersGalleryPage';
import ProductionSummaryPage from './pages/ProductionSummaryPage';
import ProductionForecastPage from './pages/ProductionForecastPage';
import FBEOrderTrackPage from './pages/FBEOrderTrackPage';
import ProcurementDocPage from './pages/document/ProcurementDocPage';
import RequisitionDocPage from './pages/document/RequisitionDocPage';
import SampleDocPage from './pages/document/SampleDocPage';
import VendorPerformanceDashboardPage from './pages/subcontract/VendorPerformanceDashboardPage';
import SecurityRadarPage from './pages/admin/SecurityRadarPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import ActiveSessionsPage from './pages/admin/ActiveSessionsPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import CCTVAuditPage from './pages/audit/CCTVAuditPage';
import {
  customerTrendsPathFromSearch,
  LEGACY_CUSTOMER_TRENDS_PATH,
} from './utils/customerTrendsUrl';
import { menuConfig } from './config/menuConfig';

function isRouteAllowedForRole(pathname: string, role: string): boolean {
  const normalizedRole = (role || '').toLowerCase();
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  for (const group of menuConfig) {
    if (group.path) {
      const groupPath = group.path.replace(/\/+$/, '') || '/';
      const isMatch = groupPath === '/' ? normalizedPath === '/' : (normalizedPath === groupPath || normalizedPath.startsWith(groupPath + '/'));
      if (isMatch) {
        if (group.roles && !group.roles.includes(normalizedRole)) {
          return false;
        }
      }
    }

    if (group.items) {
      for (const item of group.items) {
        if (item.path) {
          const itemPath = item.path.replace(/\/+$/, '') || '/';
          const isMatch = itemPath === '/' ? normalizedPath === '/' : (normalizedPath === itemPath || normalizedPath.startsWith(itemPath + '/'));
          if (isMatch) {
            const effectiveRoles = item.roles || group.roles;
            if (effectiveRoles && !effectiveRoles.includes(normalizedRole)) {
              return false;
            }
          }
        }
        if (item.items) {
          for (const subItem of item.items) {
            if (subItem.path) {
              const subItemPath = subItem.path.replace(/\/+$/, '') || '/';
              const isMatch = subItemPath === '/' ? normalizedPath === '/' : (normalizedPath === subItemPath || normalizedPath.startsWith(subItemPath + '/'));
              if (isMatch) {
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
  }

  return true;
}

function ProtectedRoute() {
  const token = localStorage.getItem('auth_token');
  const role = (localStorage.getItem('auth_role') || '').toLowerCase();
  const location = useLocation();

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!isRouteAllowedForRole(location.pathname, role)) {
    return <Navigate to="/dashboard/customer" replace />;
  }

  return <Outlet />;
}

function LegacyCustomerTrendsRedirect() {
  const location = useLocation();
  return <Navigate to={customerTrendsPathFromSearch(location.search)} replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard/detail" element={<DashboardDetail />} />
            <Route path="/dashboard/customer" element={<CustomerDashboardLayout />}>
              <Route index element={<CustomerDashboard metric="amount" />} />
              <Route path="matrix" element={<CustomerReportPage />} />
              <Route path="trends" element={<OrderVolumeSummaryPage />} />
            </Route>
            <Route path="/dashboard/sales" element={<Navigate to="/dashboard/customer" replace />} />
            <Route path="/dashboard/qty" element={<Navigate to="/dashboard/customer?metric=qty" replace />} />
            <Route path="/dashboard/customer-report" element={<Navigate to="/dashboard/customer/matrix" replace />} />
            <Route path="/dashboard/customer-trends" element={<Navigate to="/dashboard/customer/trends" replace />} />
            <Route path="/dashboard/top-orders" element={<TopOrdersGalleryPage />} />
            <Route path="/dashboard/top-orders/analytics" element={<TopOrdersAnalyticsPage />} />
            <Route path="/dashboard/top-Orders" element={<Navigate to="/dashboard/top-orders" replace />} />
            <Route path="/dashboard/top-order-lines" element={<Navigate to="/dashboard/top-orders" replace />} />
            <Route path="/dashboard/Top-Order Lines" element={<Navigate to="/dashboard/top-orders" replace />} />
            <Route path={LEGACY_CUSTOMER_TRENDS_PATH} element={<LegacyCustomerTrendsRedirect />} />
            <Route path="/dashboard/sales-customer-detail" element={<SalesCustomerGroupDetail />} />
            <Route path="/dashboard/production-summary" element={<ProductionSummaryPage />} />
            <Route path="/dashboard/production-forecast" element={<ProductionForecastPage />} />
            <Route path="/dashboard/fbe-order-track" element={<FBEOrderTrackPage />} />
            <Route path="/procurement/purchase" element={<ProcurementDocPage />} />
            <Route path="/procurement/receive" element={<ProcurementDocPage />} />
            <Route path="/procurement/receive-b" element={<ProcurementDocPage />} />
            <Route path="/procurement/return" element={<ProcurementDocPage />} />

            <Route path="/orders/create" element={<RequisitionDocPage />} />
            <Route path="/orders/issue" element={<RequisitionDocPage />} />
            <Route path="/orders/issue-b" element={<RequisitionDocPage />} />
            <Route path="/orders/repair" element={<RequisitionDocPage />} />
            <Route path="/orders/dispatch-order" element={<RequisitionDocPage />} />

            <Route path="/sample/order" element={<SampleDocPage />} />
            <Route path="/sample/dispatch" element={<SampleDocPage />} />

            <Route path="/inventory/check-dispatch" element={<PlaceholderPage />} />
            <Route path="/inventory/check-sample" element={<PlaceholderPage />} />
            <Route path="/inventory/check-purchase" element={<PlaceholderPage />} />
            <Route path="/inventory/audit" element={<PlaceholderPage />} />
            <Route path="/inventory/check-stock" element={<PlaceholderPage />} />
            <Route path="/inventory/check-status" element={<PlaceholderPage />} />

            <Route path="/spare-parts/order" element={<PlaceholderPage />} />
            <Route path="/spare-parts/issue" element={<PlaceholderPage />} />
            <Route path="/spare-parts/receive" element={<PlaceholderPage />} />
            <Route path="/spare-parts/purchase-request" element={<PlaceholderPage />} />
            <Route path="/spare-parts/purchase-order" element={<PlaceholderPage />} />
            <Route path="/spare-parts/check-order" element={<PlaceholderPage />} />
            <Route path="/spare-parts/check-stock" element={<PlaceholderPage />} />
            <Route path="/spare-parts/summary-stock" element={<PlaceholderPage />} />
            <Route path="/spare-parts/check-item" element={<PlaceholderPage />} />
            <Route path="/spare-parts/check-status" element={<PlaceholderPage />} />

            <Route path="/subcontract/vendor-performance" element={<VendorPerformanceDashboardPage />} />
            <Route path="/subcontract/vendor-price-history" element={<PlaceholderPage />} />
            <Route path="/subcontract/aging-report" element={<PlaceholderPage />} />

            <Route path="/po-tracker" element={<POTrackerAdvanced />} />
            <Route path="/po-tracker/group/:cust/:addr/:kind/:mat/:duedate" element={<OrderDetailPage />} />
            <Route path="/po-tracker/po/:poNo" element={<OrderDetailPage />} />
            <Route path="/po-tracker/ord/:ordNo" element={<OrderDetailPage />} />
            <Route path="/po-tracker/:ordNo" element={<OrderDetailPage />} />
            <Route path="/item-detail/:id" element={<ItemDetailPage />} />

            {/* Audit Module (Admin Only) */}
            <Route path="/audit" element={<Navigate to="/audit/cctv-report" replace />} />
            <Route path="/audit/cctv-report" element={<CCTVAuditPage />} />

            {/* Administration & Security (Zero-DB) */}
            <Route path="/admin/security-radar" element={<SecurityRadarPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
            <Route path="/admin/sessions" element={<ActiveSessionsPage />} />
            <Route path="/admin/cctv-report" element={<Navigate to="/audit/cctv-report" replace />} />

            <Route path="*" element={<PlaceholderPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}
