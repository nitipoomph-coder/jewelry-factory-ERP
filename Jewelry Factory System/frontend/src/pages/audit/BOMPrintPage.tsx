import { useState, useMemo } from 'react';
import {
  Printer,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Layers,
  Sparkles,
  Download,
  Gem,
  Coins,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface BOMItem {
  id: string;
  orderNo: string;
  poNo: string;
  customer: string;
  itemNo: string;
  description: string;
  metal: string;
  orderQty: number;
  castingWeightPerPc: number;
  totalMetalWeight: number;
  lossRate: number;
  gemstoneCount: number;
  status: 'PENDING' | 'VERIFIED' | 'APPROVED';
  moldCode: string;
  deliveryDate: string;
  auditor: string;
  stones: {
    seq: number;
    stoneCode: string;
    shapeSize: string;
    qtyPerPc: number;
    totalQty: number;
    settingType: string;
  }[];
  findings: {
    seq: number;
    partName: string;
    qtyPerPc: number;
    totalQty: number;
    unit: string;
  }[];
}

const INITIAL_BOM_DATA: BOMItem[] = [
  {
    id: 'BOM-001',
    orderNo: 'ORD-2026-0891',
    poNo: 'PO-N044-5520',
    customer: 'N044',
    itemNo: 'RG-925-0142',
    description: 'Solitaire Ring with Halo Micro-pave CZ',
    metal: 'Silver 925',
    orderQty: 250,
    castingWeightPerPc: 3.45,
    totalMetalWeight: 862.5,
    lossRate: 8.5,
    gemstoneCount: 28,
    status: 'APPROVED',
    moldCode: 'M-SLV-084',
    deliveryDate: '2026-11-15',
    auditor: 'ADMIN',
    stones: [
      { seq: 1, stoneCode: 'CZ-WHT-RD-6.5', shapeSize: 'Round 6.5mm', qtyPerPc: 1, totalQty: 250, settingType: '4-Prong Center' },
      { seq: 2, stoneCode: 'CZ-WHT-RD-1.2', shapeSize: 'Round 1.2mm', qtyPerPc: 20, totalQty: 5000, settingType: 'Micro-pave Halo' },
      { seq: 3, stoneCode: 'CZ-WHT-RD-1.0', shapeSize: 'Round 1.0mm', qtyPerPc: 7, totalQty: 1750, settingType: 'Channel Shank' },
    ],
    findings: [
      { seq: 1, partName: 'Ring Shank Base 925', qtyPerPc: 1, totalQty: 250, unit: 'PCS' },
      { seq: 2, partName: 'Logo Stamp Tag 925', qtyPerPc: 1, totalQty: 250, unit: 'PCS' },
    ],
  },
  {
    id: 'BOM-002',
    orderNo: 'ORD-2026-0892',
    poNo: 'PO-KSP-3319',
    customer: 'KSP',
    itemNo: 'ER-BRS-0310',
    description: 'Geometric Drop Earrings with Baguette Accents',
    metal: 'Brass Quality A',
    orderQty: 600,
    castingWeightPerPc: 4.80,
    totalMetalWeight: 2880.0,
    lossRate: 7.0,
    gemstoneCount: 12,
    status: 'VERIFIED',
    moldCode: 'M-BRS-192',
    deliveryDate: '2026-11-20',
    auditor: 'ADMIN',
    stones: [
      { seq: 1, stoneCode: 'CZ-WHT-BG-2x4', shapeSize: 'Baguette 2x4mm', qtyPerPc: 4, totalQty: 2400, settingType: 'Bar Setting' },
      { seq: 2, stoneCode: 'CZ-WHT-RD-1.5', shapeSize: 'Round 1.5mm', qtyPerPc: 8, totalQty: 4800, settingType: 'Bezel Setting' },
    ],
    findings: [
      { seq: 1, partName: 'Earring Post (Silver Pin)', qtyPerPc: 2, totalQty: 1200, unit: 'PAIR' },
      { seq: 2, partName: 'Butterfly Scroll Backing', qtyPerPc: 2, totalQty: 1200, unit: 'PAIR' },
    ],
  },
  {
    id: 'BOM-003',
    orderNo: 'ORD-2026-0895',
    poNo: 'PO-N044-5528',
    customer: 'N044',
    itemNo: 'PD-925-0722',
    description: 'Floral Motif Pendant with Swiss Blue Topaz',
    metal: 'Silver 925',
    orderQty: 180,
    castingWeightPerPc: 2.90,
    totalMetalWeight: 522.0,
    lossRate: 8.5,
    gemstoneCount: 16,
    status: 'PENDING',
    moldCode: 'M-SLV-305',
    deliveryDate: '2026-11-28',
    auditor: '-',
    stones: [
      { seq: 1, stoneCode: 'TPZ-SW-OV-5x7', shapeSize: 'Oval 5x7mm Swiss Blue', qtyPerPc: 1, totalQty: 180, settingType: 'Crown Bezel' },
      { seq: 2, stoneCode: 'CZ-WHT-RD-1.1', shapeSize: 'Round 1.1mm', qtyPerPc: 15, totalQty: 2700, settingType: 'Micro-pave Petals' },
    ],
    findings: [
      { seq: 1, partName: 'Pendant Bail V-Shape', qtyPerPc: 1, totalQty: 180, unit: 'PCS' },
    ],
  },
  {
    id: 'BOM-004',
    orderNo: 'ORD-2026-0901',
    poNo: 'PO-THAI-1044',
    customer: 'THAI',
    itemNo: 'BR-925-0089',
    description: 'Tennis Bracelet 7.25 inch Box Clasp',
    metal: 'Silver 925',
    orderQty: 120,
    castingWeightPerPc: 11.20,
    totalMetalWeight: 1344.0,
    lossRate: 9.0,
    gemstoneCount: 52,
    status: 'APPROVED',
    moldCode: 'M-SLV-512',
    deliveryDate: '2026-12-05',
    auditor: 'ADMIN',
    stones: [
      { seq: 1, stoneCode: 'CZ-WHT-RD-3.0', shapeSize: 'Round 3.0mm AAA', qtyPerPc: 52, totalQty: 6240, settingType: '4-Prong Shared' },
    ],
    findings: [
      { seq: 1, partName: 'Box Clasp with Dual Figure-8 Safety', qtyPerPc: 1, totalQty: 120, unit: 'SET' },
    ],
  },
];

export default function BOMPrintPage() {
  const { showToast } = useToast();
  const [bomList] = useState<BOMItem[]>(INITIAL_BOM_DATA);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_BOM_DATA[0].id);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const selectedBOM = useMemo(() => {
    return bomList.find(b => b.id === selectedId) || bomList[0];
  }, [bomList, selectedId]);

  const filteredBOMList = useMemo(() => {
    return bomList.filter(item => {
      const matchSearch =
        search === '' ||
        item.orderNo.toLowerCase().includes(search.toLowerCase()) ||
        item.poNo.toLowerCase().includes(search.toLowerCase()) ||
        item.itemNo.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      const matchCustomer = customerFilter === 'ALL' || item.customer === customerFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchCustomer && matchStatus;
    });
  }, [bomList, search, customerFilter, statusFilter]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    showToast('BOM specification exported to PDF / Print Sheet format', 'success');
  };

  const handleRefresh = () => {
    showToast('BOM audit records reloaded', 'info');
  };

  const getStatusBadge = (status: BOMItem['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-success-50)] text-[var(--color-success-600)] border border-[var(--color-success-500)]/30">
            <Check size={11} /> Approved
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-500)]/30">
            <CheckCircle2 size={11} /> Verified
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-warning-50)] text-[var(--color-warning-600)] border border-[var(--color-warning-500)]/30">
            <Clock size={11} /> Pending Audit
          </span>
        );
    }
  };

  return (
    <div className="app-page-scroll content-scrollbar p-3 sm:p-5 w-full">
      <div className="flex flex-col gap-4 max-w-[1600px] mx-auto w-full text-[var(--color-text-main)] pb-16">
        
        {/* ─── Top Header (Screen Only) ────────────────────────────────────────── */}
        <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-brand-500)] shadow-sm">
              <Printer size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-main)] m-0">
                  BOM Print & Audit
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--color-surface-2)] text-[var(--color-brand-500)] border border-[var(--color-border-subtle)]">
                  ADMIN AUDIT
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] m-0">
                ตรวจสอบสูตรการผลิต (Bill of Materials) และสั่งพิมพ์ใบงานสั่งผลิต (Production Job Sheet)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-1)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-1)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-brand-500)] text-[var(--color-overlay-text)] hover:opacity-90 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>Print BOM Sheet</span>
            </button>
          </div>
        </div>

        {/* ─── Workflow Ready Information Banner (Screen Only) ──────────────────── */}
        <div className="print:hidden rounded-xl border border-[var(--color-brand-500)]/30 bg-[var(--color-surface-1)] p-3.5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-500)] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[var(--color-text-main)]">
                  เมนู Audit สำหรับ Admin (BOM Print) ติดตั้งพร้อมใช้งานแล้ว
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded font-mono bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                  Route: /audit/bom-print
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed m-0">
                หน้าจอนี้ถูกจัดเตรียมโครงสร้างมาตรฐาน (Design System, High Data Density, และ Print Sheet Layout) เรียบร้อยแล้ว 
                เมื่อท่านแจ้งรายละเอียดเวิร์กโฟลว์ สูตรการดึงข้อมูล หรือฟอร์มเฉพาะเพิ่มเติม ระบบจะนำมาเชื่อมต่อทันที
              </p>
            </div>
          </div>
        </div>

        {/* ─── Metric Summary Cards (Screen Only) ──────────────────────────────── */}
        <div className="print:hidden grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] p-3 shadow-sm">
            <div className="flex items-center justify-between text-[var(--color-text-muted)] mb-1">
              <span className="text-xs font-medium">Total BOM Orders</span>
              <FileText size={15} />
            </div>
            <div className="text-lg font-bold text-[var(--color-text-main)]">{bomList.length}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Active in audit queue</div>
          </div>

          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] p-3 shadow-sm">
            <div className="flex items-center justify-between text-[var(--color-text-muted)] mb-1">
              <span className="text-xs font-medium">Approved BOM</span>
              <CheckCircle2 size={15} className="text-[var(--color-success-500)]" />
            </div>
            <div className="text-lg font-bold text-[var(--color-text-main)]">
              {bomList.filter(b => b.status === 'APPROVED').length}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Ready for production floor</div>
          </div>

          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] p-3 shadow-sm">
            <div className="flex items-center justify-between text-[var(--color-text-muted)] mb-1">
              <span className="text-xs font-medium">Pending Audit</span>
              <AlertCircle size={15} className="text-[var(--color-warning-500)]" />
            </div>
            <div className="text-lg font-bold text-[var(--color-text-main)]">
              {bomList.filter(b => b.status === 'PENDING').length}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Requires admin review</div>
          </div>

          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] p-3 shadow-sm">
            <div className="flex items-center justify-between text-[var(--color-text-muted)] mb-1">
              <span className="text-xs font-medium">Total Cast Weight</span>
              <Coins size={15} />
            </div>
            <div className="text-lg font-bold text-[var(--color-text-main)]">
              {bomList.reduce((acc, b) => acc + b.totalMetalWeight, 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} g
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Metal casting requirement</div>
          </div>
        </div>

        {/* ─── Search & Filters Bar (Screen Only) ──────────────────────────────── */}
        <div className="print:hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] p-3 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by Order No, PO, Item No, or Description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none focus:border-[var(--color-brand-500)]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Filter size={13} />
              <span>Customer:</span>
              <select
                value={customerFilter}
                onChange={e => setCustomerFilter(e.target.value)}
                className="py-1 px-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none text-xs cursor-pointer"
              >
                <option value="ALL">All Customers</option>
                <option value="N044">N044</option>
                <option value="KSP">KSP</option>
                <option value="THAI">THAI</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="py-1 px-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none text-xs cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending Audit</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Main Content Split: Order Queue & BOM Detail Preview ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Panel: Audit Queue Table (Screen Only) */}
          <div className="print:hidden lg:col-span-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] overflow-hidden shadow-sm flex flex-col">
            <div className="px-3 py-2.5 bg-[var(--color-surface-1)] border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                <Layers size={14} /> Production Orders ({filteredBOMList.length})
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Select order to view BOM</span>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[620px] custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-1)] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] text-[11px]">
                    <th className="py-2 px-3 font-semibold">Order / PO</th>
                    <th className="py-2 px-3 font-semibold">Item & Alloy</th>
                    <th className="py-2 px-3 font-semibold text-right">Qty</th>
                    <th className="py-2 px-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {filteredBOMList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-[var(--color-text-muted)] text-xs">
                        No orders match filter criteria
                      </td>
                    </tr>
                  ) : (
                    filteredBOMList.map(item => {
                      const isSelected = item.id === selectedId;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[var(--color-surface-2)] font-semibold'
                              : 'hover:bg-[var(--color-surface-1)]/70'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-xs text-[var(--color-text-main)]">{item.orderNo}</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">{item.poNo} ({item.customer})</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-xs text-[var(--color-brand-500)]">{item.itemNo}</div>
                            <div className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[140px]">{item.metal}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs text-[var(--color-text-main)]">
                            {item.orderQty} pcs
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {getStatusBadge(item.status)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel: Official BOM Sheet (Printable Document Card) */}
          <div className="lg:col-span-7 print:col-span-12 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] overflow-hidden shadow-sm p-4 sm:p-6 print:p-0 print:border-none print:shadow-none">
            
            {/* Document Header (Factory Identity) */}
            <div className="border-b-2 border-[var(--color-border-default)] pb-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--color-text-main)] m-0">
                    JEWELRY FACTORY CO., LTD.
                  </h2>
                  <div className="text-[11px] font-semibold tracking-wider text-[var(--color-brand-500)] uppercase">
                    PRODUCTION BILL OF MATERIALS (BOM) & AUDIT SHEET
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-[var(--color-text-main)]">
                    {selectedBOM.orderNo}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    Audit Reference: {selectedBOM.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-xs mb-4">
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] block uppercase font-medium">Customer</span>
                <span className="font-semibold text-[var(--color-text-main)]">{selectedBOM.customer}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] block uppercase font-medium">Customer PO</span>
                <span className="font-mono font-semibold text-[var(--color-text-main)]">{selectedBOM.poNo}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] block uppercase font-medium">Item Model</span>
                <span className="font-mono font-bold text-[var(--color-brand-500)]">{selectedBOM.itemNo}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] block uppercase font-medium">Order Quantity</span>
                <span className="font-mono font-bold text-[var(--color-text-main)]">{selectedBOM.orderQty} PCS</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] block uppercase font-medium">Metal Alloy</span>
                <span className="font-semibold text-[var(--color-text-main)]">{selectedBOM.metal}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] block uppercase font-medium">Mold / Block Code</span>
                <span className="font-mono text-[var(--color-text-main)]">{selectedBOM.moldCode}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] block uppercase font-medium">Target Delivery</span>
                <span className="font-mono text-[var(--color-text-main)]">{selectedBOM.deliveryDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] block uppercase font-medium">Audit Status</span>
                <div>{getStatusBadge(selectedBOM.status)}</div>
              </div>
            </div>

            {/* Section 1: Metal & Casting Specifications */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--color-border-subtle)]">
                <Coins size={14} className="text-[var(--color-brand-500)]" />
                <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wide m-0">
                  1. Metal Casting & Material Weights
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]">
                  <div className="text-[10px] text-[var(--color-text-muted)]">Cast Weight / Piece</div>
                  <div className="text-sm font-mono font-bold text-[var(--color-text-main)] mt-0.5">
                    {selectedBOM.castingWeightPerPc} g
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]">
                  <div className="text-[10px] text-[var(--color-text-muted)]">Total Net Metal Wt</div>
                  <div className="text-sm font-mono font-bold text-[var(--color-brand-500)] mt-0.5">
                    {selectedBOM.totalMetalWeight.toFixed(1)} g
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]">
                  <div className="text-[10px] text-[var(--color-text-muted)]">Loss Allowance %</div>
                  <div className="text-sm font-mono font-bold text-[var(--color-text-main)] mt-0.5">
                    +{selectedBOM.lossRate}%
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Gemstones & Setting Schedule */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2">
                  <Gem size={14} className="text-[var(--color-brand-500)]" />
                  <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wide m-0">
                    2. Gemstone & Setting Requirements
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  Total Stones: {selectedBOM.stones.reduce((acc, s) => acc + s.totalQty, 0)} pcs
                </span>
              </div>
              <div className="overflow-x-auto rounded border border-[var(--color-border-subtle)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-surface-1)] text-[var(--color-text-muted)] text-[10px] border-b border-[var(--color-border-subtle)]">
                      <th className="py-1.5 px-2 font-semibold">#</th>
                      <th className="py-1.5 px-2 font-semibold">Stone Code & Shape</th>
                      <th className="py-1.5 px-2 font-semibold text-right">Qty/Pc</th>
                      <th className="py-1.5 px-2 font-semibold text-right">Total Qty</th>
                      <th className="py-1.5 px-2 font-semibold">Setting Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)] font-mono text-[11px]">
                    {selectedBOM.stones.map(stone => (
                      <tr key={stone.seq} className="hover:bg-[var(--color-surface-1)]/50">
                        <td className="py-1.5 px-2 text-[var(--color-text-muted)]">{stone.seq}</td>
                        <td className="py-1.5 px-2 font-sans">
                          <span className="font-semibold text-[var(--color-text-main)] block">{stone.stoneCode}</span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">{stone.shapeSize}</span>
                        </td>
                        <td className="py-1.5 px-2 text-right">{stone.qtyPerPc}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-[var(--color-text-main)]">{stone.totalQty}</td>
                        <td className="py-1.5 px-2 font-sans text-[var(--color-text-muted)]">{stone.settingType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Findings & Assembly Parts */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--color-border-subtle)]">
                <Sparkles size={14} className="text-[var(--color-brand-500)]" />
                <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wide m-0">
                  3. Findings & Component Assembly
                </h3>
              </div>
              <div className="overflow-x-auto rounded border border-[var(--color-border-subtle)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-surface-1)] text-[var(--color-text-muted)] text-[10px] border-b border-[var(--color-border-subtle)]">
                      <th className="py-1.5 px-2 font-semibold">#</th>
                      <th className="py-1.5 px-2 font-semibold">Part Description</th>
                      <th className="py-1.5 px-2 font-semibold text-right">Qty/Pc</th>
                      <th className="py-1.5 px-2 font-semibold text-right">Total Qty</th>
                      <th className="py-1.5 px-2 font-semibold">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)] font-mono text-[11px]">
                    {selectedBOM.findings.map(finding => (
                      <tr key={finding.seq} className="hover:bg-[var(--color-surface-1)]/50">
                        <td className="py-1.5 px-2 text-[var(--color-text-muted)]">{finding.seq}</td>
                        <td className="py-1.5 px-2 font-sans text-[var(--color-text-main)]">{finding.partName}</td>
                        <td className="py-1.5 px-2 text-right">{finding.qtyPerPc}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-[var(--color-text-main)]">{finding.totalQty}</td>
                        <td className="py-1.5 px-2 font-sans text-[var(--color-text-muted)]">{finding.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sign-off & Audit Signature Footer (Form Sheet) */}
            <div className="pt-4 border-t border-[var(--color-border-default)]">
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div className="flex flex-col items-center">
                  <div className="h-10 border-b border-[var(--color-border-subtle)] w-full mb-1"></div>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Prepared by (ฝ่ายผลิต)</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-10 border-b border-[var(--color-border-subtle)] w-full mb-1 flex items-end justify-center pb-1">
                    <span className="font-mono text-xs font-bold text-[var(--color-brand-500)]">{selectedBOM.auditor}</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Audited by (ฝ่ายตรวจสอบ)</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-10 border-b border-[var(--color-border-subtle)] w-full mb-1"></div>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Approved by (ผู้บริหาร)</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
