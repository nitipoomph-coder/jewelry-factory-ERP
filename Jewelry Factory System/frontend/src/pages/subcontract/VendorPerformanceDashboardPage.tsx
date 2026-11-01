// src/pages/subcontract/VendorPerformanceDashboardPage.tsx
import { useState, type CSSProperties } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { BREADCRUMBS } from '../../config/breadcrumbs';
import CustomSelect from '../../components/ui/CustomSelect';
import { Users, ClipboardList, Clock, CalendarClock, ShieldAlert, AlertTriangle, BarChart3, Search } from 'lucide-react';

const NOT_CONNECTED_COLOR = 'var(--color-text-quaternary)';

const KPI_TILES = [
  { id: 'vendors', label: 'TOTAL VENDORS', icon: <Users size={20} /> },
  { id: 'orders', label: 'TOTAL ORDERS', icon: <ClipboardList size={20} /> },
  { id: 'ontime', label: 'ON-TIME DELIVERY', icon: <Clock size={20} /> },
  { id: 'leadtime', label: 'AVG. LEAD TIME', icon: <CalendarClock size={20} /> },
  { id: 'defect', label: 'DEFECT RATE', icon: <ShieldAlert size={20} /> },
];

const CHART_CARDS = [
  { id: 'ontime', title: 'On-Time Delivery %' },
  { id: 'leadtime', title: 'Avg. Lead Time (Days)' },
  { id: 'defect', title: 'Defect Rate (%)' },
];

const labelStyle: CSSProperties = { fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' };
const thBase: CSSProperties = { padding: '10px 12px', fontSize: '0.68rem', fontWeight: 900, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.06em', textAlign: 'center', borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)' };

export default function VendorPerformanceDashboardPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [subcontract, setSubcontract] = useState('');
  const [department, setDepartment] = useState('');
  const [process, setProcess] = useState('');
  const [itemGroup, setItemGroup] = useState('');

  return (
    <div className="app-page font-body">
      <PageHeader breadcrumb={BREADCRUMBS.VENDOR_PERFORMANCE} contentLayout="dashboard-wide" />

      <div className="app-page-scroll content-scrollbar">
      <div className="app-content-frame app-content-frame--dashboard-wide app-page-content vendor-page flex flex-col gap-4">

        {/* ─── Not-connected notice ─── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 18px', borderRadius: '8px',
          background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-100)'
        }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-warning-600)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--color-warning-600)' }}>Not connected to real data: </strong>
            Filter KPI Charts and tables will display when there is Stored Procedure for data Vendor/Subcontract
          </div>
        </div>

        {/* ─── Filters ─── */}
        <div className="vendor-filter-bar" style={{
          display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end',
          background: 'var(--color-ui-surface)', borderRadius: '8px', border: '1px solid var(--color-border-light)',
          padding: '18px 20px', boxShadow: 'var(--shadow-panel)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '260px' }}>
            <label style={labelStyle}>Date Range</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', border: '1px solid var(--color-border-strong)', borderRadius: '8px', background: 'var(--color-surface-0)' }}>
              <input disabled type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.65rem', fontWeight: 800 }}>TO</span>
              <input disabled type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Subcontract</label>
            <CustomSelect disabled value={subcontract} onChange={setSubcontract} options={[{ value: '', label: 'All' }]} width="140px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Department</label>
            <CustomSelect disabled value={department} onChange={setDepartment} options={[{ value: '', label: 'All' }]} width="140px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Process</label>
            <CustomSelect disabled value={process} onChange={setProcess} options={[{ value: '', label: 'All' }]} width="140px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Item Group</label>
            <CustomSelect disabled value={itemGroup} onChange={setItemGroup} options={[{ value: '', label: 'All' }]} width="140px" />
          </div>
          <button
            disabled
            title="Not connected to real data"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px',
              background: 'var(--color-surface-2)', color: 'var(--color-text-quaternary)', border: 'none',
              fontSize: '0.8rem', fontWeight: 800, cursor: 'not-allowed'
            }}
          >
            <Search size={16} />
            Search
          </button>
        </div>

        {/* ─── KPI Tiles (flat icon-circle — same convention as PO Tracker) ─── */}
        <div className="vendor-kpi-grid">
          {KPI_TILES.map((tile) => (
            <div
              key={tile.id}
              style={{
                background: 'var(--color-ui-surface)', padding: '20px', borderRadius: '8px',
                border: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', gap: '14px',
                boxShadow: 'var(--shadow-panel)'
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `color-mix(in srgb, ${NOT_CONNECTED_COLOR} 16%, var(--color-surface-1))`, color: NOT_CONNECTED_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {tile.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>{tile.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: NOT_CONNECTED_COLOR, margin: '2px 0 0', fontFamily: 'var(--font-display)' }}>N/A</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Chart Cards (empty state — no fabricated numbers) ─── */}
        <div className="vendor-chart-grid">
          {CHART_CARDS.map((chart) => (
            <div key={chart.id} style={{ background: 'var(--color-ui-surface)', borderRadius: '8px', border: '1px solid var(--color-border-light)', padding: '18px', boxShadow: 'var(--shadow-panel)' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px', fontFamily: 'var(--font-display)' }}>{chart.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '40px 16px', color: 'var(--color-text-quaternary)' }}>
                <BarChart3 size={28} style={{ opacity: 0.4 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>No data available</span>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Vendor Performance Detail (grouped headers + empty state + Grand Total) ─── */}
        <div style={{ background: 'var(--color-ui-surface)', borderRadius: '8px', border: '1px solid var(--color-border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-panel)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>Vendor Performance Detail</h3>
          </div>
          <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: 'var(--font-body)' }}>
              <thead>
                <tr>
                  <th style={thBase} rowSpan={2}>Vendor Code</th>
                  <th style={thBase} rowSpan={2}>Vendor Name</th>
                  <th style={thBase} rowSpan={2}>Total Orders</th>
                  <th style={thBase} rowSpan={2}>Total Qty (Pcs)</th>
                  <th style={thBase} colSpan={3}>On-Time Delivery</th>
                  <th style={thBase} rowSpan={2}>Avg Lead Time (Days)</th>
                  <th style={thBase} rowSpan={2}>Receive Qty (Pcs)</th>
                  <th style={thBase} rowSpan={2}>Repair Qty (Pcs)</th>
                  <th style={{ ...thBase, borderRight: 'none' }} rowSpan={2}>Defect Rate (%)</th>
                </tr>
                <tr>
                  <th style={thBase}>On-Time</th>
                  <th style={thBase}>Late</th>
                  <th style={thBase}>%</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={11} style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--color-text-quaternary)', fontSize: '0.85rem', borderBottom: '1px solid var(--color-border-strong)' }}>
                    <ClipboardList size={28} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
                    <div style={{ fontWeight: 800 }}>No vendor performance data available</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.7 }}>Not connected to database</div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ padding: '12px', fontWeight: 900, color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)' }}>Grand Total</td>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <td key={i} style={{ padding: '12px', textAlign: 'center', fontWeight: 800, color: 'var(--color-text-quaternary)', borderTop: '1px solid var(--color-border-strong)', borderRight: i < 8 ? '1px solid var(--color-border-strong)' : 'none' }}>N/A</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
