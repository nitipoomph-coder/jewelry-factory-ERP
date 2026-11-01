// src/pages/ItemDetailPage.tsx
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { AlertTriangle, Image as ImageIcon, CheckCircle, FileText, Settings, Layers, Hash, Box } from 'lucide-react';

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  
  const [activeTab, setActiveTab] = useState<'stone' | 'finding' | 'cast'>('stone');

  const itemData: ItemData = {
    itemNo: id || 'UNKNOWN',
    pdsNo: '', from: '', psNo: '', customer: '', sales: '', productType: '',
    collection: '', devNo: '', metal: '', stampOn: '', plating: '', dueDate: '',
    targetPrice: '', castWt: '', filingWt: '', finishWt: '',
    remarks: []
  };

  const stoneList: StoneRow[] = [];

  return (
    <div className="app-page item-detail-page">
      <PageHeader breadcrumb={BREADCRUMBS.ITEM_DETAIL(itemData.itemNo)} contentLayout="dashboard" />

      <div className="app-page-scroll custom-scrollbar">
      <div className="app-content-frame app-content-frame--dashboard app-page-content">

        <div className="mb-4 flex items-start gap-3 rounded-lg border border-[var(--color-warning-100)] bg-[var(--color-warning-50)] p-3 text-[length:var(--erp-text-body)] text-[var(--color-text-secondary)]">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--color-warning-600)]" />
          <span>Item specification data is not connected yet. Only the item number from the route is shown.</span>
        </div>

        {/* Action Bar */}
        <div className="item-detail-actionbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>

            <div style={{
              padding: '10px 24px', background: 'var(--color-brand-500)',
              color: 'var(--color-ui-on-interactive)', borderRadius: '8px', fontWeight: 900,
              fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '12px',
              fontFamily: 'var(--font-display)', letterSpacing: '0.02em'
            }}>
              <Box size={20} /> ITEM: {itemData.itemNo}
            </div>
          </div>
        </div>

        {/* ─── MASTER DASHBOARD CARD ─── */}
        <div style={{
          background: 'var(--color-surface-0)', borderRadius: '8px',
          border: '1px solid var(--color-border-light)',
          boxShadow: 'var(--shadow-panel)',
          overflow: 'hidden', marginBottom: '24px'
        }}>

          <div className="item-detail-master" style={{ display: 'flex', flexWrap: 'wrap' }}>

            {/* Left Column */}
            <div className="item-detail-master__identity" style={{ flex: '1 1 280px', padding: '24px', borderRight: '1px solid var(--color-border-light)', background: 'color-mix(in srgb, var(--color-surface-1), transparent 50%)' }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--color-brand-600)', marginBottom: '24px', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.1em' }}>
                <Hash size={16} /> Identity Matrix
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <FieldRow label="PDS Number" value={itemData.pdsNo} highlight />
                <FieldRow label="Reference" value={itemData.from} />
                <FieldRow label="PS Series" value={itemData.psNo} />
                <FieldRow label="Client" value={itemData.customer} bold />
                <FieldRow label="Lead Sales" value={itemData.sales} />
                <FieldRow label="Category" value={itemData.productType} />
                <FieldRow label="Collection" value={itemData.collection} />
                <FieldRow label="Dev ID" value={itemData.devNo} />
              </div>
            </div>

            {/* Middle Column */}
            <div className="item-detail-master__spec" style={{ flex: '2 1 500px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="item-detail-images" style={{ display: 'flex', gap: '16px', height: '220px' }}>
                <div style={{ flex: 1, background: 'var(--color-surface-1)', borderRadius: '8px', border: '1px dashed var(--color-border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <ImageIcon size={40} style={{ color: 'var(--color-text-quaternary)', opacity: 0.3 }} />
                  <div style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>Front View</div>
                </div>
                <div style={{ flex: 1, background: 'var(--color-surface-1)', borderRadius: '8px', border: '1px dashed var(--color-border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <ImageIcon size={40} style={{ color: 'var(--color-text-quaternary)', opacity: 0.3 }} />
                  <div style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>Side View</div>
                </div>
              </div>

              <div className="item-detail-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <FieldRow label="Metal Base" value={itemData.metal} highlight />
                  <FieldRow label="Stamp Logic" value={itemData.stampOn} />
                  <FieldRow label="Surface" value={itemData.plating} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <FieldRow label="Target Due" value={itemData.dueDate} warning />
                  <FieldRow label="Valuation" value={`$${itemData.targetPrice}`} />
                  <div style={{ background: 'var(--color-surface-1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>WEIGHTS (G)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>Cast: <b>{itemData.castWt}</b></span>
                      <span>Filing: <b>{itemData.filingWt}</b></span>
                      <span>Finish: <b>{itemData.finishWt}</b></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="item-detail-master__notes" style={{ flex: '1 1 280px', padding: '24px', borderLeft: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)' }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: '24px', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={16} /> Production Notes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {itemData.remarks.map((rmk: string, idx: number) => (
                  <div key={idx} style={{ background: 'var(--color-surface-1)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border-light)', fontSize: '0.75rem' }}>
                    <b>Note {idx + 1}:</b> {rmk}
                  </div>
                ))}
                {itemData.remarks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-4 text-[length:var(--erp-text-body)] text-[var(--color-text-tertiary)]">No production notes available.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM TABS */}
        <div style={{ background: 'var(--color-surface-0)', borderRadius: '8px', border: '1px solid var(--color-border-light)', overflow: 'hidden' }}>
          <div className="item-detail-tabs" style={{ display: 'flex', background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border-light)' }}>
            <TabBtn label={`Stones (${stoneList.length})`} active={activeTab === 'stone'} onClick={() => setActiveTab('stone')} icon={<Layers size={16} />} />
            <TabBtn label="Findings" active={activeTab === 'finding'} onClick={() => setActiveTab('finding')} icon={<Settings size={16} />} />
            <TabBtn label="Casting" active={activeTab === 'cast'} onClick={() => setActiveTab('cast')} icon={<CheckCircle size={16} />} />
          </div>

          <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
            <table className="item-detail-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  {['No.', 'Stone Code', 'Visual', 'Stone Name', 'Shape', 'Size', 'Cut', 'Grade', 'Set', 'Wt (ct)', 'Qty', 'Modified'].map((h, i) => (
                    <th key={h} style={{
                      background: 'var(--color-surface-2)',
                      padding: '16px 20px', fontSize: '0.65rem', fontWeight: 900,
                      color: 'var(--color-text-tertiary)', textAlign: i > 8 && i < 11 ? 'right' : i === 2 ? 'center' : 'left',
                      borderBottom: '2px solid var(--color-border-light)',
                      position: 'sticky', top: 0, zIndex: 10
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'stone' && stoneList.map((st, i) => (
                  <tr key={i} className="detail-row-hover" style={{ background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--color-surface-1), transparent 80%)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--color-brand-600)', borderBottom: '1px solid var(--color-border-light)' }}>{st.no}</td>
                    <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>{st.code}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', borderBottom: '1px solid var(--color-border-light)' }}><ImageIcon size={16} style={{ color: 'var(--color-text-quaternary)', opacity: 0.5 }} /></td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, borderBottom: '1px solid var(--color-border-light)' }}>{st.name}</td>
                    <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>{st.shape}</td>
                    <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>{st.size}</td>
                    <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>{st.cut}</td>
                    <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>{st.grade}</td>
                    <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>{st.set}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', borderBottom: '1px solid var(--color-border-light)' }}>{st.wt}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--color-brand-600)', borderBottom: '1px solid var(--color-border-light)' }}>{st.qty}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-text-tertiary)', fontSize: '0.7rem', borderBottom: '1px solid var(--color-border-light)' }}>{st.modifyDate}</td>
                  </tr>
                ))}
                {stoneList.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-10 text-center text-[length:var(--erp-text-body)] text-[var(--color-text-tertiary)]">
                      No {activeTab} data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
      <style>{`
        .detail-row-hover:hover { background: color-mix(in srgb, var(--color-brand-500), transparent 96%) !important; }
      `}</style>
    </div>
  );
}

interface ItemData {
  itemNo: string;
  pdsNo: string;
  from: string;
  psNo: string;
  customer: string;
  sales: string;
  productType: string;
  collection: string;
  devNo: string;
  metal: string;
  stampOn: string;
  plating: string;
  dueDate: string;
  targetPrice: string;
  castWt: string;
  filingWt: string;
  finishWt: string;
  remarks: string[];
}

interface StoneRow {
  no: string | number;
  code: string;
  name: string;
  shape: string;
  size: string;
  cut: string;
  grade: string;
  set: string;
  wt: string | number;
  qty: string | number;
  modifyDate: string;
}

interface FieldRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  bold?: boolean;
  warning?: boolean;
}

function FieldRow({ label, value, highlight, bold, warning }: FieldRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ width: '110px', fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>{label}</div>
      <div style={{
        flex: 1, fontSize: '0.8rem',
        fontWeight: highlight || bold || warning ? 800 : 600,
        color: warning ? 'var(--color-warning-600)' : highlight ? 'var(--color-ui-interactive)' : 'var(--color-text-secondary)',
        background: highlight ? 'var(--color-ui-selected)' : warning ? 'color-mix(in srgb, var(--color-warning-500), transparent 90%)' : 'transparent',
        padding: highlight || warning ? '4px 12px' : '4px 0', borderRadius: '8px'
      }}>
        {value || <span style={{ color: 'var(--color-text-quaternary)' }}>-</span>}
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '10px', background: active ? 'var(--color-surface-0)' : 'transparent',
        color: active ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
        borderBottom: active ? '4px solid var(--color-brand-500)' : '4px solid transparent',
      }}
    >
      {icon} {label}
    </button>
  );
}
