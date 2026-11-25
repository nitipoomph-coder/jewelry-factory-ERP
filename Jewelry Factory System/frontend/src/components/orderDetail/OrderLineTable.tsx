// src/components/orderDetail/OrderLineTable.tsx
// Excel-style grid replacing the old per-line "card" stack: rows = order lines, columns = the
// shared registry filtered by visibleKeys. Sticky left columns (No./Photo/Item No.) approximate
// Excel's freeze-pane behavior while the production columns scroll horizontally.
// TODO: column sort if requested — not built in this pass, wasn't present in the old card view.
// Column widths: hooks/useColumnWidths (drag changes only the <col>, so the body is not re-rendered
// on every pointer move; widths are remembered per user). No transitions on rows / cells.
import { useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { ORDER_DETAIL_COLUMNS, type OrderDetailColumn } from '../../config/orderDetailColumns';
import { formatColumnValue } from './format';
import { psPhotoUrl, attachPhotoFallback } from '../../utils/photoUrl';
import { useColumnWidths } from '../../hooks/useColumnWidths';

const DEFAULT_WIDTHS: Record<string, number> = Object.fromEntries(ORDER_DETAIL_COLUMNS.map(c => [c.key, c.width]));

// รูปดึงfrom network path (ps ก่อน, onError fallback ไป cad, ถ้าไม่มีทั้งคู่จะซ่อนรูปเผยไอคอน placeholder ด้านหลัง)
// วางไอคอนเป็น layer ด้านหลัง + <img> ทับด้านบน (key={itemNo} รีเซ็ตทุกครั้งที่สลับ item) — ไม่ต้องใช้ state/effect
function PhotoThumbCell({ line, onPhotoClick }: { line: Record<string, unknown>, onPhotoClick?: (itemNo: string) => void }) {
  const itemNo = line.ItemNo as string | undefined;

  return (
    <div
      onClick={(e) => {
        if (itemNo && onPhotoClick) {
          e.stopPropagation();
          onPhotoClick(itemNo);
        }
      }}
      style={{
      position: 'relative',
      width: 60, height: 35, borderRadius: 2, overflow: 'hidden', margin: '0 auto',
      background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: '0 1px 3px color-mix(in srgb, var(--color-surface-900) 5%, transparent)',
      cursor: (itemNo && onPhotoClick) ? 'pointer' : 'default'
    }}>
      <ImageIcon size={20} style={{ color: 'var(--color-text-quaternary)', position: 'absolute' }} />
      {itemNo && (
        <img
          key={itemNo}
          src={psPhotoUrl(itemNo)}
          alt="item"
          loading="lazy"
          onError={(e) => attachPhotoFallback(e, itemNo)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  );
}

interface OrderLineTableProps {
  lines: Record<string, unknown>[];
  visibleKeys: string[];
  onRowClick: (line: Record<string, unknown>, index: number) => void;
  onPhotoClick?: (itemNo: string) => void;
}

// หัวตารางแบบ solid (เข้าชุดกับ PO Tracker list — ใช้ theme design tokens)
// userInput = คอลัมน์กลุ่ม remark (ข้อมูลที่ผู้ใช้คีย์เอง) → พื้นอำพันเหมือน list
const headerCellStyle = (sticky: boolean, left: number, userInput = false): React.CSSProperties => ({
  background: userInput
    ? 'color-mix(in srgb, var(--color-warning-500) 16%, var(--color-surface-1))'
    : 'var(--color-surface-1)',
  padding: '6px 8px',
  fontSize: '0.65rem',
  fontWeight: 800,
  color: 'var(--color-text-primary)',
  borderBottom: '1px solid var(--color-border-strong)',
  borderRight: '1px solid var(--color-border-light)',
  textTransform: 'capitalize',
  letterSpacing: '0.02em',
  fontFamily: 'var(--font-body)',
  position: 'sticky',
  top: 0,
  left: sticky ? left : undefined,
  zIndex: sticky ? 31 : 30,
  whiteSpace: 'nowrap',
});

export default function OrderLineTable({ lines, visibleKeys, onRowClick, onPhotoClick }: OrderLineTableProps) {
  const visibleCols = useMemo(
    () => ORDER_DETAIL_COLUMNS.filter((c) => c.locked || visibleKeys.includes(c.key)),
    [visibleKeys],
  );
  const { tableRef, colRef, getWidth, tableStyle, handleProps } = useColumnWidths(
    'order-detail-lines', DEFAULT_WIDTHS, { minWidth: 40, keys: visibleCols.map(c => c.key) },
  );

  const renderCell = (col: OrderDetailColumn, line: Record<string, unknown>, rowIdx: number) => {
    if (col.key === '_rowNo') return rowIdx + 1;
    if (col.key === '_photo') return <PhotoThumbCell line={line} onPhotoClick={onPhotoClick} />;
    const raw = line[col.key];
    const isNegative = col.negativeIsAlert && Number(raw) < 0;
    return (
      <span style={isNegative ? { color: 'var(--color-danger-500)', fontWeight: 800 } : undefined}>
        {formatColumnValue(col, raw)}
      </span>
    );
  };

  return (
    <div className="custom-scrollbar order-line-table-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative', borderLeft: '1px solid var(--color-border-strong)' }}>
      <table ref={tableRef} style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', fontFamily: 'var(--font-body)', ...tableStyle }}>
        <colgroup>
          {visibleCols.map((col) => (
            <col key={col.key} ref={colRef(col.key)} style={{ width: getWidth(col.key) }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {visibleCols.map((col) => (
              <th key={col.key} style={{ ...headerCellStyle(false, 0, col.group === 'remark'), overflow: 'hidden', textOverflow: 'ellipsis', textAlign: col.align }}>
                {col.label}
                <div
                  className="col-resizer"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '5px',
                    cursor: 'col-resize',
                    zIndex: 10,
                    opacity: 0.5,
                    touchAction: 'none',
                  }}
                  {...handleProps(col.key, col.label)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const isClosed = line.CloseStatus === 'Y';
            const rowBg = isClosed
              ? 'var(--color-surface-2)'
              : i % 2 === 0
                ? 'var(--color-surface-0)'
                : 'var(--color-table-row-alt)';
            return (
              <tr
                key={i}
                className="order-line-row"
                onClick={() => onRowClick(line, i)}
                style={{ cursor: 'pointer', filter: isClosed ? 'grayscale(80%)' : 'none', opacity: isClosed ? 0.65 : 1 }}
              >
                {visibleCols.map((col) => {
                  const bg = col.group === 'remark'
                    ? `color-mix(in srgb, var(--color-warning-500) 9%, ${rowBg})`
                    : (col.key === 'BalQty' ? 'color-mix(in srgb, var(--color-brand-500), transparent 95%)' : rowBg);

                  return (
                    <td
                      key={col.key}
                      style={{
                        background: bg,
                        padding: '3px 6px', fontSize: '0.65rem', fontWeight: (col.key === 'BalQty' || col.key === 'ItemNo') ? 800 : 500,
                        color: (col.locked && col.key !== 'OrdNo' && col.key !== 'CustCode' && col.key !== 'ItemNo' && col.key !== 'Qty') ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                        textAlign: col.align,
                        borderBottom: '1px solid var(--color-border-strong)',
                        borderRight: '1px solid var(--color-border-light)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                    >
                      {renderCell(col, line, i)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <style>{`
        .order-line-row:hover td {
          background: color-mix(in srgb, var(--color-brand-500), transparent 90%) !important;
        }
        .col-resizer:hover,
        .col-resizer[data-active='true'],
        .col-resizer:focus-visible {
          background: var(--color-brand-500) !important;
          opacity: 1 !important;
          outline: none;
        }
      `}</style>
    </div>
  );
}
