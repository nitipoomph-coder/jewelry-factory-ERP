// CCTV IT Audit Report — single source of truth for defaults and labels.
// Zero-DB module: the only DB access is a SELECT of company holidays
// (existing GET /api/production-summary/holidays → GMHoliday).
import type {
  CctvColumn,
  CctvReportMeta,
  CctvSignature,
  CctvStatusOption,
} from '../types';

export const CCTV_SCHEMA_VERSION = 1;
export const CCTV_STORAGE_KEY = 'cctv-audit-form';

export const CCTV_DEFAULT_COLUMNS: CctvColumn[] = [
  { id: 'c_date', label: 'วันที่', type: 'date', width: 90, fixed: true },
  { id: 'c_cam', label: 'กล้องทำงานปกติ', type: 'status', width: 110 },
  { id: 'c_rec', label: 'บันทึกภาพ', type: 'status', width: 110 },
  { id: 'c_nvr', label: 'NVR / Storage', type: 'status', width: 110 },
  { id: 'c_note', label: 'หมายเหตุ', type: 'text', width: 260 },
];

// Printed as text symbols — no checkbox squares (clean, formal print)
export const CCTV_STATUS_OPTIONS: CctvStatusOption[] = [
  { value: 'OK', label: '✓' },
  { value: 'NG', label: '✗' },
  { value: 'NA', label: '-' },
];

export const CCTV_DEFAULT_SIGNATURES: CctvSignature[] = [
  { id: 's1', role: 'ผู้ตรวจสอบ (IT Staff)' },
  { id: 's2', role: 'ผู้อนุมัติ (IT Manager)' },
];

export const CCTV_DEFAULT_META: Omit<CctvReportMeta, 'year' | 'month'> = {
  title: 'CCTV IT Audit Report',
  docNo: '',
  location: '',
  standard: 'ISO 27001',
};

// GMHoliday returns dates only (no names) → generic label on the separator row
export const CCTV_HOLIDAY_LABEL = 'วันหยุด';
export const CCTV_SUNDAY_LABEL = 'วันหยุด (วันอาทิตย์)';

export const THAI_WEEKDAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
