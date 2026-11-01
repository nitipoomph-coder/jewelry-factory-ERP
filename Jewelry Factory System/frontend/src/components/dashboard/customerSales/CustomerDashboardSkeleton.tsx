import { ALL_GROUPS, type CustomerGroup } from '../../../config/customerGroups';

const YEAR_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];

interface CustomerDashboardSkeletonProps {
  sortedSel: string[];
  activeYears: string[];
}

export function CustomerDashboardSkeleton({ sortedSel, activeYears }: CustomerDashboardSkeletonProps) {
  const sortedGroups = sortedSel.map(gId => ALL_GROUPS.find((x: CustomerGroup) => x.id === gId)).filter((g): g is CustomerGroup => Boolean(g));

  return (
    <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
      <div className="app-content-frame app-content-frame--workspace app-page-content sales-summary-page" style={{ padding: '16px 20px', width: '100%' }}>

        {/* Main Content Grid: Chart on Left, YoY Cards on Right */}
        <div className="sales-summary-main-grid">

          {/* Main Chart Section Skeleton */}
          <div className="sales-summary-chart" style={{ background: 'var(--color-surface-0)', borderRadius: 8, border: '1px solid var(--color-border-light)', boxShadow: 'none' }}>
            {/* Chart Controls Skeleton */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="app-skeleton" style={{ width: 110, height: 28, borderRadius: 6 }} />
                <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
                <div className="app-skeleton" style={{ width: 110, height: 28, borderRadius: 6 }} />
                <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
                <div className="app-skeleton" style={{ width: 130, height: 28, borderRadius: 6 }} />
                <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
                <div className="app-skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
              </div>
            </div>

            {/* Dynamic Chart Header Skeleton */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap', padding: '18px 18px 0' }}>
              <div>
                <div className="app-skeleton" style={{ width: 280, height: 24, borderRadius: 6, marginBottom: 8 }} />
                <div className="app-skeleton" style={{ width: 340, height: 14, borderRadius: 4 }} />

                {/* Chart Legend Skeleton */}
                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="app-skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
                  {((sortedGroups.length > 0 ? sortedGroups : Array.from({ length: 6 }).map(() => null)) as (CustomerGroup | null)[]).map((g, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: g?.color || 'var(--color-surface-3)' }} />
                      <div className="app-skeleton" style={{ width: 65, height: 14, borderRadius: 4 }} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div className="app-skeleton" style={{ width: 130, height: 14, borderRadius: 4 }} />
                <div className="app-skeleton" style={{ width: 180, height: 32, borderRadius: 6 }} />
                <div className="app-skeleton" style={{ width: 110, height: 20, borderRadius: 12 }} />
              </div>
            </div>

            {/* Chart Body Simulated Bar Graph Skeleton */}
            <div className="sales-summary-chart-body" style={{ padding: '20px 8px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 16, borderTop: '1px solid var(--color-border-light)', minHeight: 320 }}>
              {Array.from({ length: 7 }).map((_, colIdx) => (
                <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: '80%', width: '100%', justifyContent: 'center' }}>
                    <div className="app-skeleton" style={{ width: '40%', height: `${30 + (colIdx * 13) % 60}%`, borderRadius: '4px 4px 0 0' }} />
                    <div className="app-skeleton" style={{ width: '40%', height: `${40 + (colIdx * 17) % 55}%`, borderRadius: '4px 4px 0 0', opacity: 0.7 }} />
                  </div>
                  <div className="app-skeleton" style={{ width: 40, height: 12, borderRadius: 4 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Side-by-Side Summary Cards Skeleton */}
          <div className="sales-summary-cards">
            {/* Year KPI Skeletons */}
            {(activeYears.length > 0 ? activeYears : ['2025', '2024']).map((y, idx) => {
              const color = YEAR_COLORS[idx % YEAR_COLORS.length];
              return (
                <div
                  key={`skel-yr-${y}`}
                  style={{
                    background: 'var(--color-surface-0)',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, marginRight: 2 }} />
                      <div className="app-skeleton" style={{ width: 76, height: 16, borderRadius: 4 }} />
                    </div>
                    <div className="app-skeleton" style={{ width: 40, height: 14, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="app-skeleton" style={{ width: 140, height: 24, borderRadius: 6 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="app-skeleton" style={{ width: 110, height: 14, borderRadius: 4 }} />
                      <div className="app-skeleton" style={{ width: 50, height: 12, borderRadius: 4 }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Group KPI Skeletons */}
            {((sortedGroups.length > 0 ? sortedGroups : Array.from({ length: 6 }).map(() => null)) as (CustomerGroup | null)[]).map((g, idx) => {
              const color = g?.color || 'var(--color-border-light)';
              const label = g?.label || `Group ${idx + 1}`;
              return (
                <div
                  key={`skel-grp-${idx}`}
                  style={{
                    background: 'var(--color-surface-0)',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, marginRight: 2 }} />
                        <span style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-secondary)', opacity: 0.7 }}>{label}</span>
                      </div>
                      <div className="app-skeleton" style={{ width: 35, height: 14, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="app-skeleton" style={{ width: 130, height: 24, borderRadius: 6 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="app-skeleton" style={{ width: 110, height: 14, borderRadius: 4 }} />
                        <div className="app-skeleton" style={{ width: 50, height: 12, borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
