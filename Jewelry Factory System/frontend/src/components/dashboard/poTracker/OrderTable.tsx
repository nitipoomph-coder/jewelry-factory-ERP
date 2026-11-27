// src/components/dashboard/poTracker/OrderTable.tsx
// Performance rules (see docs/debug-history.md, 2026-11-24): no transitions or animations on rows /
// cells, and column widths come only from <col> elements so a resize drag never re-renders the body.
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, BarChart2, DollarSign, Layers, Package, X } from 'lucide-react';
import { type OrderSummary } from '../../../services/orderAPI';
import type { ColumnWidths } from '../../../hooks/useColumnWidths';
import { MASTER_COLS, PINNED_KEYS, getActiveColumnKeys, USER_INPUT_HEAD_BG, USER_INPUT_KEYS, PENDING_QTY_KEYS, PENDING_QTY_HEAD_BG, METRICS_KEYS, METRICS_HEAD_BG, METRICS_BG, COLUMN_GROUPS } from './orderTableConfig';
import './POTracker.css';

const PINNED_SET = new Set(PINNED_KEYS);


// ─── View Selection Popup ─────────────────────────────────────────────────────
type ViewMode = 'sales' | 'prod' | 'all';

interface ViewPickerProps {
  order: OrderSummary;
  onClose: () => void;
  onSelect: (view: ViewMode) => void;
}

const VIEW_OPTIONS: {
  key: ViewMode;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
    {
      key: 'sales',
      label: 'Sales Perspective',
      sub: 'Pricing, quantity, and total amount insights',
      icon: <DollarSign size={20} />,
    },
    {
      key: 'prod',
      label: 'Production Tracker',
      sub: 'Real-time production status and workflow tracking',
      icon: <BarChart2 size={20} />,
    },
    {
      key: 'all',
      label: 'Unified View',
      sub: 'Full dataset with all columns for deep-dive analysis',
      icon: <Layers size={20} />,
    },
  ];

