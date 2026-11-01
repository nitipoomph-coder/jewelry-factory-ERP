// src/components/orderDetail/OrderLineTable.tsx
// Excel-style grid replacing the old per-line "card" stack: rows = order lines, columns = the
// shared registry filtered by visibleKeys. Sticky left columns (No./Photo/Item No.) approximate
// Excel's freeze-pane behavior while the production columns scroll horizontally.
// TODO: column sort if requested — not built in this pass, wasn't present in the old card view.
import { useState, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { ORDER_DETAIL_COLUMNS, type OrderDetailColumn } from '../../config/orderDetailColumns';
import { formatColumnValue } from './format';
import { psPhotoUrl, attachPhotoFallback } from '../../utils/photoUrl';

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
  const visibleCols = ORDER_DETAIL_COLUMNS.filter((c) => c.locked || visibleKeys.includes(c.key));

  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent, key: string, defaultWidth: number) => {
    e.stopPropagation();
    e.preventDefault();
    resizingCol.current = key;
    startX.current = e.pageX;
    startWidth.current = colWidths[key] || defaultWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingCol.current) return;
      const diffX = moveEvent.pageX - startX.current;
      let newWidth = startWidth.current + diffX;
      if (newWidth < 40) newWidth = 40;
      setColWidths(prev => ({ ...prev, [resizingCol.current!]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingCol.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

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
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', fontFamily: 'var(--font-body)' }}>
        <thead>
          <tr>
            {visibleCols.map((col) => {
              const currentWidth = colWidths[col.key] || col.width;
              return (
                <th key={col.key} style={{ ...headerCellStyle(false, 0, col.group === 'remark'), width: currentWidth, minWidth: currentWidth, maxWidth: currentWidth, textAlign: col.align }}>
                  {col.label}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, col.key, col.width)}
                    className="col-resizer hover:bg-brand-500"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '5px',
                      cursor: 'col-resize',
                      zIndex: 10,
                      transition: 'background 0.2s ease',
                      opacity: 0.5
                    }}
                  />
                </th>
              );
            })}
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

                  const currentWidth = colWidths[col.key] || col.width;

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
                        minWidth: currentWidth, width: currentWidth, maxWidth: currentWidth,
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
        .col-resizer:hover {
          background: var(--color-brand-500) !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
