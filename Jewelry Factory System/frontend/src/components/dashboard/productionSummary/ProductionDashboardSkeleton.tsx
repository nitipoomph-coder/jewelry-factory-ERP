import { PROD_CUSTOMER_GROUPS } from '../../../config/productionSummaryConfig';

export function ProductionDashboardSkeleton() {
  return (
    <>
      {/* Chart Skeleton */}
      <div className="print-chart-box" style={{ height: '500px', width: '100%' }}>
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-ui-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-light)',
            padding: '12px 16px 8px',
          }}
        >
          {/* Title */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div className="app-skeleton" style={{ width: 250, height: 20, borderRadius: 4 }} />
          </div>

          {/* Chart Body Simulated Bar Graph Skeleton */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              gap: 16,
              borderLeft: '1.5px solid var(--color-border-strong)',
              borderBottom: '1.5px solid var(--color-border-strong)',
              flex: 1,
              paddingBottom: 8,
              paddingLeft: 8,
            }}
          >
            {Array.from({ length: 12 }).map((_, colIdx) => (
              <div
                key={colIdx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  height: '100%',
                  justifyContent: 'flex-end',
                  flex: 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 2,
                    height: '80%',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    className="app-skeleton"
                    style={{ width: '30%', height: `${30 + (colIdx * 13) % 60}%`, borderRadius: '3px 3px 0 0' }}
                  />
                  <div
                    className="app-skeleton"
                    style={{
                      width: '30%',
                      height: `${40 + (colIdx * 17) % 55}%`,
                      borderRadius: '3px 3px 0 0',
                      opacity: 0.7,
                    }}
                  />
                  <div
                    className="app-skeleton"
                    style={{
                      width: '30%',
                      height: `${20 + (colIdx * 23) % 70}%`,
                      borderRadius: '3px 3px 0 0',
                      opacity: 0.5,
                    }}
                  />
                </div>
                <div className="app-skeleton" style={{ width: 30, height: 10, borderRadius: 4 }} />
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
            {PROD_CUSTOMER_GROUPS.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-surface-3)' }}
                  className="app-skeleton"
                />
                <div className="app-skeleton" style={{ width: 40, height: 12, borderRadius: 4 }} />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{ width: 14, height: 3, background: 'var(--color-surface-3)' }}
                className="app-skeleton"
              />
              <div className="app-skeleton" style={{ width: 40, height: 12, borderRadius: 4 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="print-table-box shrink-0">
        <div
          style={{
            width: '100%',
            background: 'var(--color-ui-surface)',
            borderRadius: '6px',
            border: '1px solid var(--color-border-light)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header Row */}
            <div
              style={{
                display: 'flex',
                background: 'var(--color-table-header)',
                borderBottom: '1.5px solid var(--color-border-strong)',
                height: '26px',
              }}
            >
              <div style={{ width: '75px', borderRight: '1px solid var(--color-border-light)' }} />
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    borderRight: '1px solid var(--color-border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div className="app-skeleton" style={{ width: '60%', height: '12px', borderRadius: 2 }} />
                </div>
              ))}
              <div style={{ width: '75px' }} />
            </div>

            {/* Data Rows */}
            {PROD_CUSTOMER_GROUPS.map((g) => (
              <div key={g.id} style={{ display: 'flex', height: '22px', borderBottom: '1px solid var(--color-border-light)' }}>
                <div
                  style={{
                    width: '75px',
                    borderRight: '1px solid var(--color-border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div className="app-skeleton" style={{ width: '40%', height: '12px', borderRadius: 2 }} />
                </div>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      borderRight: '1px solid var(--color-border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div className="app-skeleton" style={{ width: '70%', height: '12px', borderRadius: 2 }} />
                  </div>
                ))}
                <div style={{ width: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="app-skeleton" style={{ width: '60%', height: '12px', borderRadius: 2 }} />
                </div>
              </div>
            ))}

            {/* Total Row */}
            <div
              style={{
                display: 'flex',
                height: '24px',
                background: 'var(--color-surface-1)',
                borderBottom: '1px solid var(--color-border-light)',
              }}
            >
              <div
                style={{
                  width: '75px',
                  borderRight: '1px solid var(--color-border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div className="app-skeleton" style={{ width: '50%', height: '14px', borderRadius: 2 }} />
              </div>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    borderRight: '1px solid var(--color-border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div className="app-skeleton" style={{ width: '80%', height: '14px', borderRadius: 2 }} />
                </div>
              ))}
              <div style={{ width: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="app-skeleton" style={{ width: '70%', height: '14px', borderRadius: 2 }} />
              </div>
            </div>

            {/* Avg Row */}
            <div style={{ display: 'flex', height: '22px', background: 'var(--color-surface-1)' }}>
              <div
                style={{
                  width: '75px',
                  borderRight: '1px solid var(--color-border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div className="app-skeleton" style={{ width: '60%', height: '12px', borderRadius: 2 }} />
              </div>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    borderRight: '1px solid var(--color-border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div className="app-skeleton" style={{ width: '50%', height: '12px', borderRadius: 2 }} />
                </div>
              ))}
              <div style={{ width: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="app-skeleton" style={{ width: '60%', height: '12px', borderRadius: 2 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