function ViewPickerModal({ order, onClose, onSelect }: ViewPickerProps) {
  const [hovered, setHovered] = useState<ViewMode | null>(null);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      <div
        onClick={handleBackdrop}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'var(--color-overlay-scrim-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'modalFadeIn 0.3s ease-out forwards',
        }}
      >
        <div
          style={{
            background: 'var(--color-surface-0)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-modal)',
            width: '480px',
            maxWidth: '95vw',
            overflow: 'hidden',
            animation: 'modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* ─── Premium Header ─── */}
          <div style={{
            padding: '40px 40px 32px',
            textAlign: 'center',
            position: 'relative',
            background: 'var(--color-surface-0)',
          }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '24px', right: '24px',
                background: 'var(--color-surface-2)', border: 'none', borderRadius: '8px',
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--color-text-tertiary)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-danger-500)';
                e.currentTarget.style.color = 'var(--color-overlay-text)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-surface-2)';
                e.currentTarget.style.color = 'var(--color-text-tertiary)';
              }}
            >
              <X size={20} />
            </button>

            <div style={{
              display: 'inline-flex', padding: '6px 14px', borderRadius: '100px',
              background: 'color-mix(in srgb, var(--color-brand-500), transparent 90%)',
              color: 'var(--color-brand-600)',
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'capitalize', marginBottom: '24px',
              border: '1px solid color-mix(in srgb, var(--color-brand-500), transparent 80%)'
            }}>
              Select Intelligence View
            </div>

            <h3 style={{
              fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)', margin: '0 0 8px',
              letterSpacing: '-0.03em', lineHeight: 1.1
            }}>
              {order.PONo || 'NO PO'}
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px 24px',
              marginTop: '32px',
              textAlign: 'left',
              background: 'var(--color-surface-1)',
              padding: '20px 24px',
              borderRadius: '8px',
              border: '1px solid var(--color-border-light)',
            }}>
              {/* Row 1: Customer & Material */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Customer</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{order.CustCode || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Material</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{order.OrdMat || '-'}</span>
              </div>
              {/* Row 2: PO No & Order Kind */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border-light)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>PO Number</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>{order.PONo || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border-light)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Status</span>
                {order.OrdKind && (
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 800,
                    color: 'var(--color-text-secondary)',
                    background: 'var(--color-ui-raised)',
                    padding: '2px 8px', borderRadius: '6px', alignSelf: 'flex-start'
                  }}>
                    {order.OrdKind}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ─── Options List ─── */}
          <div style={{ padding: '0 32px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onMouseEnter={() => setHovered(opt.key)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '20px',
                    padding: '16px 20px', borderRadius: '8px',
                    background: hovered === opt.key ? 'var(--color-brand-50)' : 'transparent',
                    border: '1px solid',
                    borderColor: hovered === opt.key ? 'var(--color-brand-500)' : 'transparent',
                    cursor: 'pointer', transition: 'background-color 0.2s ease, border-color 0.2s ease',
                    textAlign: 'left', position: 'relative', overflow: 'hidden'
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '8px',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-600)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'color 0.2s ease, background-color 0.2s ease'
                  }}>
                    {opt.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '1rem', fontWeight: 800,
                      color: hovered === opt.key ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      marginBottom: '2px', transition: 'color 0.2s'
                    }}>
                      {opt.label}
                    </div>
                    <div style={{
                      fontSize: '0.78rem', color: 'var(--color-text-tertiary)',
                      fontWeight: 500, lineHeight: 1.4
                    }}>
                      {opt.sub}
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    style={{
                      color: 'var(--color-text-quaternary)',
                      transform: hovered === opt.key ? 'translateX(0)' : 'translateX(-8px)',
                      opacity: hovered === opt.key ? 1 : 0,
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* ─── Premium Footer ─── */}
          <div style={{
            padding: '16px', textAlign: 'center',
            background: 'var(--color-surface-1)',
            borderTop: '1px solid var(--color-border-light)',
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
              ESC TO DISMISS • INTEL-VIEW SYSTEM v2.0
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}


// ─── Column groups ────────────────────────────────────────────────────────────
// Flat table (2026-11-27): no line between every column. A thin vertical line marks only the first
// column of a new group (Customer Data | Production — Stage | Book / QC | Pack / Tag | Issue / Plan),
// like the Order List. The pinned block already ends with its own shadow. N044 copies (`*_n044`)
// belong to the group of their base column.
const GROUP_OF = new Map<string, string>(COLUMN_GROUPS.flatMap(g => g.keys.map(k => [k, g.label] as [string, string])));
const groupOf = (key: string) => GROUP_OF.get(key.replace(/_n044$/, '')) ?? 'base';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRows({ activeCols, stickyClass }: { activeCols: { key: string; pinned: boolean }[], stickyClass: (key: string) => string }) {
  return (
    <>
      <style>{`
        @keyframes skSh { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .skeleton-cell {
          background: linear-gradient(90deg, var(--color-surface-1) 25%, var(--color-surface-2) 50%, var(--color-surface-1) 75%);
          backgroundSize: 400% 100%;
          animation: skSh 1.4s ease-in-out infinite;
        }
      `}</style>
      {Array.from({ length: 12 }).map((_, i) => (
        <tr key={i}>
          {activeCols.map((c) => {
            const isPinned = c.pinned;
            return (
              <td key={c.key} className={isPinned ? stickyClass(c.key) : undefined} style={{
                padding: '8px',
                borderBottom: '1px solid var(--color-border-light)',
                background: isPinned ? 'var(--color-ui-canvas)' : 'transparent',
                position: isPinned ? 'sticky' : undefined,
                zIndex: isPinned ? 15 : undefined,
                boxShadow: isPinned && c.key === 'newReplen' ? 'var(--shadow-pinned)' : 'none',
                boxSizing: 'border-box', overflow: 'hidden',
              }}>
                {c.key === 'photo'
                  ? <div className="skeleton-cell" style={{ width: 'var(--po-photo-size, 40px)', height: 'var(--po-photo-size, 40px)', maxWidth: '100%', borderRadius: 4, margin: '0 auto' }} />
                  : <div className="skeleton-cell" style={{ height: '14px', borderRadius: '4px' }} />}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────
export default function OrderTable({
  data,
  loading,
  pageOffset = 0,
  visibleKeys,
  columnWidths,
}: {
  data: OrderSummary[];
  loading: boolean;
  pageOffset?: number;
  visibleKeys: string[];
  /** From useColumnWidths (owned by the page, which also shows the Reset Columns button). */
  columnWidths: ColumnWidths;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pickerOrder, setPickerOrder] = useState<OrderSummary | null>(null);
  const { tableRef, colRef, getWidth, tableStyle, stickyClass, handleProps } = columnWidths;

  const activeCols = useMemo(
    () => getActiveColumnKeys(visibleKeys).map((key, index, keys) => {
      const pinned = PINNED_SET.has(key);
      const prev = keys[index - 1];
      const groupStart = !pinned && key !== 'arrow' && prev !== undefined && !PINNED_SET.has(prev) && prev !== 'arrow'
        && groupOf(key) !== groupOf(prev);
      return { key, ...MASTER_COLS[key], pinned, groupStart };
    }),
    [visibleKeys],
  );

  const handleRowClick = (order: OrderSummary) => {
    setPickerOrder(order);
  };

  const handleViewSelect = (view: ViewMode) => {
    if (!pickerOrder) return;
    setPickerOrder(null);

    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const dateType = searchParams.get('dateType') || '';
    const status = searchParams.get('status') || 'Pending';

    const query = new URLSearchParams();
    if (dateFrom) query.append('dateFrom', dateFrom);
    if (dateTo) query.append('dateTo', dateTo);
    if (dateType) query.append('dateType', dateType);
    if (status) query.append('status', status);
    query.append('view', view);

    query.append('po', pickerOrder.PONo || '');
    const path = [
      pickerOrder.CustCode || '-',
      encodeURIComponent(pickerOrder.ShipTo || '-'),
      encodeURIComponent(pickerOrder.OrdKind || '-'),
      encodeURIComponent(pickerOrder.OrdMat || '-'),
      encodeURIComponent(pickerOrder.CustDueDate || '-')
    ].join('/');
    navigate(`/po-tracker/group/${path}?${query.toString()}`);
  };

  return (
    <>
      {pickerOrder && (
        <ViewPickerModal
          order={pickerOrder}
          onClose={() => setPickerOrder(null)}
          onSelect={handleViewSelect}
        />
      )}

      <div className="custom-scrollbar" style={{
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
        position: 'relative',
      }}>
        <table ref={tableRef} style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', fontFamily: 'var(--font-body)', ...tableStyle }}>
          <colgroup>
            {activeCols.map((c) => (
              <col key={c.key} ref={colRef(c.key)} style={{ width: getWidth(c.key) }} />
            ))}
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 30 }}>
            <tr>
              {activeCols.map((c) => {
                const isPinned = c.pinned;
                return (
                  <th key={c.key} className={isPinned ? stickyClass(c.key) : undefined} style={{
                    background: USER_INPUT_KEYS.has(c.key) ? USER_INPUT_HEAD_BG :
                      PENDING_QTY_KEYS.has(c.key) ? PENDING_QTY_HEAD_BG :
                        METRICS_KEYS.has(c.key) ? METRICS_HEAD_BG : 'var(--color-ui-raised)',
                    padding: '9px 8px', fontSize: 'var(--erp-text-dense)', fontWeight: 900,
                    color: c.key === 'arrow' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                    textAlign: c.align,
                    borderBottom: '1px solid var(--color-border-strong)',
                    borderLeft: c.groupStart ? '1px solid var(--color-border-light)' : undefined,
                    textTransform: 'capitalize', letterSpacing: 0,
                    position: isPinned ? 'sticky' : 'relative',
                    top: 0,
                    zIndex: isPinned ? 35 : 20,
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-display)',
                    whiteSpace: 'pre-wrap', wordWrap: 'break-word', lineHeight: '1.2',
                    boxShadow: isPinned && c.key === 'newReplen' ? 'var(--shadow-pinned)' : 'none'
                  }}>
                    <span>{c.label}</span>
                    <div
                      className="resize-handle"
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px',
                        cursor: 'col-resize', zIndex: 40, touchAction: 'none',
                      }}
                      {...handleProps(c.key, c.label.replace(/\s+/g, ' ').trim())}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows activeCols={activeCols} stickyClass={stickyClass} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length} style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--color-text-quaternary)', fontSize: 'var(--erp-text-body)', borderBottom: '1px solid var(--color-border-light)' }}>
                  <Package size={28} style={{ margin: '0 auto 14px', opacity: 0.35 }} />
                  <div style={{ fontWeight: 800, letterSpacing: '0.02em' }}>No matching orders found</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.6 }}>Try adjusting your filters or search keywords</div>
                </td>
              </tr>
            ) : data.map((o, i) => (
              <tr
                key={o.OrdNo + i}
                onClick={() => handleRowClick(o)}
                className="table-row-hover"
                style={{
                  cursor: 'pointer',
                  background: 'transparent',
                }}
              >
                {activeCols.map((c) => {
                  const isPinned = c.pinned;
                  return (
                    <td
                      key={c.key}
                      className={isPinned ? `pinned-col ${stickyClass(c.key)}` : undefined}
                      style={{
                        padding: '8px',
                        textAlign: c.align,
                        fontSize: 'var(--erp-text-control)',
                        fontWeight: 700,
                        color: USER_INPUT_KEYS.has(c.key) ? 'var(--color-warning-700)' : 'var(--color-text-primary)',
                        borderBottom: '1px solid var(--color-border-light)',
                        borderLeft: c.groupStart ? '1px solid var(--color-border-light)' : undefined,
                        background: isPinned ? 'var(--color-ui-canvas)' : (METRICS_KEYS.has(c.key) ? METRICS_BG : 'transparent'),
                        // Only pinned cells are positioned: a stacking context on every cell made the
                        // browser re-layer the whole table on each resize/hover frame.
                        position: isPinned ? 'sticky' : undefined,
                        zIndex: isPinned ? 15 : undefined,
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        boxShadow: isPinned && c.key === 'newReplen' ? 'var(--shadow-pinned)' : 'none',
                        ...c.cellStyle?.(o)
                      }}
                    >
                      {c.render(o, i, pageOffset)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .table-row-hover {
          position: relative;
        }
        .resize-handle:hover,
        .resize-handle[data-active='true'],
        .resize-handle:focus-visible {
          background: var(--color-brand-500) !important;
          outline: none;
        }
        .table-row-hover:hover {
          background: color-mix(in srgb, var(--color-brand-500), transparent 96%) !important;
          box-shadow: inset 4px 0 0 var(--color-brand-500);
        }
        .table-row-hover:hover td:not(.pinned-col) {
          color: var(--color-text-primary) !important;
          background: transparent !important;
        }
        .table-row-hover:hover td.pinned-col {
          color: var(--color-text-primary) !important;
          background: color-mix(in srgb, var(--color-brand-500) 4%, var(--color-ui-canvas)) !important;
        }


        .custom-scrollbar::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-surface-1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border-strong);
          border-radius: 10px;
          border: 2px solid var(--color-surface-1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-brand-400);
        }
      `}</style>
    </>
  );
}
