import React, { useState } from 'react';
import { BarChart3, Info, Calendar, Zap } from 'lucide-react';
import type { CockpitTimelinePoint } from '../../../services/dashboardAPI';

interface FactoryOutputTrendChartProps {
  timeline?: CockpitTimelinePoint[];
  selectedFacility: 'ALL' | 'FBE' | 'CLL';
}

export const FactoryOutputTrendChart: React.FC<FactoryOutputTrendChartProps> = ({
  timeline = [],
  selectedFacility,
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<CockpitTimelinePoint | null>(null);

  const getPointValue = (p: CockpitTimelinePoint) => {
    if (selectedFacility === 'FBE') return p.fbe;
    if (selectedFacility === 'CLL') return p.cll;
    return p.total;
  };

  const maxValue = Math.max(...timeline.map(getPointValue), 1);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-0)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-light)',
        boxShadow: 'var(--shadow-panel)',
        padding: '13px 15px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border-light)',
          paddingBottom: '9px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-surface-1)',
              color: 'var(--color-brand-600)',
              border: '1px solid var(--color-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3 size={15} strokeWidth={2} />
          </span>
          <div>
            <div
              style={{
                fontSize: '0.80rem',
                fontWeight: 900,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              Facility Production Output Trend
            </div>
            <div
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--color-text-tertiary)',
              }}
            >
              Monthly Output: {selectedFacility === 'ALL' ? 'FBE vs CLL Facility Throughput' : `${selectedFacility} Facility Monthly Throughput`}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.66rem', fontWeight: 800 }}>
          {(selectedFacility === 'ALL' || selectedFacility === 'FBE') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-brand-600)',
                }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>FBE Facility</span>
            </div>
          )}
          {(selectedFacility === 'ALL' || selectedFacility === 'CLL') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-proc-polishing, var(--color-success-600))',
                }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>CLL Facility</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Hover Details Card */}
      {hoveredMonth && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: '15px',
            backgroundColor: 'var(--color-surface-0)',
            border: '1px solid var(--color-border-default)',
            borderRadius: '6px',
            padding: '6px 10px',
            boxShadow: 'var(--shadow-dropdown)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.67rem',
            fontWeight: 800,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-brand-600)' }}>
            <Calendar size={12} />
            <span>{hoveredMonth.label}:</span>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-primary)' }}>
              {hoveredMonth.total.toLocaleString()} pcs
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--color-border-light)', paddingLeft: '8px' }}>
            <span style={{ color: 'var(--color-brand-600)' }}>FBE: {hoveredMonth.fbe.toLocaleString()}</span>
            <span style={{ color: 'var(--color-proc-polishing, var(--color-success-600))' }}>CLL: {hoveredMonth.cll.toLocaleString()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--color-border-light)', paddingLeft: '8px', color: 'var(--color-text-tertiary)' }}>
            <Zap size={11} style={{ color: 'var(--color-text-secondary)' }} />
            <span>Avg: {hoveredMonth.dailyAvg.toLocaleString()} /day</span>
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '7px',
          paddingTop: '18px',
          paddingBottom: '4px',
          position: 'relative',
        }}
      >
        {timeline.map((point) => {
          const val = getPointValue(point);
          const totalHeightPct = Math.max((val / maxValue) * 78, 4);
          const isHovered = hoveredMonth?.month === point.month;

          return (
            <div
              key={point.month}
              onMouseEnter={() => setHoveredMonth(point)}
              onMouseLeave={() => setHoveredMonth(null)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* Value Label above bar */}
              <span
                style={{
                  fontSize: '0.60rem',
                  fontWeight: 800,
                  color: isHovered ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-mono, monospace)',
                  marginBottom: '3px',
                }}
              >
                {val > 0
                  ? val >= 1000000
                    ? `${(val / 1000000).toFixed(1)}M`
                    : `${Math.round(val / 1000)}k`
                  : ''}
              </span>

              {/* Stacked / Split Bars */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '34px',
                  height: `${totalHeightPct}%`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  borderRadius: '3px 3px 0 0',
                  overflow: 'hidden',
                  backgroundColor: 'var(--color-surface-2)',
                  transition: 'height 0.3s ease',
                  opacity: isHovered ? 1 : 0.88,
                  outline: isHovered ? '1.5px solid var(--color-brand-400)' : 'none',
                }}
              >
                {selectedFacility === 'ALL' ? (
                  <>
                    {/* CLL Bar on top */}
                    {point.cll > 0 && (
                      <div
                        style={{
                          height: `${(point.cll / Math.max(point.total, 1)) * 100}%`,
                          backgroundColor: 'var(--color-proc-polishing, var(--color-success-600))',
                          width: '100%',
                          transition: 'height 0.25s ease',
                        }}
                        title={`CLL: ${point.cll.toLocaleString()} pcs`}
                      />
                    )}
                    {/* FBE Bar on bottom */}
                    {point.fbe > 0 && (
                      <div
                        style={{
                          height: `${(point.fbe / Math.max(point.total, 1)) * 100}%`,
                          backgroundColor: 'var(--color-brand-600)',
                          width: '100%',
                          transition: 'height 0.25s ease',
                        }}
                        title={`FBE: ${point.fbe.toLocaleString()} pcs`}
                      />
                    )}
                  </>
                ) : selectedFacility === 'FBE' ? (
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: 'var(--color-brand-600)',
                      width: '100%',
                      transition: 'height 0.25s ease',
                    }}
                    title={`FBE: ${point.fbe.toLocaleString()} pcs`}
                  />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: 'var(--color-proc-polishing, var(--color-success-600))',
                      width: '100%',
                      transition: 'height 0.25s ease',
                    }}
                    title={`CLL: ${point.cll.toLocaleString()} pcs`}
                  />
                )}
              </div>

              {/* Month Label */}
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  color: isHovered ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
                  marginTop: '5px',
                }}
              >
                {point.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.62rem',
          fontWeight: 700,
          color: 'var(--color-text-tertiary)',
          borderTop: '1px solid var(--color-border-light)',
          paddingTop: '5px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Info size={11} style={{ color: 'var(--color-text-tertiary)' }} />
          Hover over month for breakdown details.
        </span>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-secondary)' }}>
          Peak Output: {maxValue >= 1000000 ? `${(maxValue / 1000000).toFixed(1)}M` : `${Math.round(maxValue / 1000)}k`} pcs
        </span>
      </div>
    </div>
  );
};

export default FactoryOutputTrendChart;
