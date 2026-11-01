// CCTV IT Audit Report — pure helpers (generate / edit / validate / export).
// No API calls here: holidays are passed in by the caller (see useCctvAuditForm).
import { saveAs } from 'file-saver';
import {
  CCTV_DEFAULT_COLUMNS,
  CCTV_DEFAULT_META,
  CCTV_DEFAULT_SIGNATURES,
  CCTV_HOLIDAY_LABEL,
  CCTV_SCHEMA_VERSION,
  CCTV_STATUS_OPTIONS,
  CCTV_SUNDAY_LABEL,
  THAI_WEEKDAYS_SHORT,
} from '../config/cctvAuditConfig';
import type { CctvAuditForm, CctvColumn, CctvRow } from '../types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLUMN_TYPES = ['date', 'status', 'text'];
const ROW_TYPES = ['data', 'holiday'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export const toIsoDate = (year: number, month: number, day: number) =>
  `${year}-${pad2(month)}-${pad2(day)}`;

export const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const weekdayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** "13 จ." — day number + Thai weekday (UTC math, no timezone drift) */
export const formatRowDate = (iso: string) =>
  `${Number(iso.slice(8, 10))} ${THAI_WEEKDAYS_SHORT[weekdayOf(iso)]}`;

// ─── Generate ────────────────────────────────────────────────────────────────
interface GenerateOptions {
  year: number;
  month: number;
  /** ISO dates from GMHoliday (SELECT only) */
  holidayDates: string[];
  sundayIsHoliday: boolean;
  /** Current form: its columns/signatures/meta are reused for the new month */
  base?: CctvAuditForm | null;
}

export function generateCctvForm({
  year,
  month,
  holidayDates,
  sundayIsHoliday,
  base,
}: GenerateOptions): CctvAuditForm {
  const holidaySet = new Set(holidayDates);

  const rows: CctvRow[] = Array.from({ length: daysInMonth(year, month) }, (_, i) => {
    const date = toIsoDate(year, month, i + 1);
    const id = `r_${date}`;

    if (holidaySet.has(date)) {
      return { id, type: 'holiday', date, holiday: { name: CCTV_HOLIDAY_LABEL, source: 'company' } };
    }
    if (sundayIsHoliday && weekdayOf(date) === 0) {
      return { id, type: 'holiday', date, holiday: { name: CCTV_SUNDAY_LABEL, source: 'sunday' } };
    }
    return { id, type: 'data', date, cells: {} };
  });

  return {
    schemaVersion: CCTV_SCHEMA_VERSION,
    meta: {
      ...CCTV_DEFAULT_META,
      ...base?.meta,
      docNo: '', // new month = new document number
      year,
      month,
    },
    columns: structuredClone(base?.columns ?? CCTV_DEFAULT_COLUMNS),
    statusOptions: structuredClone(base?.statusOptions ?? CCTV_STATUS_OPTIONS),
    rows,
    signatures: structuredClone(base?.signatures ?? CCTV_DEFAULT_SIGNATURES),
  };
}

// ─── Immutable edit helpers ──────────────────────────────────────────────────
const mapRow = (form: CctvAuditForm, rowId: string, fn: (row: CctvRow) => CctvRow): CctvAuditForm => ({
  ...form,
  rows: form.rows.map((r) => (r.id === rowId ? fn(r) : r)),
});

export const setCell = (form: CctvAuditForm, rowId: string, colId: string, value: string) =>
  mapRow(form, rowId, (r) => ({ ...r, cells: { ...r.cells, [colId]: value } }));

/** Empty → OK → NG → NA → Empty */
export const cycleStatus = (form: CctvAuditForm, rowId: string, colId: string) => {
  const order = ['', ...form.statusOptions.map((s) => s.value)];
  return mapRow(form, rowId, (r) => {
    const current = r.cells?.[colId] ?? '';
    const next = order[(order.indexOf(current) + 1) % order.length];
    return { ...r, cells: { ...r.cells, [colId]: next } };
  });
};

/** Turn a day into a holiday separator (or back). Cell values are kept. */
export const toggleHolidayRow = (form: CctvAuditForm, rowId: string) =>
  mapRow(form, rowId, (r) => {
    if (r.type === 'holiday') {
      const { holiday: _removed, ...rest } = r;
      void _removed;
      return { ...rest, type: 'data' };
    }
    return { ...r, type: 'holiday', holiday: { name: CCTV_HOLIDAY_LABEL, source: 'manual' } };
  });

export const setMeta = <K extends keyof CctvAuditForm['meta']>(
  form: CctvAuditForm,
  key: K,
  value: CctvAuditForm['meta'][K],
): CctvAuditForm => ({ ...form, meta: { ...form.meta, [key]: value } });

// ─── Validate (import / localStorage restore) ────────────────────────────────
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isColumn = (v: unknown): v is CctvColumn =>
  isRecord(v) &&
  typeof v.id === 'string' &&
  typeof v.label === 'string' &&
  typeof v.type === 'string' &&
  COLUMN_TYPES.includes(v.type);

const isRow = (v: unknown): v is CctvRow =>
  isRecord(v) &&
  typeof v.id === 'string' &&
  typeof v.type === 'string' &&
  ROW_TYPES.includes(v.type) &&
  typeof v.date === 'string' &&
  ISO_DATE.test(v.date);

export function validateCctvForm(value: unknown): CctvAuditForm {
  if (!isRecord(value)) throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
  if (typeof value.schemaVersion !== 'number') throw new Error('ไม่พบ schemaVersion ในไฟล์');
  if (!isRecord(value.meta)) throw new Error('ไม่พบข้อมูล meta ในไฟล์');
  if (!Array.isArray(value.columns) || value.columns.length === 0 || !value.columns.every(isColumn)) {
    throw new Error('ข้อมูล columns ไม่ถูกต้อง');
  }
  // Holiday rows span columns 2..n, so the date column must come first
  if (value.columns[0].type !== 'date') throw new Error('คอลัมน์แรกต้องเป็นคอลัมน์วันที่');
  if (!Array.isArray(value.rows) || !value.rows.every(isRow)) throw new Error('ข้อมูล rows ไม่ถูกต้อง');
  if (!Array.isArray(value.statusOptions) || !Array.isArray(value.signatures)) {
    throw new Error('ไม่พบ statusOptions หรือ signatures ในไฟล์');
  }
  return value as unknown as CctvAuditForm;
}

export function parseCctvForm(text: string): CctvAuditForm {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('ไฟล์ไม่ใช่ JSON ที่ถูกต้อง');
  }
  return validateCctvForm(parsed);
}

// ─── Export ──────────────────────────────────────────────────────────────────
export function exportCctvForm(form: CctvAuditForm) {
  const blob = new Blob([JSON.stringify(form, null, 2)], { type: 'application/json' });
  saveAs(blob, `cctv-audit-${form.meta.year}-${pad2(form.meta.month)}.json`);
}
