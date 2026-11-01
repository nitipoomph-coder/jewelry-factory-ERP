import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { fetchDashboardData } from '../services/dashboardAPI';

export default function DashboardDetail() {
  const location = useLocation();
  const { category, value } = (location.state as { category?: string; value?: string | number }) || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState('');

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchDashboardData()
      .then(() => setLoading(false))
      .catch(() => {
        setError('Unable to connect to the dashboard data source.');
        setLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    fetchDashboardData()
      .then(() => {
        if (active) setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Unable to connect to the dashboard data source.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const updateClock = () => setCurrentDate(new Date().toLocaleString('en-GB', { hour12: false }));
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pageTitle = category || 'Dashboard Detail';

  return (
    <div className="app-page">
      <PageHeader
        breadcrumb={BREADCRUMBS.DASHBOARD_DETAIL(pageTitle)}
        contentLayout="dashboard"
      />

      <div className="app-page-scroll content-scrollbar">
        <div className="app-content-frame app-content-frame--dashboard app-page-content flex flex-col gap-4">
          {loading ? (
            <div className="dashboard-detail-loading" aria-busy="true" aria-label="Loading dashboard detail">
              <div className="app-skeleton h-20" />
              <div className="dashboard-stat-grid">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="app-skeleton h-24" />
                ))}
              </div>
              <div className="app-skeleton h-64" />
            </div>
          ) : error ? (
            <section className="app-panel flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-50)] text-[var(--color-danger-600)]">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 className="text-[length:var(--erp-text-section)] font-bold text-[var(--color-text-primary)]">Data connection failed</h2>
                <p className="mt-1 text-[length:var(--erp-text-body)] text-[var(--color-text-secondary)]">{error}</p>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-[length:var(--erp-text-control)] font-bold text-[var(--color-ui-on-interactive)] hover:bg-[var(--color-brand-600)]"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </section>
          ) : (
            <>
              <section className="app-panel dashboard-detail-summary">
                <div>
                  <span className="text-[length:var(--erp-text-meta)] font-bold text-[var(--color-text-tertiary)]">SELECTED METRIC</span>
                  <h2 className="mt-1 text-[length:var(--erp-text-page)] font-extrabold text-[var(--color-text-primary)]">{pageTitle}</h2>
                </div>
                <div>
                  <span className="text-[length:var(--erp-text-meta)] font-bold text-[var(--color-text-tertiary)]">CURRENT VALUE</span>
                  <div className="mt-1 text-[length:var(--erp-text-kpi)] font-extrabold text-[var(--color-brand-600)]">{value ?? '-'}</div>
                </div>
                <div>
                  <span className="text-[length:var(--erp-text-meta)] font-bold text-[var(--color-text-tertiary)]">AS OF</span>
                  <div className="mt-1 text-[length:var(--erp-text-body)] font-semibold text-[var(--color-text-secondary)]">{currentDate}</div>
                </div>
              </section>

              <section className="app-panel flex min-h-48 flex-col justify-center p-6">
                <h2 className="text-[length:var(--erp-text-section)] font-bold text-[var(--color-text-primary)]">Record-level detail is not configured</h2>
                <p className="mt-2 max-w-2xl text-[length:var(--erp-text-body)] leading-6 text-[var(--color-text-secondary)]">
                  This metric currently has summary data only. A record-level endpoint is required before orders can be listed here.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
