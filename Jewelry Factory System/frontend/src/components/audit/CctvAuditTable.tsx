// CCTV IT Audit Report — printable sheet (header + table + signature block).
// Holiday rows render as a merged gray separator so no blank day is left unexplained.
import { CalendarDays } from 'lucide-react';
import { THAI_MONTHS } from '../../config/cctvAuditConfig';
import type { CctvAuditForm, CctvColumn, CctvReportMeta, CctvRow } from '../../types';
import { formatRowDate } from '../../utils/cctvAuditForm';

interface CctvAuditTableProps {
  form: CctvAuditForm;
  onCycleStatus: (rowId: string, colId: string) => void;
  onSetCell: (rowId: string, colId: string, value: string) => void;
  onToggleHoliday: (rowId: string) => void;
  onSetMeta: <K extends keyof CctvReportMeta>(key: K, value: CctvReportMeta[K]) => void;
}

interface MetaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function MetaField({ label, value, onChange }: MetaFieldProps) {
  return (
    <label className="cctv-meta-field">
      <span className="cctv-meta-field__label">{label}</span>
      <input className="cctv-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function CctvAuditTable({
  form,
  onCycleStatus,
  onSetCell,
  onToggleHoliday,
  onSetMeta,
}: CctvAuditTableProps) {
  const { meta, columns, rows, statusOptions, signatures } = form;
  const symbolOf = (value: string) => statusOptions.find((s) => s.value === value)?.label ?? '';

  const renderCell = (row: CctvRow, col: CctvColumn) => {
    const value = row.cells?.[col.id] ?? '';

    if (col.type === 'date') return formatRowDate(row.date);

    if (col.type === 'status') {
      return (
        <button
          type="button"
          className={`cctv-status ${value ? `cctv-status--${value.toLowerCase()}` : ''}`}
          aria-label={`${col.label} วันที่ ${formatRowDate(row.date)}: ${value || 'ว่าง'}`}
          onClick={() => onCycleStatus(row.id, col.id)}
        >
          {symbolOf(value) || '\u00A0'}
        </button>
      );
    }

    return (
      <input
        className="cctv-input"
        aria-label={`${col.label} วันที่ ${formatRowDate(row.date)}`}
        value={value}
        onChange={(e) => onSetCell(row.id, col.id, e.target.value)}
      />
    );
  };

  const toggleButton = (row: CctvRow) => (
    <td className="no-print cctv-action-cell">
      <button
        type="button"
        className="cctv-toggle"
        title={row.type === 'holiday' ? 'เปลี่ยนเป็นวันทำงาน' : 'ตั้งเป็นวันหยุด'}
        aria-label={row.type === 'holiday' ? 'เปลี่ยนเป็นวันทำงาน' : 'ตั้งเป็นวันหยุด'}
        onClick={() => onToggleHoliday(row.id)}
      >
        <CalendarDays size={14} strokeWidth={1.75} />
      </button>
    </td>
  );

  return (
    <section className="cctv-sheet">
      <h2 className="cctv-sheet__title">{meta.title}</h2>

      <div className="cctv-sheet__meta">
        <div className="cctv-meta-field">
          <span className="cctv-meta-field__label">ประจำเดือน</span>
          <strong>
            {THAI_MONTHS[meta.month - 1]} {meta.year + 543}
          </strong>
        </div>
        <MetaField label="เลขที่เอกสาร" value={meta.docNo} onChange={(v) => onSetMeta('docNo', v)} />
        <MetaField label="สถานที่" value={meta.location} onChange={(v) => onSetMeta('location', v)} />
        <MetaField label="มาตรฐาน" value={meta.standard} onChange={(v) => onSetMeta('standard', v)} />
      </div>

      <div className="cctv-table-wrap">
        <table className="cctv-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.id} style={c.width ? { width: c.width } : undefined}>
                  {c.label}
                </th>
              ))}
              <th className="no-print cctv-action-cell" aria-label="จัดการวันหยุด" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.type === 'holiday' ? (
                // Conditional rendering: merged gray separator for holidays
                <tr key={row.id} className="cctv-row-holiday">
                  <td>{formatRowDate(row.date)}</td>
                  <td colSpan={columns.length - 1}>{row.holiday?.name ?? 'วันหยุด'}</td>
                  {toggleButton(row)}
                </tr>
              ) : (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.id} className={col.type === 'text' ? 'cctv-cell--text' : undefined}>
                      {renderCell(row, col)}
                    </td>
                  ))}
                  {toggleButton(row)}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="cctv-signatures">
        {signatures.map((s) => (
          <div key={s.id} className="cctv-signature">
            <div className="cctv-signature__line" />
            <div>{s.role}</div>
            <div className="cctv-signature__date">วันที่ ____ / ____ / ________</div>
          </div>
        ))}
      </div>
    </section>
  );
}
