import type { Metric } from '../../../hooks/useCustomerSalesData';
import { useNavigate, useSearchParams } from 'react-router-dom';

const YEAR_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];

interface YearSummary {
  year: string;
  total: number;
  diff: number | null;
  pct: number | null;
  compYear: string | null;
}

interface GroupSummary {
  id: string;
  label: string;
  color: string;
  yearTotals: Record<string, number>;
  totalLatestYear: number;
  diff: number | null;
  pct: number | null;
  maxYear: string | null;
  minYear: string | null;
  latestYear: string | null;
}

interface CustomerKpiCardsProps {
  yearSummaries: YearSummary[];
  groupSummaries: GroupSummary[];
  activeYears: string[];
  metric: Metric;
  monthlySeries: 'year' | 'group';
  sortedSel: string[];
}

export function CustomerKpiCards({
  yearSummaries,
  groupSummaries,
  activeYears,
  metric,
  monthlySeries,
  sortedSel
}: CustomerKpiCardsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleCardClick = (id: string, type: 'year' | 'group') => {
    const params = new URLSearchParams(searchParams);
    if (type === 'year') {
      params.set('years', id);
    } else if (type === 'group') {
      params.set('groups', id);
    }
    navigate(`/dashboard/customer/matrix?${params.toString()}`);
  };

  return (
    <div className="sales-summary-cards" key={`kpis-${activeYears.join(',')}-${sortedSel.join(',')}-${monthlySeries}`}>
      {/* Year KPIs */}
      {yearSummaries.map((yData) => {
        const color = YEAR_COLORS[activeYears.indexOf(yData.year) % YEAR_COLORS.length];
        const diff = yData.diff;
        const pct = yData.pct;
        const cardCompYear = yData.compYear;
        const isUp = diff !== null && diff > 0;
        const isDown = diff !== null && diff < 0;

        return (
          <div
            key={`year-${yData.year}`}
            className="kpi-card"
            onClick={() => handleCardClick(yData.year, 'year')}
            style={{
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 8,
              padding: '12px 16px',
              boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              transition: 'all 140ms ease-in-out',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: color, marginRight: 2, flexShrink: 0 }} />
                  Year {yData.year}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 'var(--erp-text-panel)', fontWeight: 900, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
                  {metric === 'qty'
                    ? yData.total.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : '$' + yData.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                </div>
                {diff !== null && cardCompYear && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        color: isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span>
                        {isUp ? '↑ ' : isDown ? '↓ ' : ''}
                        {metric === 'qty' ? Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '$' + Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {pct !== null && ` (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)`}
                      </span>
                    </span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.75, color: 'var(--color-text-quaternary)', fontWeight: 800 }}>
                      vs {cardCompYear}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Group KPIs */}
      {groupSummaries.map((gData) => {
        const diff = gData.diff;
        const pct = gData.pct;
        const minYear = gData.minYear;
        const latestYear = gData.latestYear;
        const isUp = diff !== null && diff > 0;
        const isDown = diff !== null && diff < 0;

        return (
          <div
            key={`grp-${gData.id}`}
            className="kpi-card"
            onClick={() => handleCardClick(gData.id, 'group')}
            style={{
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 8,
              padding: '12px 16px',
              boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              transition: 'all 140ms ease-in-out',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: gData.color, marginRight: 2, flexShrink: 0 }} />
                  {gData.label}
                </span>
                {latestYear && <span style={{ fontSize: '0.62rem', color: 'var(--color-text-quaternary)', fontWeight: 800 }}>{latestYear}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 'var(--erp-text-panel)', fontWeight: 900, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
                  {metric === 'qty'
                    ? gData.totalLatestYear.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : '$' + gData.totalLatestYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                </div>
                {diff !== null && minYear && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        color: isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span>
                        {isUp ? '↑ ' : isDown ? '↓ ' : ''}
                        {metric === 'qty' ? Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '$' + Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {pct !== null && ` (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)`}
                      </span>
                    </span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.75, color: 'var(--color-text-quaternary)', fontWeight: 800 }}>
                      vs {minYear}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
