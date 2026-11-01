import { ChevronRight } from 'lucide-react';
import type { OrderSummary } from '../../../services/orderAPI';
import { PhotoCell } from './PhotoCell';

import { formatDateDDMMYY } from '../../../utils/dateUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────
// ช่องที่ไม่มีข้อมูล = เว้นว่าง (ตามที่ผู้ใช้ระบุ ไม่ใส่ placeholder '-')
const formatDate = (d: string | null) =>
  d ? formatDateDDMMYY(d) : '';
const formatQty = (n: number | null | undefined) => (n != null ? n.toLocaleString() : '');

type ColDef = {
  label: string;
  w: number;
  align: 'left' | 'center' | 'right';
  render: (o: OrderSummary, i: number, offset: number) => React.ReactNode;
  cellStyle?: (o: OrderSummary) => React.CSSProperties;
};

// คอลัมน์ข้อความ/Status (Track / QC / Pack) — โชว์ค่าตรง ๆ, ว่างถ้าไม่มี
const txt = (label: string, key: keyof OrderSummary, w = 100, align: 'left' | 'center' | 'right' = 'center'): ColDef => ({
  label, w, align,
  render: (o) => (o[key] as string | null) || '',
  cellStyle: () => ({ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-control)' }),
});

// คอลัมน์QtyWorkค้าง (Pending Qty) — ติดDelete = ค้าง แสดงสีแดงพื้นแดงอ่อน, ว่างถ้า 0 หรือ null
const pen = (label: string, key: keyof OrderSummary, w = 78): ColDef => ({
  label, w, align: 'right',
  render: (o) => { const v = o[key] as number | null; return v != null && v !== 0 ? v.toLocaleString() : ''; },
  cellStyle: (o) => {
    const v = o[key] as number | null;
    return v != null && v < 0
      ? { color: 'var(--color-danger-600)', background: 'var(--po-negative-bg, transparent)', fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: 'var(--erp-text-control)' } : { fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', fontSize: 'var(--erp-text-control)' };
  },
});

// ─── Master column catalog ─────────────────────────────────────────────────────
// ลำดับ key = ลำดับการDisplayซ้าย→ขวา (activeCols filter from Object.keys ตามลำดับนี้)
// mapping Ref production_stages_mapping_log.md + PO_TRACKER_REVAMP_PLAN.md
export const MASTER_COLS: Record<string, ColDef> = {
  // ── Always-on / pinned ──
  no: {
    label: 'No.', w: 50, align: 'center',
    render: (_, i, offset) => offset + i + 1,
    cellStyle: () => ({ color: 'var(--color-text-tertiary)', background: 'var(--color-surface-1)', fontWeight: 700 }),
  },
  week: {
    label: 'Week', w: 62, align: 'center',
    render: (o) => o.Week,
    cellStyle: () => ({ fontWeight: 600, color: 'var(--color-brand-600)' }),
  },
  cust: {
    label: 'Cust', w: 70, align: 'center',
    render: (o) => o.CustCode,
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-text-primary)' }),
  },
  po: {
    label: 'PO No.', w: 160, align: 'center',
    render: (o) => o.PONo,
    cellStyle: () => ({ fontWeight: 900, color: 'var(--color-text-primary)' }),
  },

  // ── Customer Data ──
  po2: {
    label: 'PO2', w: 140, align: 'center',
    render: (o) => o.EXNo || '',
    cellStyle: () => ({ fontWeight: 600, color: 'var(--color-text-secondary)' }),
  },
  ordno: {
    label: 'Order No.', w: 170, align: 'left',
    render: (o) => o.OrdNo || '',
    cellStyle: () => ({ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.78rem' }),
  },
  newReplen: {
    label: 'New/\nReplen', w: 100, align: 'center',
    render: (o) => {
      const isUrgent = o.OrdKind?.toLowerCase().includes('urgent');
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {isUrgent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger-500)', boxShadow: '0 0 4px var(--color-danger-500)' }} />}
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            color: isUrgent ? 'var(--color-danger-600)' : 'var(--color-text-secondary)',
            textTransform: 'capitalize'
          }}>
            {o.OrdKind || ''}
          </span>
        </div>
      );
    },
  },
  metal: {
    label: 'Metal', w: 70, align: 'center',
    render: (o) => o.OrdMat || '',
    cellStyle: () => ({ fontWeight: 700, color: 'var(--color-text-secondary)' }),
  },
  shipto: {
    label: 'Ship To', w: 160, align: 'left',
    render: (o) => o.ShipTo,
    cellStyle: () => ({ fontWeight: 500, color: 'var(--color-text-secondary)' }),
  },
  photo: {
    label: 'Photo', w: 72, align: 'center',
    render: (o) => <PhotoCell itemNo={o.SampleItemNo} title={`${o.CustCode || ''} | PO: ${o.PONo || ''}`} />,
    cellStyle: () => ({ padding: '3px 4px', verticalAlign: 'middle', textAlign: 'center' }),
  },
  orddate: {
    label: 'Order Date', w: 95, align: 'center',
    render: (o) => formatDate(o.OrdDate),
  },
  due: {
    label: 'Factory Due', w: 95, align: 'center',
    render: (o) => formatDate(o.DueDate),
    cellStyle: (o) => {
      const isLate = o.DueDate && new Date(o.DueDate) < new Date() && (o.OrdStatus === 'P' || o.OrdStatus === 'N');
      return isLate ? { color: 'var(--color-danger-500)', fontWeight: 800, background: 'color-mix(in srgb, var(--color-danger-500), transparent 94%)' } : {};
    }
  },
  qa: txt('QA / BBQ / Testing', 'TrackTest', 100),
  sgs: txt('SGS', 'OrdSGS', 60),
  qcdate: {
    label: 'QC Date', w: 95, align: 'center',
    render: (o) => formatDate(o.CustQCDate),
  },
  bookInspect: txt('Book Inspect', 'BookDate', 110),
  bookShip: txt('Book Ship', 'BookShip', 100),
  custdue: {
    label: 'Cust Due', w: 95, align: 'center',
    render: (o) => formatDate(o.CustDueDate),
  },
  oor: txt('OOR Date', 'OORDate', 95),
  sku: {
    label: 'No. of SKU', w: 85, align: 'center',
    render: (o) => (o.NumSKU ? o.NumSKU.toLocaleString() : ''),
    cellStyle: () => ({ fontWeight: 700, color: 'var(--color-brand-700)' }),
  },
  qty: {
    label: 'Qty', w: 80, align: 'right',
    render: (o) => formatQty(o.TotalQty),
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-brand-700)', fontFamily: 'var(--font-display)', fontSize: 'var(--erp-text-control)' }),
  },

  // ── Production — Stage Pending Qty ──
  stonePen: pen('PST', 'StonePenQty'),
  fitPen: pen('PC1', 'FitPenQty'),
  wijPen: pen('PWA', 'WijPenQty'),
  castPen: pen('PCA', 'CastPenQty'),
  controlPen: pen('PC2', 'ControlPenQty'),
  grindPen: pen('PF', 'GrindPenQty'),
  polishPen: pen('PL', 'PolishPenQty'),
  platePen: pen('PPL', 'PlatePenQty'),
  exportQty: pen('Shipped', 'ExportQty', 85),
  balQty: pen('Balance', 'BalQty', 85),
  expPct: {
    label: '% Shipped', w: 90, align: 'right',
    render: (o) => (o.ExpPct != null ? `${o.ExpPct}%` : ''),
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: 'var(--erp-text-control)' }),
  },

  // ── Production — Book / QC ──
  qc1qty: txt('1. QC Qty', 'QC1_Qty', 85),
  qc1date: txt('1. QC Date', 'QC1_Date', 95),
  qc1fail: txt('1. QC Fail Qty', 'QC1_Fail', 95),
  qc2qty: txt('2. QC Qty', 'QC2_Qty', 85),
  qc2date: txt('2. QC Date', 'QC2_Date', 95),
  qc2fail: txt('2. QC Fail Qty', 'QC2_Fail', 95),
  qc3qty: txt('3. QC Qty', 'QC3_Qty', 85),
  qc3date: txt('3. QC Date', 'QC3_Date', 95),

  // --- N044 Specific Columns ---
  // แก้ชื่อในเครื่องหมาย ''
  qa_n044: txt('Inspection', 'TrackTest', 100),
  cardBox_n044: txt('BBQ/Top', 'PackCard', 120),
  orderTicket_n044: txt('Send Test', 'TickOrd', 110),
  receiveTicket_n044: txt('1.Send Ticket', 'TickRec', 130),
  sample_n044: txt('1.Delivery Ticket', 'TrackSam', 90),
  custCT_n044: txt('2.Order Card', 'TrackCT', 90),
  mf_n044: txt('2.Requisition/Arrange Card', 'TrackMF', 90),
  packScanDo_n044: txt('3.Order Box', 'PackScanDo', 160),
  packScanSen_n044: txt('3.Requisition/Arrange Box', 'PackScanSen', 160),
  packScan_n044: txt('4.Order Pouch', 'PackScanAppv', 100),
  packScanMF_n044: txt('4.Requisition/Arrange Pouch', 'PackScanMF', 170),
  polyOrd_n044: txt('Remark', 'PolyOrd', 120),
  polyRec_n044: txt('Pack Scan', 'PolyRec', 130),
  tagRcyRec_n044: txt('Upload MF', 'TagRcyRec', 180),

  // ── Production — Pack / Tag ──
  cardBox: txt('1.Card/Box', 'PackCard', 120),
  orderTicket: txt('2.Order Ticket/Label', 'TickOrd', 110),
  receiveTicket: txt('3.Receive Ticket/Label', 'TickRec', 130),
  sample: txt('4.Sample', 'TrackSam', 90),
  custCT: txt('5.Cust CT', 'TrackCT', 90),
  mf: txt('6.MF', 'TrackMF', 90),
  packScanDo: txt('7.Day to Do Pack Scan', 'PackScanDo', 160),
  packScanSen: txt('8.Pack Scan Send Cust', 'PackScanSen', 160),
  packScan: txt('9.Pack Scan Approved On', 'PackScanAppv', 100),
  packScanMF: txt('10.Pack Scan Photo on MF', 'PackScanMF', 170),
  polyOrd: txt('4. Order Polybag', 'PolyOrd', 120),
  polyRec: txt('5. Receive Polybag', 'PolyRec', 130),
  tagRcyRec: txt('6. Receive Recycled Tag U413', 'TagRcyRec', 180),

  // ── Production — Issue / Plan ──
  prodRisk: {
    label: 'Production Risky Issue', w: 170, align: 'center',
    render: (o) => o.ProdRiskIssue || '',
    cellStyle: () => ({ color: 'var(--color-danger-600)', fontWeight: 600, fontSize: '0.78rem' }),
  },
  pqc: txt('PQC Plan Ship', 'PQCPlanShip', 115),

  remark: {
    label: 'Remark', w: 150, align: 'left',
    render: (o) => o.TrackRemark || '',
    cellStyle: () => ({ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }),
  },
  amount: {
    label: 'Amount ($)', w: 110, align: 'right',
    render: (o) => o.Amount != null ? `$${o.Amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '',
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-brand-700)', fontFamily: 'var(--font-display)', fontSize: 'var(--erp-text-control)' }),
  },
  arrow: {
    label: '', w: 40, align: 'left',
    render: () => <ChevronRight size={18} style={{ color: 'var(--color-text-quaternary)' }} />,
  }
};

// ── คอลัมน์ที่ฝ่ายผลิต "คีย์เอง" (ข้อมูลติดตามWorkfromตาราง OrdTrackDT) ──
// ลงสีพื้นอำพัน (amber) เพื่อแยกให้เห็นชัดfromคอลัมน์Order/ยอดที่SystemคำนวณAuto (OrdHD/OrdDT)
export const USER_INPUT_KEYS = new Set<string>([
  'qa', 'sgs', 'oor', 'remark',
  'bookInspect', 'bookShip',
  'qc1qty', 'qc1date', 'qc1fail', 'qc2qty', 'qc2date', 'qc2fail', 'qc3qty', 'qc3date',
  'cardBox', 'orderTicket', 'receiveTicket', 'sample', 'custCT', 'mf',
  'qa_n044', 'cardBox_n044', 'orderTicket_n044', 'receiveTicket_n044', 'sample_n044', 'custCT_n044', 'mf_n044',
  'packScanDo_n044', 'packScanSen_n044', 'packScan_n044', 'packScanMF_n044',
  'polyOrd_n044', 'polyRec_n044', 'tagRcyRec_n044',
  'packScanDo', 'packScanSen', 'packScan', 'packScanMF',
  'polyOrd', 'polyRec', 'tagRcyRec',
  'prodRisk', 'pqc',
]);
export const USER_INPUT_HEAD_BG = 'color-mix(in srgb, var(--color-warning-500) 16%, var(--color-surface-1))';     // พื้นหัวตาราง (ทึบ — sticky)

export const PENDING_QTY_KEYS = new Set<string>([
  'stonePen', 'fitPen', 'wijPen', 'castPen', 'controlPen', 'grindPen', 'polishPen', 'platePen', 'exportQty', 'balQty'
]);
export const PENDING_QTY_HEAD_BG = 'color-mix(in srgb, var(--color-danger-500) 12%, var(--color-surface-1))';

export const METRICS_KEYS = new Set<string>(['sku', 'qty', 'amount']);
export const METRICS_BG = 'color-mix(in srgb, var(--color-brand-500) 10%, transparent)';
export const METRICS_HEAD_BG = 'color-mix(in srgb, var(--color-brand-500) 12%, var(--color-surface-1))';

// Default columns ต่อกลุ่ม (fromSystemเก่า — ดู PO_TRACKER_REVAMP_PLAN.md §4)
// ลำดับใน array ไม่มีผล (เป็น membership set) — ลำดับDisplayมาfrom key order ของ MASTER_COLS
export const GROUP_PRESETS: Record<string, string[]> = {
  // General (ปุ่ม "General" map มาที่ key ALL)
  ALL: [
    'no', 'week', 'cust', 'po', 'newReplen', 'orddate', 'due', 'custdue', 'sku', 'qty',
    'qc1qty', 'qc1date', 'qc1fail',
    'controlPen', 'polishPen', 'platePen', 'exportQty', 'balQty', 'expPct',
    'prodRisk', 'pqc', 'receiveTicket', 'remark', 'amount', 'arrow'
  ],
  N008: [
    'no', 'week', 'cust', 'po', 'po2', 'newReplen', 'metal', 'shipto', 'orddate', 'due', 'qcdate', 'bookInspect', 'bookShip', 'custdue', 'oor', 'sku', 'qty',
    'controlPen', 'polishPen', 'platePen',
    'prodRisk', 'pqc', 'cardBox', 'orderTicket', 'receiveTicket', 'packScan', 'remark', 'amount', 'arrow'
  ],
  N044: [
    'no', 'week', 'cust', 'po', 'po2', 'newReplen', 'metal', 'shipto', 'orddate', 'due', 'qcdate', 'bookInspect', 'qa_n044', 'bookShip', 'custdue', 'oor',
    'sku', 'qty', 'controlPen', 'polishPen', 'platePen', 'prodRisk', 'pqc',
    'receiveTicket_n044', 'sample_n044', 'custCT_n044', 'mf_n044',
    'packScanDo_n044', 'packScanSen_n044', 'packScan_n044', 'packScanMF_n044',
    'polyOrd_n044', 'polyRec_n044', 'tagRcyRec_n044',
    'cardBox_n044', 'orderTicket_n044', 'remark', 'amount', 'arrow'
  ],
  MLT: [
    'no', 'week', 'cust', 'po', 'newReplen', 'orddate', 'due', 'custdue', 'sku', 'qty',
    'bookInspect', 'qc1qty', 'qc1date', 'qc1fail', 'qc2qty', 'qc2date', 'qc2fail',
    'orderTicket', 'receiveTicket', 'polyOrd', 'polyRec',
    'controlPen', 'polishPen', 'platePen',
    'prodRisk', 'pqc', 'remark', 'amount', 'arrow'
  ],
  N051: [
    'no', 'week', 'cust', 'po', 'newReplen', 'metal', 'shipto', 'photo', 'orddate', 'custdue', 'sku', 'qty',
    'controlPen', 'polishPen', 'platePen', 'exportQty', 'balQty', 'expPct',
    'prodRisk', 'pqc', 'remark', 'amount', 'arrow'
  ],
  N083: [
    'no', 'week', 'cust', 'po', 'newReplen', 'orddate', 'due', 'custdue', 'sku', 'qty',
    'qc1qty', 'qc1date', 'qc1fail', 'qc2qty', 'qc2date', 'qc2fail',
    'controlPen', 'polishPen', 'platePen',
    'prodRisk', 'pqc', 'receiveTicket', 'remark', 'amount', 'arrow'
  ],
  N098: [
    'no', 'week', 'cust', 'po', 'po2', 'newReplen', 'orddate', 'due', 'custdue', 'sku', 'qty',
    'qc1qty', 'qc1date', 'qc1fail',
    'controlPen', 'polishPen', 'platePen', 'exportQty', 'balQty', 'expPct',
    'prodRisk', 'pqc', 'receiveTicket', 'remark', 'amount', 'arrow'
  ],
};

// หมวดหมู่คอลัมน์สำหรับ View Columns picker (ให้หาง่าย) — ไม่รวม always-on (no/week/cust/po/arrow)
export const COLUMN_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Customer Data', keys: ['po2', 'ordno', 'newReplen', 'metal', 'shipto', 'photo', 'orddate', 'due', 'qa', 'sgs', 'qcdate', 'custdue', 'oor', 'sku', 'qty', 'amount', 'remark'] },
  { label: 'Production — Stage', keys: ['stonePen', 'fitPen', 'wijPen', 'castPen', 'controlPen', 'grindPen', 'polishPen', 'platePen', 'exportQty', 'balQty', 'expPct'] },
  { label: 'Production — Book / QC', keys: ['bookInspect', 'bookShip', 'qc1qty', 'qc1date', 'qc1fail', 'qc2qty', 'qc2date', 'qc2fail', 'qc3qty', 'qc3date'] },
  { label: 'Production — Pack / Tag', keys: ['cardBox', 'orderTicket', 'receiveTicket', 'sample', 'custCT', 'mf', 'packScanDo', 'packScanSen', 'packScan', 'packScanMF', 'polyOrd', 'polyRec', 'tagRcyRec'] },
  { label: 'Production — Issue / Plan', keys: ['prodRisk', 'pqc'] },
];
