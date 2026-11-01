import React from 'react';
import { Factory } from 'lucide-react';
import type { DepartmentBacklogItem, SalesMetric } from '../../../services/orderVolumeSummaryAPI';

interface Props {
  departments: DepartmentBacklogItem[];
  metric: SalesMetric;
  selectedDepartment: string | null;
  onSelectDepartment: (dept: string | null) => void;
}

const DEPT_COLORS: Record<string, string> = {
  'Wax / Preparation': 'var(--color-text-tertiary)',
  'Casting': 'var(--color-chart-5)',
  'Grinding': 'var(--color-chart-3)',
  'Filing': 'var(--color-warning-500)',
  'Setting': 'var(--color-danger-500)',
  'Polishing': 'var(--color-chart-4)',
  'Plating': 'var(--color-brand-500)',
  'QC': 'var(--color-accent-500)',
  'Packing': 'var(--color-success-600)',
  'Shipped': 'var(--color-success-500)'
};

export const FactoryDepartmentWIP: React.FC<Props> = ({
  departments,
  metric,
  selectedDepartment,
  onSelectDepartment
}) => {
  const totalOpenBacklogQty = departments.reduce((acc, d) => acc + (d.openQty || 0), 0);
  const totalOpenBacklogAmount = departments.reduce((acc, d) => acc + (d.openAmount || 0), 0);

  const fmtValue = (qty: number, amount: number) => {
    if (metric === 'amount') {
      return '$' + Math.round(amount).toLocaleString();
    }
    return qty.toLocaleString() + ' pcs';
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
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
            <Factory size={15} style={{ color: 'var(--color-brand-500)' }} />
            Active Production by Department
          </h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
            Total In-Production: <strong>{fmtValue(totalOpenBacklogQty, totalOpenBacklogAmount)}</strong>
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
          {departments.length} Stages
        </span>
      </div>

      {/* Department Stages List */}
      <div
        className="custom-scrollbar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          overflowY: 'auto',
          maxHeight: 280,
          paddingRight: 2
        }}
      >
        {departments.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
            No active production orders in factory departments
          </div>
        ) : (
          departments.map(dept => {
            const isSelected = selectedDepartment === dept.department;
            const pct = totalOpenBacklogQty > 0 ? (dept.openQty / totalOpenBacklogQty) * 100 : 0;
            const color = DEPT_COLORS[dept.department] || 'var(--color-brand-500)';

            return (
              <div
                key={dept.department}
                onClick={() => onSelectDepartment(isSelected ? null : dept.department)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 4,
                  background: isSelected ? 'var(--color-ui-selected)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: 'var(--color-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    {dept.department}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                      {fmtValue(dept.openQty, dept.openAmount)}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-tertiary)' }}>
                      ({dept.orderCount} ord • {pct > 0 && pct < 1 ? '< 1%' : `${pct.toFixed(0)}%`})
                    </span>
                  </div>
                </div>
                {/* Progress Track */}
                <div style={{ width: '100%', height: 4, background: 'var(--color-surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      height: '100%',
                      background: color,
                      borderRadius: 2,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
