import { useState } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area
} from 'recharts';
import type { Metric, TrendComparisonDatum } from '../../../hooks/useOrderVolumeSummaryData';
import { fmtMetric } from '../../../hooks/useOrderVolumeSummaryData';

interface OrderVolumeTrendChartProps {
  data: TrendComparisonDatum[];
  metric: Metric;
  hasCompareYear: boolean;
  primaryYear: string;
  compareYear: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
  metric: Metric;
}

function CustomTooltip({ active, payload, label, metric }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--color-surface-0)] border border-[var(--color-border-light)] p-2.5 rounded-lg shadow-[var(--shadow-dropdown)]">
        <p className="font-black m-0 mb-1.5 text-[var(--color-text-primary)] text-xs border-b border-[var(--color-border-light)] pb-1">
          {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="my-0.5 text-xs font-bold">
            {entry.name}: {entry.name.includes('%') ? `${entry.value.toFixed(1)}%` : fmtMetric(entry.value, metric)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function OrderVolumeTrendChart({ data, metric, hasCompareYear, primaryYear, compareYear }: OrderVolumeTrendChartProps) {
  const [showRates, setShowRates] = useState(false);

  const chartData = data.map(d => {
    const primaryVolume = d.report;
    const compareVolume = hasCompareYear ? d.compare : 0;
    
    const primaryOnTimeRate = primaryVolume > 0 ? ((d.reportShipped || 0) / primaryVolume) * 100 : 0;
    const primaryOverdueRate = primaryVolume > 0 ? (((primaryVolume - (d.reportShipped || 0)) / primaryVolume) * 100) : 0;

    return {
      name: d.label,
      primaryVolume,
      compareVolume,
      primaryOnTimeRate,
      primaryOverdueRate
    };
  });

  return (
    <div className="bg-[var(--color-surface-0)] rounded-lg p-3.5 border border-[var(--color-border-light)] flex flex-col w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="m-0 text-[0.86rem] font-black text-[var(--color-text-primary)]">
          Order Volume & Delivery Rate Trend
        </h3>
        <label className="text-[0.72rem] font-bold text-[var(--color-text-secondary)] flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showRates}
            onChange={(e) => setShowRates(e.target.checked)}
          />
          Show Delivery Rates (%)
        </label>
      </div>

      <div className="w-full h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(val) => fmtMetric(val, metric)}
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            {showRates && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
                tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
            )}
            <Tooltip content={<CustomTooltip metric={metric} />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: 4 }}
              formatter={(value) => (
                <span className="text-[var(--color-text-secondary)] font-bold mr-2">
                  {value}
                </span>
              )}
            />

            {hasCompareYear && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="compareVolume"
                name={`${compareYear} Volume`}
                stroke="var(--color-warning-500)"
                fill="var(--color-warning-500)"
                fillOpacity={0.12}
                strokeDasharray="4 4"
              />
            )}

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="primaryVolume"
              name={`${primaryYear} Volume`}
              stroke="var(--color-brand-500)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'var(--color-brand-500)' }}
              activeDot={{ r: 6 }}
            />

            {showRates && (
              <>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="primaryOnTimeRate"
                  name="On-Time %"
                  stroke="var(--color-success-600)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--color-success-600)' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="primaryOverdueRate"
                  name="Overdue %"
                  stroke="var(--color-danger-500)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--color-danger-500)' }}
                  activeDot={{ r: 6 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
