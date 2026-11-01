import { useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

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

export interface ForecastDataPoint {
  periodLabel: string;
  totalOrder: number;
  totalDone: number;
  totalRemain: number;
  [key: string]: unknown;
}

interface ProductionForecastChartProps {
  data: ForecastDataPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; [key: string]: unknown }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const finish = Number(payload.find((p) => p.dataKey === 'totalDone')?.value || 0);
    const remain = Number(payload.find((p) => p.dataKey === 'totalRemain')?.value || 0);
    const total = finish + remain;
    
    return (
      <div className="p-3 rounded-lg border border-[var(--color-border-light)] min-w-[200px] bg-[var(--color-ui-surface)] shadow-[var(--shadow-dropdown)]">
        <p className="text-[length:var(--erp-text-panel)] font-black text-[var(--color-text-primary)] mb-2 border-b border-[var(--color-border-light)] pb-1.5">
          {label}
        </p>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-extrabold">
            <span className="text-[var(--color-text-secondary)]">Finish Qty:</span>
            <span className="text-[var(--color-success-600)]">{finish.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[11px] font-extrabold">
            <span className="text-[var(--color-text-secondary)]">Balance Qty:</span>
            <span className="text-[var(--color-danger-600)]">{remain.toLocaleString()}</span>
          </div>
          <div className="border-t border-dashed border-[var(--color-border-light)] my-1" />
          <div className="flex justify-between text-xs font-black">
            <span className="text-[var(--color-text-primary)]">Total Order:</span>
            <span>{total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function ProductionForecastChart({ data }: ProductionForecastChartProps) {
  const { processedData, yAxisMax, yAxisTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { processedData: [], yAxisMax: 100, yAxisTicks: [0, 50, 100] };
    }

    let maxTotal = 0;

    const pData = data.map(d => {
      if (d.totalOrder > maxTotal) maxTotal = d.totalOrder;
      
      return {
        ...d,
        _balanceLabelY: d.totalRemain > 0 ? d.totalOrder : null
      };
    });

    const BAR_ZONE = 0.8; // Give bars 80% height to fit labels
    let calculatedYMax = 100;
    let calculatedTicks: number[] = [0, 50, 100];

    if (maxTotal > 0) {
      const pTarget = maxTotal / BAR_ZONE;
      const pInt = niceNum(pTarget / 8.0, false); 
      calculatedYMax = Math.ceil(pTarget / pInt) * pInt;

      calculatedTicks = [];
      for (let val = 0; val <= calculatedYMax; val += pInt) {
        calculatedTicks.push(val);
      }
    }

    return { processedData: pData, yAxisMax: calculatedYMax, yAxisTicks: calculatedTicks };
  }, [data]);

  const isCrowded = processedData.length > 14;

  const renderBalanceLabel = (props: { x?: number | string; y?: number | string; value?: unknown; width?: number | string }) => {
    const x = Number(props.x || 0);
    const y = Number(props.y || 0);
    const width = Number(props.width || 0);
    const value = props.value;
    if (!value || Number(value) === 0) return <g />;
    
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="var(--color-danger-600)"
        textAnchor="middle"
        fontSize={isCrowded ? 8.5 : 10}
        fontWeight={800}
      >
        {Number(value).toLocaleString()}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={processedData} margin={{ top: 20, right: 24, left: 0, bottom: isCrowded ? 24 : 5 }} barGap={0} barCategoryGap="25%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border-light)" />
        <XAxis 
          dataKey="periodLabel" 
          tick={{ fontSize: isCrowded ? 9.5 : 11, fill: 'var(--color-text-secondary)', fontWeight: 600 }} 
          axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }}
          tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }} 
          tickMargin={isCrowded ? 4 : 8}
          interval={0}
          angle={isCrowded ? -45 : 0}
          textAnchor={isCrowded ? 'end' : 'middle'}
          tickFormatter={(val) => {
            if (typeof val === 'string' && val.length === 10 && val.includes('/')) {
              const parts = val.split('/');
              if (parts.length === 3) return `${parts[0]}/${parts[1]}`;
            }
            if (typeof val === 'string') {
              return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
            }
            return String(val);
          }}
          height={isCrowded ? 45 : 30}
        />
        <YAxis 
          domain={[0, yAxisMax]}
          ticks={yAxisTicks}
          interval={0}
          tickFormatter={(val) => val.toLocaleString()} 
          tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 500 }} 
          axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }}
          tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }} 
          tickMargin={6} 
          width={60} 
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface-1)', opacity: 0.4 }} />
        
        {/* Finish Qty (Green) */}
        <Bar 
          dataKey="totalDone" 
          stackId="a" 
          fill="var(--color-success-500)" 
          maxBarSize={40}
          isAnimationActive={true}
          animationDuration={600}
          radius={[0, 0, 0, 0]}
        />
        
        {/* Balance Qty (Red) */}
        <Bar 
          dataKey="totalRemain" 
          stackId="a" 
          fill="var(--color-danger-500)" 
          radius={[0, 0, 0, 0]}
          maxBarSize={40}
          isAnimationActive={true}
          animationDuration={600}
        >
          {/* Label for Balance Qty shown on top of the red bar */}
          <LabelList dataKey="totalRemain" content={renderBalanceLabel} />
        </Bar>

      </ComposedChart>
    </ResponsiveContainer>
  );
}
