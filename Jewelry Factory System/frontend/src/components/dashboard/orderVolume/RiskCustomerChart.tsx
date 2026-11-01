import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SalesRiskPoint, SalesMetric } from '../../../services/orderVolumeSummaryAPI';
import { CUSTOMER_GROUPS } from '../../../config/customerGroups';
import { fmtCurrency, fmtQty } from '../../../hooks/useOrderVolumeSummaryData';

interface Props {
  riskData: SalesRiskPoint[];
  metric: SalesMetric;
  selectedGroups: string[];
}

export const RiskCustomerChart: React.FC<Props> = ({ riskData, metric, selectedGroups }) => {
  const groupsToDisplay = useMemo(() => {
    if (selectedGroups.length === 0) return CUSTOMER_GROUPS.map(g => g.id);
    return selectedGroups;
  }, [selectedGroups]);

  const chartData = useMemo(() => {
    const getGroupForCustCode = (custCode: string) => {
      for (const group of CUSTOMER_GROUPS) {
        if (group.prefixes.some(p => custCode.startsWith(p))) return group.id;
      }
      return 'Other';
    };

    const groupMap: Record<string, { wip: number, overdue: number, safe: number }> = {};
    for (const g of groupsToDisplay) {
      groupMap[g] = { wip: 0, overdue: 0, safe: 0 };
    }

    riskData.forEach(row => {
      const gId = getGroupForCustCode(row.custCode);
      if (groupsToDisplay.includes(gId)) {
        const wipVal = metric === 'amount' ? row.wipAmount : row.wipQty;
        const overdueVal = metric === 'amount' ? row.overdueAmount : row.overdueQty;
        
        groupMap[gId].wip += wipVal;
        groupMap[gId].overdue += overdueVal;
        groupMap[gId].safe += Math.max(0, wipVal - overdueVal);
      }
    });

    return groupsToDisplay.map(gId => {
      const g = CUSTOMER_GROUPS.find(x => x.id === gId);
      return {
        id: gId,
        label: g?.label || gId,
        wip: groupMap[gId].wip,
        overdue: groupMap[gId].overdue,
        safe: groupMap[gId].safe,
        color: g?.color || 'var(--color-info-500)'
      };
    });
  }, [riskData, metric, groupsToDisplay]);

  const formatAxisValue = (value: number) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    if (metric === 'qty') return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-[var(--color-ui-surface)] rounded-md py-[14px] px-4 border border-[var(--color-border-light)] flex flex-col w-full">
      <div className="flex justify-between items-center mb-1.5">
        <h3 className="m-0 text-[0.86rem] font-black text-[var(--color-text-primary)]">
          Delivery Risk by Customer Group
        </h3>
        <span className="text-[0.7rem] text-[var(--color-text-tertiary)] font-bold">
          On Schedule vs Overdue • {metric === 'amount' ? 'USD ($)' : 'Pieces (PCS)'}
        </span>
      </div>

      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 15, left: 5, bottom: 2 }} barGap={0} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 700 }} axisLine={false} tickLine={false} dy={4} />
            <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 10, fill: 'var(--color-text-quaternary)', fontWeight: 700 }} axisLine={false} tickLine={false} dx={-4} width={55} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[var(--color-ui-surface)] py-3 px-4 border border-[var(--color-border-light)] rounded-md shadow-[var(--shadow-dropdown)]">
                      <p className="m-0 mb-2 font-black text-[length:var(--erp-text-panel)] text-[var(--color-text-primary)] border-b border-[var(--color-border-light)] pb-1.5">{label}</p>
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-[10px] h-[10px] rounded-sm" style={{ background: entry.color }} />
                            <span className="text-[length:var(--erp-text-control)] text-[var(--color-text-secondary)] font-bold">{entry.name}</span>
                          </div>
                          <span className="text-[length:var(--erp-text-body)] text-[var(--color-text-primary)] font-black">
                            {metric === 'amount' ? fmtCurrency(Number(entry.value)) : fmtQty(Number(entry.value))}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'var(--color-surface-1)', opacity: 0.4 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 4, fontSize: '11px' }}
              formatter={(value) => (
                <span className="text-[var(--color-text-secondary)] font-bold mr-2">
                  {value}
                </span>
              )}
            />
            <Bar dataKey="safe" stackId="a" name="On Schedule" fill="var(--color-info-500)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="overdue" stackId="a" name="Overdue / At Risk" fill="var(--color-danger-500)" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
