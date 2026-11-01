// ============================================
// Navigation Types
// ============================================
export interface NavMenuItem {
  id: string;
  label: string;
  code?: string;
  path?: string;
  roles?: string[];
  items?: NavMenuItem[];
}

export type AppWorkspace = 'PCC' | 'INVENTORY';

export interface NavMenuGroup {
  id: string;
  label: string;
  icon: string;
  path?: string;
  items?: NavMenuItem[];
  badge?: number;
  accentColor?: string;
  roles?: string[];
  section?: string;
  workspace?: AppWorkspace | 'ALL';
}

// ============================================
// Document Types
// ============================================
export type DocumentStatus = 'pending' | 'complete' | 'processing';

export interface RecentDocument {
  id: string;
  docNumber: string;
  type: string;
  date: string;
  operator: string;
  status: DocumentStatus;
}

export interface PendingTask {
  id: string;
  title: string;
  meta: string;
  count: number | null;
  priority: 'urgent' | 'normal' | 'low';
}

export interface DashboardStat {
  label: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
  icon: string;
  variant: 'procurement' | 'orders' | 'production' | 'stock';
}

// ============================================
// SIR (Stone Issue Return) Types
// ============================================
export interface SIRDocument {
  docNumber: string;
  date: string;
  refNumber: string;
  supplierCode: string;
  supplierName: string;
  category: string;
  currency: string;
  exchangeRate: number;
  items: SIRItem[];
}

export interface SIRItem {
  seq: number;
  stoneCode: string;
  unit: string;
  grade: string;
  weight: number;
  returnQty: number;
  price: number;
  total: number;
  warehouse: string;
}

export interface DocumentListItem {
  docNumber: string;
  date: string;
}

// ============================================
// CCTV IT Audit Report (Audit Module — Zero-DB: form is kept as a JSON file)
// ============================================
export type CctvColumnType = 'date' | 'status' | 'text';
export type CctvRowType = 'data' | 'holiday';
export type CctvHolidaySource = 'company' | 'sunday' | 'manual';

export interface CctvColumn {
  id: string;
  label: string;
  type: CctvColumnType;
  width?: number;
  fixed?: boolean;
}

export interface CctvStatusOption {
  value: string;
  label: string;
}

export interface CctvHolidayInfo {
  name: string;
  source: CctvHolidaySource;
}

export interface CctvRow {
  id: string;
  type: CctvRowType;
  /** ISO date string "YYYY-MM-DD" (kept as string to avoid timezone shifts) */
  date: string;
  /** Cell values keyed by column id (not by index) */
  cells?: Record<string, string>;
  holiday?: CctvHolidayInfo;
}

export interface CctvSignature {
  id: string;
  role: string;
}

export interface CctvReportMeta {
  title: string;
  docNo: string;
  year: number;
  month: number;
  location: string;
  standard: string;
}

export interface CctvAuditForm {
  schemaVersion: number;
  meta: CctvReportMeta;
  columns: CctvColumn[];
  statusOptions: CctvStatusOption[];
  rows: CctvRow[];
  signatures: CctvSignature[];
}
