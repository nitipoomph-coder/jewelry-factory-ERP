import { DollarSign, Hash, BarChart3, Table2, RefreshCw } from 'lucide-react';
import { ErpSegmentedControl } from '../../ui/ErpButtons';
import type { Metric, ViewMode, SalesOrderRow } from '../../../hooks/useOrderVolumeSummaryData';

interface VolumeFilterBarProps {
  metric: Metric;
  switchMetric: (m: Metric) => void;
  activeView: ViewMode;
  setActiveView: (v: ViewMode) => void;
  resetDrilldown: () => void;
  setDrilldownOrders: (orders: SalesOrderRow[]) => void;
  loading: boolean;
  loadOverviewData: () => void;
}

export function VolumeFilterBar({
  metric,
  switchMetric,
  activeView,
  setActiveView,
  resetDrilldown,
  setDrilldownOrders,
  loading,
  loadOverviewData
}: VolumeFilterBarProps) {
  return (
    <header className="customer-trends-page-header no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12 }}>
      <div className="customer-trends-page-header__actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <ErpSegmentedControl
          ariaLabel="Metric switch"
          value={metric}
          onChange={(v) => switchMetric(v as Metric)}
          options={[
            { value: 'amount', label: 'Sales ($)', icon: <DollarSign size={13} /> },
            { value: 'qty', label: 'Qty (PCS)', icon: <Hash size={13} /> },
          ]}
        />
        <div style={{ width: '1px', height: '20px', background: 'var(--color-border)' }} />
        <ErpSegmentedControl
          ariaLabel="Order Volume Summary view"
          value={activeView}
          onChange={(v) => {
            setActiveView(v as ViewMode);
            if (v === 'overview') {
              resetDrilldown();
              setDrilldownOrders([]);
            }
          }}
          options={[
            { value: 'overview', label: 'Overview', icon: <BarChart3 size={13} /> },
            { value: 'details', label: 'Order Details', icon: <Table2 size={13} /> },
          ]}
        />
        <div style={{ width: '1px', height: '20px', background: 'var(--color-border)' }} />
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadOverviewData()}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px',
            color: 'var(--color-brand-500)',
            cursor: loading ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          className="hover:bg-[var(--color-surface-2)] active:scale-95"
          title="Reload data"
          aria-label="Reload data"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
        </button>
      </div>
    </header>
  );
}

