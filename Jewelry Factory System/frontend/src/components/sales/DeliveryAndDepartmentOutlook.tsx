import React from 'react';
import {
  Clock,
  Calendar,
  Layers,
  Flame,
  Factory
} from 'lucide-react';
import type { DeliveryOutlookResponse, SalesMetric } from '../../services/orderVolumeSummaryAPI';
import { CustomerBacklogTable } from '../dashboard/orderVolume/CustomerBacklogTable';

interface Props {
  data: DeliveryOutlookResponse | null;
  metric: SalesMetric;
  year?: string;
  loading?: boolean;
  selectedBucket: string | null;
  selectedDepartment: string | null;
  selectedCustCode: string | null;
  onSelectBucket: (bucket: string | null) => void;
  onSelectDepartment: (dept: string | null) => void;
  onSelectCustCode: (custCode: string | null) => void;
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

export const DeliveryAndDepartmentOutlook: React.FC<Props> = ({
  data,
  metric,
  selectedBucket,
  selectedDepartment,
  selectedCustCode,
  onSelectBucket,
  onSelectDepartment,
  onSelectCustCode
}) => {
  const buckets = data?.buckets || [];
  const departments = data?.departments || [];
  const customers = data?.customers || [];

  // Helper to extract bucket stats
  const getBucketStats = (name: string) => {
    const b = buckets.find(x => x.bucket?.toLowerCase() === name.toLowerCase());
    return {
      orderCount: b?.orderCount || 0,
      lineCount: b?.lineCount || 0,
      openQty: b?.openQty || 0,
      openAmount: b?.openAmount || 0,
      totalQty: b?.totalQty || 0,
      totalAmount: b?.totalAmount || 0
    };
  };

  const overdue = getBucketStats('Overdue');
  const due15 = getBucketStats('Due in 15 Days');
  const due30 = getBucketStats('Due in 16-30 Days');
  const future = getBucketStats('Future Due');

  const totalOpenBacklogQty = departments.reduce((acc, d) => acc + (d.openQty || 0), 0);
  const totalOpenBacklogAmount = departments.reduce((acc, d) => acc + (d.openAmount || 0), 0);

  const fmtValue = (qty: number, amount: number) => {
    if (metric === 'amount') {
      return '$' + Math.round(amount).toLocaleString();
    }
    return qty.toLocaleString() + ' pcs';
  };

  return (
    <div className="delivery-department-outlook" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>

      {/* ─── 1. Header & Context ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Factory size={18} style={{ color: 'var(--color-brand-500)' }} />
            Customer Delivery Outlook & Factory Department Bottlenecks
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
            Scheduled by Customer Due Date (CustDueDate) • Real-time Factory Work-in-Process (WIP)
          </span>
        </div>

        {(selectedBucket || selectedDepartment || selectedCustCode) && (
          <button
            type="button"
            onClick={() => {
              onSelectBucket(null);
              onSelectDepartment(null);
              onSelectCustCode(null);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
              fontSize: '0.75rem', fontWeight: 800, borderRadius: 6,
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-secondary)', cursor: 'pointer'
            }}
          >
            Clear Active Filter ({[selectedBucket, selectedDepartment, selectedCustCode].filter(Boolean).join(' • ')})
          </button>
        )}
      </div>

      {/* ─── 2. Risk Buckets (4 Strategic Cards) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>

        {/* Overdue Card */}
        <div
          onClick={() => onSelectBucket(selectedBucket === 'Overdue' ? null : 'Overdue')}
          style={{
            background: 'var(--color-surface-0)',
            border: selectedBucket === 'Overdue' ? '2px solid var(--color-danger-500)' : '1px solid var(--color-border-light)',
            borderLeft: '4px solid var(--color-danger-500)',
            borderRadius: 8,
            padding: '12px 14px',
            cursor: 'pointer',
            boxShadow: selectedBucket === 'Overdue' ? '0 0 0 2px color-mix(in srgb, var(--color-danger-500) 20%, transparent)' : 'var(--shadow-panel)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-danger-600)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Flame size={14} /> Overdue
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--color-danger-50)', color: 'var(--color-danger-600)' }}>
              {overdue.orderCount} Orders
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 2 }}>
            {fmtValue(overdue.openQty, overdue.openAmount)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
            Past customer due date
          </div>
        </div>

        {/* Due in 15 Days Card */}
        <div
          onClick={() => onSelectBucket(selectedBucket === 'Due in 15 Days' ? null : 'Due in 15 Days')}
          style={{
            background: 'var(--color-surface-0)',
            border: selectedBucket === 'Due in 15 Days' ? '2px solid var(--color-warning-500)' : '1px solid var(--color-border-light)',
            borderLeft: '4px solid var(--color-warning-500)',
            borderRadius: 8,
            padding: '12px 14px',
            cursor: 'pointer',
            boxShadow: selectedBucket === 'Due in 15 Days' ? '0 0 0 2px color-mix(in srgb, var(--color-warning-500) 20%, transparent)' : 'var(--shadow-panel)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-warning-600)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={14} /> Due in 15 Days
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--color-warning-50)', color: 'var(--color-warning-600)' }}>
              {due15.orderCount} Orders
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 2 }}>
            {fmtValue(due15.openQty, due15.openAmount)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
            High-alert upcoming window
          </div>
        </div>

        {/* Due in 16-30 Days Card */}
        <div
          onClick={() => onSelectBucket(selectedBucket === 'Due in 16-30 Days' ? null : 'Due in 16-30 Days')}
          style={{
            background: 'var(--color-surface-0)',
            border: selectedBucket === 'Due in 16-30 Days' ? '2px solid var(--color-success-500)' : '1px solid var(--color-border-light)',
            borderLeft: '4px solid var(--color-success-500)',
            borderRadius: 8,
            padding: '12px 14px',
            cursor: 'pointer',
            boxShadow: selectedBucket === 'Due in 16-30 Days' ? '0 0 0 2px color-mix(in srgb, var(--color-success-500) 20%, transparent)' : 'var(--shadow-panel)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-success-600)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={14} /> Due 16–30 Days
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--color-success-50)', color: 'var(--color-success-700)' }}>
              {due30.orderCount} Orders
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 2 }}>
            {fmtValue(due30.openQty, due30.openAmount)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
            In active production cycle
          </div>
        </div>

        {/* Future Due Card */}
        <div
          onClick={() => onSelectBucket(selectedBucket === 'Future Due' ? null : 'Future Due')}
          style={{
            background: 'var(--color-surface-0)',
            border: selectedBucket === 'Future Due' ? '2px solid var(--color-brand-500)' : '1px solid var(--color-border-light)',
            borderLeft: '4px solid var(--color-brand-500)',
            borderRadius: 8,
            padding: '12px 14px',
            cursor: 'pointer',
            boxShadow: selectedBucket === 'Future Due' ? '0 0 0 2px color-mix(in srgb, var(--color-brand-500) 20%, transparent)' : 'var(--shadow-panel)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-brand-600)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Layers size={14} /> Future (&gt;30 Days)
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}>
              {future.orderCount} Orders
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 2 }}>
            {fmtValue(future.openQty, future.openAmount)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
            Advance planned orders
          </div>
        </div>

      </div>

      {/* ─── 3. Main Operational Breakdown Grid ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Left Panel: Department Bottleneck Pipeline */}
        <div style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                Work in Process by Factory Department
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                Total Active Backlog: <strong>{fmtValue(totalOpenBacklogQty, totalOpenBacklogAmount)}</strong>
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 800 }}>
              {departments.length} Stages
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {departments.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                No active backlog in factory departments for selected period
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
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: isSelected ? 'var(--color-surface-1)' : 'transparent',
                      border: isSelected ? `1px solid ${color}` : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        {dept.department}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                          {fmtValue(dept.openQty, dept.openAmount)}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)', minWidth: 60, textAlign: 'right' }}>
                          {dept.orderCount} Orders
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-tertiary)', minWidth: 38, textAlign: 'right' }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Track */}
                    <div style={{ width: '100%', height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          height: '100%',
                          background: color,
                          borderRadius: 3,
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

        {/* Right Panel: Customer Code Backlog Table */}
        <CustomerBacklogTable 
          customers={customers} 
          metric={metric} 
          selectedCustCode={selectedCustCode} 
          onSelectCustCode={onSelectCustCode} 
        />
      </div>
    </div>
  );
};
