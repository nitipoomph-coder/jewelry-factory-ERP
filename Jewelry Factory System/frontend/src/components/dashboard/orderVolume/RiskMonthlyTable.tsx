import React, { useMemo } from 'react';
import type { SalesRiskPoint, SalesMetric } from '../../../services/orderVolumeSummaryAPI';
import { CUSTOMER_GROUPS } from '../../../config/customerGroups';
import { fmtCurrency, fmtQty } from '../../../hooks/useOrderVolumeSummaryData';

interface Props {
  riskData: SalesRiskPoint[];
  metric: SalesMetric;
  selectedGroups: string[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const RiskMonthlyTable: React.FC<Props> = ({ riskData, metric, selectedGroups }) => {
  const groupsToDisplay = useMemo(() => {
    if (selectedGroups.length === 0) return CUSTOMER_GROUPS.map(g => g.id);
    return selectedGroups;
  }, [selectedGroups]);

  const groupLabels = useMemo(() => {
    return groupsToDisplay.map(gId => {
      const g = CUSTOMER_GROUPS.find(x => x.id === gId);
      return { id: gId, label: g?.label || gId };
    });
  }, [groupsToDisplay]);

  // Aggregate by Month and Group
  // riskData has custCode. We need to map custCode to Group.
  const getGroupForCustCode = (custCode: string) => {
    for (const group of CUSTOMER_GROUPS) {
      if (group.prefixes.some((p: string) => custCode.startsWith(p))) return group.id;
    }
    return 'Other';
  };

  const matrix = useMemo(() => {
    const table: Record<number, Record<string, { wip: number, overdue: number }>> = {};
    for (let m = 1; m <= 12; m++) {
      table[m] = {};
      for (const g of groupsToDisplay) {
        table[m][g] = { wip: 0, overdue: 0 };
      }
      table[m]['Total'] = { wip: 0, overdue: 0 };
    }

    riskData.forEach(row => {
      const gId = getGroupForCustCode(row.custCode);
      if (groupsToDisplay.includes(gId) && table[row.month]) {
        const wipVal = metric === 'amount' ? row.wipAmount : row.wipQty;
        const overdueVal = metric === 'amount' ? row.overdueAmount : row.overdueQty;
        
        table[row.month][gId].wip += wipVal;
        table[row.month][gId].overdue += overdueVal;
        
        table[row.month]['Total'].wip += wipVal;
        table[row.month]['Total'].overdue += overdueVal;
      }
    });

    return table;
  }, [riskData, metric, groupsToDisplay]);

  return (
    <div className="risk-monthly-table" style={{ marginTop: 24, overflowX: 'auto', background: 'var(--color-surface-0)', borderRadius: 8, border: '1px solid var(--color-border-light)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--erp-text-section)', fontWeight: 900, color: 'var(--color-text-primary)' }}>
          Monthly WIP & Risk Matrix
        </h3>
        <p style={{ margin: 0, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
          Breakdown by Order Month and Customer Group. Unit: {metric === 'amount' ? 'USD ($)' : 'Pieces (PCS)'}
        </p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 'var(--erp-text-body)' }}>
        <thead style={{ background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)' }}>
          <tr>
            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 900, borderBottom: '2px solid var(--color-border-strong)' }}>Month</th>
            {groupLabels.map(g => (
              <th key={g.id} style={{ padding: '10px 16px', fontWeight: 900, borderBottom: '2px solid var(--color-border-strong)' }}>{g.label}</th>
            ))}
            <th style={{ padding: '10px 16px', fontWeight: 900, borderBottom: '2px solid var(--color-border-strong)', borderLeft: '1px solid var(--color-border-light)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((monthName, idx) => {
            const m = idx + 1;
            const rowData = matrix[m];
            if (!rowData) return null;
            
            // Skip rows with no data at all if desired, but standard is to show all 12 months
            const hasData = rowData['Total'].wip > 0;
            
            return (
              <tr key={m} style={{ borderBottom: '1px solid var(--color-border-light)', background: hasData ? 'transparent' : 'var(--color-surface-50)', opacity: hasData ? 1 : 0.6 }}>
                <td style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-primary)' }}>{monthName}</td>
                {groupsToDisplay.map(gId => {
                  const data = rowData[gId];
                  return (
                    <td key={gId} style={{ padding: '10px 16px', color: data.wip > 0 ? 'var(--color-text-primary)' : 'var(--color-text-quaternary)' }}>
                      <div style={{ fontWeight: 800 }}>{metric === 'amount' ? fmtCurrency(data.wip) : fmtQty(data.wip)}</div>
                      {data.overdue > 0 && (
                        <div style={{ fontSize: 'var(--erp-text-dense)', color: 'var(--color-danger-600)', fontWeight: 800 }}>
                          {metric === 'amount' ? fmtCurrency(data.overdue) : fmtQty(data.overdue)} Risk
                        </div>
                      )}
                    </td>
                  );
                })}
                <td style={{ padding: '10px 16px', borderLeft: '1px solid var(--color-border-light)', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                  <div>{metric === 'amount' ? fmtCurrency(rowData['Total'].wip) : fmtQty(rowData['Total'].wip)}</div>
                  {rowData['Total'].overdue > 0 && (
                    <div style={{ fontSize: 'var(--erp-text-dense)', color: 'var(--color-danger-600)' }}>
                      {metric === 'amount' ? fmtCurrency(rowData['Total'].overdue) : fmtQty(rowData['Total'].overdue)} Risk
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
