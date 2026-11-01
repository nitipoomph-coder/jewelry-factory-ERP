import React from 'react';
import { Package, Building2, Factory, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import type { CockpitKpi, DualPipelineData } from '../../../services/dashboardAPI';

interface FactoryKpiStripProps {
  kpi?: CockpitKpi;
  dualPipeline?: DualPipelineData;
  selectedFacility: 'ALL' | 'FBE' | 'CLL';
}

export const FactoryKpiStrip: React.FC<FactoryKpiStripProps> = ({
  kpi,
  dualPipeline,
  selectedFacility,
}) => {
  const formatNumber = (num?: number) => {
    if (num == null) return '—';
    return num.toLocaleString();
  };

  const currentWipPcs = selectedFacility === 'FBE'
    ? (dualPipeline?.fbe?.wipPcs ?? kpi?.totalWipPcs)
    : selectedFacility === 'CLL'
    ? (dualPipeline?.cll?.wipPcs ?? kpi?.totalWipPcs)
    : kpi?.totalWipPcs;

  const currentWipOrders = selectedFacility === 'FBE'
    ? (dualPipeline?.fbe?.wipOrders ?? kpi?.totalWipOrders)
    : selectedFacility === 'CLL'
    ? (dualPipeline?.cll?.wipOrders ?? kpi?.totalWipOrders)
    : kpi?.totalWipOrders;

  const cards = [
    {
      id: 'wip',
      label: selectedFacility === 'ALL' ? 'Total Active WIP' : `${selectedFacility} Active WIP`,
      value: formatNumber(currentWipPcs),
      metricUnit: 'PCS',
      subtext: `${formatNumber(currentWipOrders)} active orders in ${selectedFacility === 'ALL' ? 'factory' : selectedFacility}`,
      badge: 'In Production',
      icon: <Package size={17} strokeWidth={2} />,
      isAlert: false,
      isHighlighted: false,
      accentBorder: 'var(--color-brand-600)',
    },
    {
      id: 'fbe',
      label: 'FBE Production',
      value: formatNumber(kpi?.fbeOutputPcs),
      metricUnit: 'PCS',
      subtext: `${kpi?.fbeShare ?? 0}% completed factory share`,
      badge: selectedFacility === 'FBE' ? 'Selected Facility' : `${kpi?.fbeShare ?? 0}% Share`,
      icon: <Building2 size={17} strokeWidth={2} />,
      isAlert: false,
      isHighlighted: selectedFacility === 'FBE',
      accentBorder: 'var(--color-brand-600)',
    },
    {
      id: 'cll',
      label: 'CLL Production',
      value: formatNumber(kpi?.cllOutputPcs),
      metricUnit: 'PCS',
      subtext: `${kpi?.cllShare ?? 0}% completed factory share`,
      badge: selectedFacility === 'CLL' ? 'Selected Facility' : `${kpi?.cllShare ?? 0}% Share`,
      icon: <Factory size={17} strokeWidth={2} />,
      isAlert: false,
      isHighlighted: selectedFacility === 'CLL',
      accentBorder: 'var(--color-proc-polishing, var(--color-success-600))',
    },
    {
      id: 'runrate',
      label: 'Daily Run-Rate',
      value: formatNumber(kpi?.dailyRunRate),
      metricUnit: 'PCS/DAY',
      subtext: `Based on ${kpi?.activeWorkdays ?? 298} production workdays`,
      badge: 'Throughput',
      icon: <Zap size={17} strokeWidth={2} />,
      isAlert: false,
      isHighlighted: false,
      accentBorder: 'var(--color-border-default)',
    },
    {
      id: 'overdue',
      label: 'Overdue Orders',
      value: formatNumber(kpi?.overdueCount),
      metricUnit: 'ORDERS',
      subtext: `${kpi?.onTimeRate ?? 100}% on-time dispatch rate`,
      badge: (kpi?.overdueCount ?? 0) > 0 ? 'Action Required' : 'On Schedule',
      icon: <AlertTriangle size={17} strokeWidth={2} />,
      isAlert: (kpi?.overdueCount ?? 0) > 0,
      isHighlighted: (kpi?.overdueCount ?? 0) > 0,
      accentBorder: 'var(--color-danger-500)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '10px',
        width: '100%',
        minHeight: '84px',
      }}
    >
      {cards.map((c) => (
        <div
          key={c.id}
          style={{
            position: 'relative',
            backgroundColor: 'var(--color-surface-0)',
            borderRadius: '8px',
            border: c.isHighlighted
              ? `1.5px solid ${c.accentBorder}`
              : '1px solid var(--color-border-light)',
            boxShadow: 'var(--shadow-panel)',
            padding: '11px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            if (!c.isHighlighted) {
              e.currentTarget.style.borderColor = 'var(--color-border-default)';
              e.currentTarget.style.boxShadow = '0 2px 8px color-mix(in srgb, var(--color-surface-800) 6%, transparent)';
            }
          }}
          onMouseLeave={(e) => {
            if (!c.isHighlighted) {
              e.currentTarget.style.borderColor = 'var(--color-border-light)';
              e.currentTarget.style.boxShadow = 'var(--shadow-panel)';
            }
          }}
        >
          {/* Card Header Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
            }}
          >
            <span
              style={{
                fontSize: '0.67rem',
                fontWeight: 800,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              {c.label}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Formal Corporate Badge */}
              <span
                style={{
                  fontSize: '0.60rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: c.isAlert
                    ? 'color-mix(in srgb, var(--color-danger-500) 10%, var(--color-surface-0))'
                    : 'var(--color-surface-1)',
                  color: c.isAlert
                    ? 'var(--color-danger-500)'
                    : 'var(--color-text-secondary)',
                  border: c.isAlert
                    ? '1px solid color-mix(in srgb, var(--color-danger-500) 25%, transparent)'
                    : '1px solid var(--color-border-light)',
                  letterSpacing: '0.01em',
                }}
              >
                {c.badge}
              </span>

              {/* Formal Neutral Icon Box */}
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  backgroundColor: c.isAlert
                    ? 'color-mix(in srgb, var(--color-danger-500) 10%, var(--color-surface-0))'
                    : 'var(--color-surface-1)',
                  color: c.isAlert
                    ? 'var(--color-danger-500)'
                    : 'var(--color-brand-600)',
                  border: '1px solid var(--color-border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {c.icon}
              </span>
            </div>
          </div>

          {/* Card Value Row */}
          <div style={{ marginTop: '4px', marginBottom: '2px', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span
              style={{
                fontSize: '1.55rem',
                fontWeight: 900,
                fontFamily: 'Outfit, var(--font-display), sans-serif',
                lineHeight: 1.1,
                color: c.isAlert
                  ? 'var(--color-danger-500)'
                  : 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {c.value}
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {c.metricUnit}
            </span>
          </div>

          {/* Card Subtext Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.70rem',
              fontWeight: 700,
              color: c.isAlert
                ? 'var(--color-danger-500)'
                : 'var(--color-text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {c.isAlert ? (
              <AlertTriangle size={11} style={{ color: 'var(--color-danger-500)', flexShrink: 0 }} />
            ) : (
              <TrendingUp size={11} style={{ color: 'var(--color-brand-600)', flexShrink: 0 }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FactoryKpiStrip;
