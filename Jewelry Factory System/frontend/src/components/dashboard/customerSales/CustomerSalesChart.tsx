import { useMemo } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ALL_GROUPS } from '../../../config/customerGroups';
import type { ChartDatum, Metric } from '../../../hooks/useCustomerSalesData';

import './CustomerSales.css';

const YEAR_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];

type ProcessedChartDatum = {
  label: string;
  sortKey?: string;
  _actualTotal?: number;
  _totalPlotY?: number | null;
  [key: string]: string | number | null | undefined;
};
type TooltipPayloadEntry = { value?: number; color?: string; dataKey?: string | number; name?: string; payload?: ProcessedChartDatum };
type CustomTooltipProps = { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string; metric: Metric; chartData?: ChartDatum[]; mode?: string; monthlySeries?: string; };

const CustomTooltip = ({ active, payload, label, metric, chartData, mode, monthlySeries }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--color-border-light)', minWidth: 200, background: 'var(--color-ui-surface)', boxShadow: 'var(--shadow-dropdown)' }}>
        <p style={{ fontSize: 'var(--erp-text-panel)', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 8, borderBottom: '1px solid var(--color-border-light)', paddingBottom: 6 }}>
          {label}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payload
            .slice()
            .sort((a, b) => {
              if (a.dataKey === '_totalPlotY') return 1;
              if (b.dataKey === '_totalPlotY') return -1;
              if (String(a.dataKey).length === 4 && String(b.dataKey).length === 4) {
                return Number(b.dataKey) - Number(a.dataKey);
              }
              return 0;
            })
            .map((entry, index) => {
            if (entry.value === 0) return null;

            let diff = null;
            let pct = null;
            const currVal = entry.dataKey === '_totalPlotY' ? Number(entry.payload?._actualTotal || 0) : Number(entry.value || 0);

            if (monthlySeries === 'year' && String(entry.dataKey).length === 4) {
              const prevYear = String(Number(entry.dataKey) - 1);
              const prevEntry = payload.find(p => String(p.dataKey) === prevYear);
              if (prevEntry) {
                const prevVal = Number(prevEntry.value || 0);
                if (prevVal > 0 || currVal > 0) {
                  diff = currVal - prevVal;
                  if (prevVal > 0) pct = ((currVal - prevVal) / prevVal) * 100;
                }
              }
            } else if (mode === 'yearly' && monthlySeries === 'group' && chartData) {
              const prevYear = String(Number(label) - 1);
              const prevData = chartData.find(d => String(d.label) === prevYear);
              if (prevData && prevData[entry.dataKey!]) {
                const prevVal = Number(prevData[entry.dataKey!]);
                if (prevVal > 0 || currVal > 0) {
                  diff = currVal - prevVal;
                  if (prevVal > 0) pct = ((currVal - prevVal) / prevVal) * 100;
                }
              }
            }

            const isUp = diff !== null && diff > 0;
            const isDown = diff !== null && diff < 0;

            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--erp-text-control)', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color }} />
                    {ALL_GROUPS.find(g => g.id === entry.dataKey)?.label || (String(entry.dataKey).length === 4 ? `Year ${entry.dataKey}` : entry.name)}
                  </div>
                  <span style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {metric === 'qty'
                      ? currVal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : '$' + currVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {diff !== null && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.72rem', fontWeight: 900, color: isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)' }}>
                    <span>
                      {isUp ? '↑ ' : isDown ? '↓ ' : ''}
                      {metric === 'qty' ? Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '$' + Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {pct !== null && ` (${Math.abs(pct).toFixed(2)}%)`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// Helper for Smart Y-Axis Scale
function niceNum(range: number, round = false) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

interface CustomerSalesChartProps {
  chartData: ChartDatum[];
  metric: Metric;
  mode: 'yearly' | 'monthly';
  monthlySeries: 'year' | 'group';
  showLabels: boolean;
  sortedSel: string[];
  activeYears: string[];
}

export function CustomerSalesChart({
  chartData,
  metric,
  mode,
  monthlySeries,
  showLabels,
  sortedSel,
  activeYears
}: CustomerSalesChartProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleBarClick = (seriesId: string, seriesType: 'group' | 'year') => {
    const params = new URLSearchParams(searchParams);

    // If they click a specific group bar, we isolate the filter to that group
    if (seriesType === 'group') {
      params.set('groups', seriesId);
    }
    // If they click a specific year bar, we isolate the filter to that year
    else if (seriesType === 'year') {
      params.set('years', seriesId);
    }

    navigate(`/dashboard/customer/matrix?${params.toString()}`);
  };
  const formatAxisValue = (value: number): string => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    if (metric === 'qty') return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const { processedData, yAxisMax, yAxisTicks, avgActualTotal } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { processedData: [], yAxisMax: 100, yAxisTicks: [0, 50, 100], avgActualTotal: 0 };
    }

    let maxBar = 0;
    let maxTot = 0;
    let minTot = Number.MAX_VALUE;
    const keys = monthlySeries === 'group' ? sortedSel : activeYears;

    // หา Max Bar andคำนวณ Total ของแต่ละช่วง
    chartData.forEach((d: ChartDatum & { _actualTotal?: number }) => {
      let tot = 0;
      keys.forEach(k => {
        const val = Number(d[k] || 0);
        tot += val;
        if (val > maxBar) maxBar = val;
      });
      d._actualTotal = tot;
      if (tot > 0) {
        if (tot > maxTot) maxTot = tot;
        if (tot < minTot) minTot = tot;
      }
    });

    if (minTot === Number.MAX_VALUE) minTot = 0;

    const hasTotalLine = (activeYears.length > 1 || mode === 'monthly');
    const BAR_ZONE = hasTotalLine ? 0.65 : 0.88; // เมื่อไม่มีเส้น Total ให้แท่งใช้พื้นที่ได้ถึง 88%
    const TOT_LO = 0.70;   // เส้น Total ลอยระหว่าง 70% ถึง 88%
    const TOT_HI = 0.88;

    let calculatedYMax = 100;
    let calculatedTicks: number[] = [0, 50, 100];

    if (maxBar > 0) {
      const pTarget = maxBar / BAR_ZONE;
      const pInt = niceNum(pTarget / 10.0, false); 
      calculatedYMax = Math.ceil(pTarget / pInt) * pInt;

      calculatedTicks = [];
      for (let val = 0; val <= calculatedYMax; val += pInt) {
        calculatedTicks.push(val);
      }
    }

    let sumTotal = 0;
    let countTotal = 0;

    const processed: ProcessedChartDatum[] = chartData.map((d: ChartDatum & { _actualTotal?: number }) => {
      const tot = d._actualTotal || 0;
      let totalPlotY: number | null = null;

      if (tot > 0) {
        let frac = (TOT_LO + TOT_HI) / 2;
        if (maxTot > minTot) {
          frac = TOT_LO + ((tot - minTot) / (maxTot - minTot)) * (TOT_HI - TOT_LO);
        }
        totalPlotY = calculatedYMax * frac;
        sumTotal += tot;
        countTotal++;
      }

      return { ...d, _totalPlotY: totalPlotY };
    });

    let avgPlotY: number | null = null;
    let avgActualTotal: number | null = null;
    if (countTotal > 0) {
      avgActualTotal = sumTotal / countTotal;
      let avgFrac = (TOT_LO + TOT_HI) / 2;
      if (maxTot > minTot) {
        avgFrac = TOT_LO + ((avgActualTotal - minTot) / (maxTot - minTot)) * (TOT_HI - TOT_LO);
      }
      avgPlotY = calculatedYMax * avgFrac;
    }

    return { processedData: processed, yAxisMax: calculatedYMax, yAxisTicks: calculatedTicks, avgPlotY, avgActualTotal };
  }, [chartData, monthlySeries, sortedSel, activeYears, mode]);

  const renderTotalLabel = (props: { x?: number; y?: number; index?: number }) => {
    const { x = 0, y = 0, index } = props;
    const item = typeof index === 'number' ? processedData[index] : undefined;
    if (!item || !item._actualTotal || item._actualTotal === 0) return <g />;

    const isAboveAvg = avgActualTotal !== null && item._actualTotal >= avgActualTotal;

    return (
      <text
        x={x}
        y={isAboveAvg ? y - 12 : y + 18}
        textAnchor="middle"
        fill={isAboveAvg ? "var(--color-success-600)" : "var(--color-danger-500)"}
        fontSize={10}
        fontWeight={900}
      >
        {metric === 'qty'
          ? Number(item._actualTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })
          : '$' + formatAxisValue(item._actualTotal).replace('$', '')}
      </text>
    );
  };

  const totalBarCount = chartData.length * (monthlySeries === 'group' ? sortedSel.length : activeYears.length);
  const calculatedMaxBar = totalBarCount <= 5 ? 68 : totalBarCount <= 10 ? 52 : totalBarCount <= 16 ? 42 : 36;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={processedData} margin={{ top: 20, right: 24, left: 0, bottom: 5 }} barGap={0} barCategoryGap="20%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border-light)" />
        <XAxis 
          dataKey="label" 
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 600 }} 
          axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }}
          tickLine={false} 
          tickMargin={8} 
        />
        <YAxis 
          domain={[0, yAxisMax]}
          ticks={yAxisTicks}
          interval={0}
          tickFormatter={(val) => formatAxisValue(val)} 
          tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 500 }} 
          axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }}
          tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }}
          tickMargin={6} 
          width={70} 
        />
        <Tooltip content={<CustomTooltip metric={metric} chartData={chartData} mode={mode} monthlySeries={monthlySeries} />} cursor={{ fill: 'var(--color-surface-1)', opacity: 0.4 }} />
        {monthlySeries === 'group' ? sortedSel.map((gId) => {
          const g = ALL_GROUPS.find((group) => group.id === gId)!;
          return (
            <Bar
              key={gId}
              dataKey={gId}
              name={g.label}
              fill={g.color}
              maxBarSize={calculatedMaxBar}
              radius={[0, 0, 0, 0]}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
              onClick={() => handleBarClick(gId, 'group')}
              style={{ cursor: 'pointer' }}
            >
              {showLabels && (
                <LabelList dataKey={gId} position="top" formatter={(val: unknown) => Number(val) > 0 ? formatAxisValue(Number(val)).replace('$', '') : ''} style={{ fontSize: 10, fill: 'var(--color-text-primary)', fontWeight: 800, pointerEvents: 'none' }} />
              )}
            </Bar>
          );
        }) : activeYears.map((y, idx) => {
          const color = YEAR_COLORS[idx % YEAR_COLORS.length];
          return (
            <Bar
              key={y}
              dataKey={y}
              name={`Year ${y}`}
              fill={color}
              maxBarSize={calculatedMaxBar}
              radius={[0, 0, 0, 0]}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
              onClick={() => handleBarClick(y, 'year')}
              style={{ cursor: 'pointer' }}
            >
              {showLabels && (
                <LabelList dataKey={y} position="top" formatter={(val: unknown) => Number(val) > 0 ? formatAxisValue(Number(val)).replace('$', '') : ''} style={{ fontSize: 10, fill: 'var(--color-text-primary)', fontWeight: 800, pointerEvents: 'none' }} />
              )}
            </Bar>
          );
        })}

        {(activeYears.length > 1 || mode === 'monthly') && (
          <Line
            type="monotone"
            dataKey="_totalPlotY"
            name="Total"
            stroke="var(--color-brand-500)"
            strokeWidth={3}
            dot={{ r: 4, fill: "var(--color-brand-500)", stroke: 'var(--color-ui-surface)', strokeWidth: 1.5 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
            label={renderTotalLabel}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
