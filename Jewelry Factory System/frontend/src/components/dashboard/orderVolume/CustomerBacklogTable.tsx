import React, { useMemo } from 'react';
import { Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CustomerBacklogItem, SalesMetric } from '../../../services/orderVolumeSummaryAPI';
import { CUSTOMER_GROUPS, getCustomerGroupId } from '../../../config/customerGroups';

interface Props {
  customers: CustomerBacklogItem[];
  metric: SalesMetric;
  selectedCustCode: string | null;
  onSelectCustCode: (custCode: string | null) => void;
  selectedGroups?: string[];
}

interface GroupSummary {
  groupId: string;
  groupLabel: string;
  color: string;
  totalOrders: number;
  totalOpenQty: number;
  totalAmount: number;
  totalQty: number;
  overdueQty: number;
  due15Qty: number;
}

export const CustomerBacklogTable: React.FC<Props> = ({
  customers,
  selectedGroups = []
}) => {
  // Aggregate data by Customer Group
  const groupSummaries: GroupSummary[] = useMemo(() => {
    const activeGroups = CUSTOMER_GROUPS.filter(g => {
      if (selectedGroups.length > 0) {
        return selectedGroups.includes(g.id);
      }
      return true;
    });

    const map = new Map<string, GroupSummary>();

    activeGroups.forEach(g => {
      map.set(g.id, {
        groupId: g.id,
        groupLabel: g.label,
        color: g.color || 'var(--color-brand-500)',
        totalOrders: 0,
        totalOpenQty: 0,
        totalAmount: 0,
        totalQty: 0,
        overdueQty: 0,
        due15Qty: 0
      });
    });

    customers.forEach(c => {
      const gId = getCustomerGroupId(c.custCode);
      if (map.has(gId)) {
        const item = map.get(gId)!;
        item.totalOrders += c.orderCount || 0;
        item.totalOpenQty += c.openQty || 0;
        item.totalAmount += c.totalAmount || 0;
        item.totalQty += c.totalQty || 0;
        item.overdueQty += c.overdueQty || 0;
        item.due15Qty += c.due15Qty || 0;
      }
    });

    return Array.from(map.values())
      .filter(g => g.totalOrders > 0 || g.totalOpenQty > 0)
      .sort((a, b) => b.totalOpenQty - a.totalOpenQty);
  }, [customers, selectedGroups]);

  const fmtCurrency = (val: number) => '$' + Math.round(val).toLocaleString();
  const fmtQty = (val: number) => val.toLocaleString() + ' pcs';

  return (
    <div
      style={{
        background: 'var(--color-surface-0)',
        border: '1px solid var(--color-border-light)',
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: 250
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: '0.86rem',
              fontWeight: 900,
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Users size={15} style={{ color: 'var(--color-brand-500)' }} />
            Pending Orders by Customer Group
          </h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
            Open orders overview by major customer groups
          </span>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 4,
            background: 'var(--color-surface-2)',
            color: 'var(--color-text-secondary)'
          }}
        >
          {groupSummaries.length} Groups
        </span>
      </div>

      {/* Customer Group Table */}
      <div className="custom-scrollbar" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 280 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ color: 'var(--color-text-tertiary)', borderBottom: '2px solid var(--color-border-light)', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', fontWeight: 850 }}>Customer Group</th>
              <th style={{ padding: '6px 8px', fontWeight: 850, textAlign: 'right' }}>Orders</th>
              <th style={{ padding: '6px 8px', fontWeight: 850, textAlign: 'right' }}>Amount ($)</th>
              <th style={{ padding: '6px 8px', fontWeight: 850, textAlign: 'right' }}>Quantity (PCS)</th>
              <th style={{ padding: '6px 8px', fontWeight: 850, textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {groupSummaries.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                  No pending orders for selected customer groups
                </td>
              </tr>
            ) : (
              groupSummaries.map(group => {
                const riskQty = group.overdueQty + group.due15Qty;
                const riskPct = group.totalQty > 0 ? (riskQty / group.totalQty) * 100 : 0;

                return (
                  <tr
                    key={group.groupId}
                    style={{
                      borderBottom: '1px solid var(--color-border-light)',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <td style={{ padding: '8px 8px', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                        {group.groupLabel}
                      </span>
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                      {group.totalOrders.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-brand-600)' }}>
                      {fmtCurrency(group.totalAmount)}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                      {fmtQty(group.totalOpenQty)}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                      {riskPct > 0 ? (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: 'var(--color-danger-600)',
                            background: 'var(--color-danger-50)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <AlertTriangle size={11} /> {riskPct.toFixed(0)}% Overdue
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: 'var(--color-success-600)',
                            background: 'var(--color-success-50)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <CheckCircle2 size={11} /> On Schedule
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
