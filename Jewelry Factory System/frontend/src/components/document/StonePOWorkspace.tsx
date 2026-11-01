import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  Building2,
  Coins,
  Layers,
  Info,
  CheckCircle2,
  Clock,
  PackageCheck,
} from 'lucide-react';
import type { ProcDocDetail, ProcDocLine } from '../../services/procurementAPI';

interface DocListItem {
  no: string;
  date: string;
  status?: string;
}

interface StonePOWorkspaceProps {
  docList: DocListItem[];
  selectedDocNo: string;
  onSelectDoc: (no: string) => void;
  docDetail: ProcDocDetail | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  search: string;
  onSearchChange: (text: string) => void;
}

export const StonePOWorkspace: React.FC<StonePOWorkspaceProps> = ({
  docList,
  selectedDocNo,
  onSelectDoc,
  docDetail,
  loading,
  detailLoading,
  error,
  page,
  totalPages,
  onPageChange,
  search,
  onSearchChange,
}) => {
  const navigate = useNavigate();

  // Selected row in the table
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(0);

  // Quick Table Filters
  const [lineSearch, setLineSearch] = useState<string>('');
  const [shapeFilter, setShapeFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');

  const header = docDetail?.header;
  const lines: ProcDocLine[] = useMemo(() => docDetail?.lines || [], [docDetail?.lines]);

  // Extract distinct shapes and grades for dynamic dropdown filters
  const availableShapes = useMemo(() => {
    const set = new Set<string>();
    lines.forEach((l) => {
      if (l.shape && l.shape.trim()) set.add(l.shape.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [lines]);

  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    lines.forEach((l) => {
      if (l.grade && l.grade.trim()) set.add(l.grade.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [lines]);

  // Filtered lines based on table toolbar filters
  const filteredLines = useMemo(() => {
    return lines.filter((l) => {
      if (shapeFilter !== 'ALL' && (l.shape || '').trim().toUpperCase() !== shapeFilter) {
        return false;
      }
      if (gradeFilter !== 'ALL' && (l.grade || '').trim().toUpperCase() !== gradeFilter) {
        return false;
      }
      if (lineSearch.trim()) {
        const q = lineSearch.toLowerCase();
        const match =
          (l.stoneCode || '').toLowerCase().includes(q) ||
          (l.stoneName || '').toLowerCase().includes(q) ||
          (l.orderNumber || '').toLowerCase().includes(q) ||
          (l.customer || '').toLowerCase().includes(q) ||
          (l.characteristic || '').toLowerCase().includes(q) ||
          (l.color || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [lines, shapeFilter, gradeFilter, lineSearch]);

  const currentLine: ProcDocLine | undefined =
    filteredLines[selectedLineIndex] || filteredLines[0] || lines[0];

  // Calculated totals
  const totalFilteredQty = useMemo(
    () => filteredLines.reduce((acc, l) => acc + (l.qty || 0), 0),
    [filteredLines]
  );
  const totalFilteredAmount = useMemo(
    () => filteredLines.reduce((acc, l) => acc + (l.amount || 0), 0),
    [filteredLines]
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!lines.length || !header) return;
    const csvHeaders = [
      'Seq',
      'Stone Code',
      'Stone Name',
      'Color',
      'Shape',
      'Size(mm)',
      'Cut/Spec',
      'Grade',
      'Order No',
      'Cust',
      'Height',
      'Price/Ct',
      'Ct/Pc',
      'Qty',
      'Price',
      'Amount',
      'Remark 1',
      'Remark 2',
    ];
    const csvRows = lines.map((l, i) => [
      l.seq || i + 1,
      `"${l.stoneCode || ''}"`,
      `"${(l.stoneName || '').replace(/"/g, '""')}"`,
      `"${l.color || ''}"`,
      `"${l.shape || ''}"`,
      `"${l.size || ''}"`,
      `"${l.characteristic || ''}"`,
      `"${l.grade || ''}"`,
      `"${l.orderNumber || ''}"`,
      `"${l.customer || ''}"`,
      l.height || '',
      l.ctPerPc ? l.ctPerPc.toFixed(4) : '',
      l.ctPerPc ? l.ctPerPc.toFixed(4) : '',
      l.qty || 0,
      l.price ? l.price.toFixed(4) : 0,
      l.amount ? l.amount.toFixed(2) : 0,
      `"${(l.remark1 || l.remark || '').replace(/"/g, '""')}"`,
      `"${(l.remark2 || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [csvHeaders.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${header.docNumber || 'StonePO'}_lines.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setLineSearch('');
    setShapeFilter('ALL');
    setGradeFilter('ALL');
    setSelectedLineIndex(0);
  };

  return (
    <div
      className="flex-1 min-h-0 w-full flex overflow-hidden font-body"
      style={{
        backgroundColor: 'var(--color-surface-1)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* ── Left Column: Doc No. Navigator Strip ── */}
      <aside
        className="w-48 sm:w-52 shrink-0 flex flex-col border-r overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface-0)',
          borderColor: 'var(--color-border-light)',
        }}
      >
        {/* Navigator Header & Quick Search */}
        <div
          className="p-2.5 border-b flex flex-col gap-2 shrink-0"
          style={{
            backgroundColor: 'var(--color-surface-0)',
            borderColor: 'var(--color-border-light)',
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <PackageCheck size={13} style={{ color: 'var(--color-brand-600)' }} />
              <span>Stone PO List</span>
            </span>
            <span
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {docList.length}
            </span>
          </div>

          {/* Quick Filter Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search PO No..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full text-[11px] font-mono px-2 py-1.5 pl-6 rounded-md border outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-default)',
                color: 'var(--color-text-primary)',
              }}
            />
            <Search
              size={12}
              className="absolute left-2 top-2.5 pointer-events-none"
              style={{ color: 'var(--color-text-tertiary)' }}
            />
          </div>
        </div>

        {/* Doc List Items */}
        <div className="flex-1 overflow-y-auto content-scrollbar">
          {loading ? (
            <div className="flex flex-col gap-1 p-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="app-skeleton h-7 rounded" />
              ))}
            </div>
          ) : docList.length === 0 ? (
            <div
              className="p-6 text-center text-[11px] font-bold"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              No Stone PO documents found
            </div>
          ) : (
            docList.map((doc) => {
              const isSelected = doc.no === selectedDocNo;
              return (
                <button
                  key={doc.no}
                  type="button"
                  onClick={() => {
                    onSelectDoc(doc.no);
                    setSelectedLineIndex(0);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] font-mono border-b transition-all flex items-center justify-between cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--color-brand-600) 10%, var(--color-surface-0))'
                      : 'transparent',
                    borderColor: 'var(--color-border-light)',
                    color: isSelected ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                    fontWeight: isSelected ? 800 : 600,
                    borderLeft: isSelected
                      ? '3px solid var(--color-brand-600)'
                      : '3px solid transparent',
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{doc.no}</span>
                    <span
                      className="text-[9px] font-normal"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {doc.date}
                    </span>
                  </div>
                  {doc.status && (
                    <span
                      className="text-[9px] font-bold uppercase px-1 py-0.2 rounded shrink-0"
                      style={{
                        backgroundColor: 'var(--color-surface-2)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {doc.status === 'N' ? 'Norm' : doc.status}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            className="p-2 border-t flex items-center justify-between text-[10px] shrink-0"
            style={{
              backgroundColor: 'var(--color-surface-0)',
              borderColor: 'var(--color-border-light)',
            }}
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded border disabled:opacity-30 cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
              title="Previous Page"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="font-mono font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded border disabled:opacity-30 cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
              title="Next Page"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </aside>

      {/* ── Right Column: Pure Data Grid Workspace (Concept B) ── */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 gap-2.5">
        {error && (
          <div
            className="p-2.5 rounded-lg border text-[12px] font-bold flex items-center justify-between shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-danger-500) 10%, var(--color-surface-0))',
              borderColor: 'var(--color-danger-500)',
              color: 'var(--color-danger-500)',
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {detailLoading ? (
          <div className="flex-1 flex flex-col gap-3 items-center justify-center">
            <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Loading Stone PO Document...
            </span>
          </div>
        ) : !header ? (
          <div className="flex-1 flex flex-col gap-2 items-center justify-center">
            <PackageCheck size={36} style={{ color: 'var(--color-text-tertiary)' }} />
            <span className="text-[13px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Select a Stone Purchase Order from the left panel to inspect data
            </span>
          </div>
        ) : (
          <>
            {/* ── 1. MODERN ORDER & VENDOR SUMMARY BANNER ── */}
            <section
              className="rounded-xl border p-3.5 flex flex-col gap-3 shrink-0"
              style={{
                backgroundColor: 'var(--color-surface-0)',
                borderColor: 'var(--color-border-light)',
                boxShadow: 'var(--shadow-panel)',
              }}
            >
              {/* Top Row: Doc Identifier + Dates + Print/Export Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                {/* Left: Doc No + Status */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                      PO No:
                    </span>
                    <span className="text-[16px] font-mono font-black tracking-tight" style={{ color: 'var(--color-brand-600)' }}>
                      {header.docNumber || '—'}
                    </span>
                  </div>

                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-proc-polishing, var(--color-success-600)) 15%, transparent)',
                      color: 'var(--color-proc-polishing, var(--color-success-600))',
                    }}
                  >
                    <CheckCircle2 size={11} />
                    <span>{header.status === 'N' ? 'Active / Normal' : header.status || 'Active'}</span>
                  </span>

                  {/* Dates Strip */}
                  <div className="flex items-center gap-3 text-[11px] font-medium ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                      <span style={{ color: 'var(--color-text-tertiary)' }}>PO Date:</span>
                      <strong className="font-mono">{header.purchaseDate || header.docDate || '—'}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                      <span style={{ color: 'var(--color-text-tertiary)' }}>Due:</span>
                      <strong className="font-mono" style={{ color: 'var(--color-brand-600)' }}>
                        {header.dueDate || '—'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Right: Print & Export Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-surface-1)',
                      borderColor: 'var(--color-border-light)',
                      color: 'var(--color-text-secondary)',
                    }}
                    title="Export lines to CSV"
                  >
                    <FileSpreadsheet size={13} style={{ color: 'var(--color-proc-polishing, var(--color-success-600))' }} />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-surface-1)',
                      borderColor: 'var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                    title="Print Stone Purchase Order"
                  >
                    <Printer size={13} style={{ color: 'var(--color-brand-600)' }} />
                    <span>Print PO</span>
                  </button>
                </div>
              </div>

              {/* Bottom Row: 3 Key Info Cards (Supplier Dossier, Total Amount, Total Volume) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Supplier Card */}
                <div
                  className="p-2.5 rounded-lg border flex items-start gap-2.5"
                  style={{
                    backgroundColor: 'var(--color-surface-1)',
                    borderColor: 'var(--color-border-light)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                      color: 'var(--color-brand-600)',
                    }}
                  >
                    <Building2 size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                      Supplier / Vendor
                    </div>
                    <div className="text-[13px] font-black truncate" style={{ color: 'var(--color-text-primary)' }} title={header.supplierName || ''}>
                      {header.supplierName || '—'}
                    </div>
                    <div className="text-[10px] font-mono font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                      Code: {header.supplierCode || '—'} {header.buyer ? `• Buyer: ${header.buyer}` : ''}
                    </div>
                  </div>
                </div>

                {/* 2. Total Amount Card */}
                <div
                  className="p-2.5 rounded-lg border flex items-start gap-2.5"
                  style={{
                    backgroundColor: 'var(--color-surface-1)',
                    borderColor: 'var(--color-border-light)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-proc-polishing, var(--color-success-600)) 12%, transparent)',
                      color: 'var(--color-proc-polishing, var(--color-success-600))',
                    }}
                  >
                    <Coins size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                      Total PO Amount ({header.currency || 'THB'})
                    </div>
                    <div className="text-[16px] font-mono font-black" style={{ color: 'var(--color-text-primary)' }}>
                      {header.totalAmount
                        ? header.totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '0.00'}{' '}
                      <span className="text-[11px] font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                        {header.currency || 'THB'}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                      Currency: {header.currency || 'THB'} • Exch: {header.exchangeRate || 1}
                    </div>
                  </div>
                </div>

                {/* 3. Total Quantity & Line Count */}
                <div
                  className="p-2.5 rounded-lg border flex items-start gap-2.5"
                  style={{
                    backgroundColor: 'var(--color-surface-1)',
                    borderColor: 'var(--color-border-light)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-text-tertiary) 15%, transparent)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Layers size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                      Total Volume & Items
                    </div>
                    <div className="text-[16px] font-mono font-black" style={{ color: 'var(--color-text-primary)' }}>
                      {header.totalQty ? header.totalQty.toLocaleString() : '0'}{' '}
                      <span className="text-[11px] font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                        Pcs
                      </span>
                    </div>
                    <div className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                      Total Lines: {lines.length} recorded items
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 2. QUICK SEARCH & FILTERS TOOLBAR ── */}
            <div
              className="rounded-lg border px-3 py-2 flex items-center justify-between flex-wrap gap-2 shrink-0"
              style={{
                backgroundColor: 'var(--color-surface-0)',
                borderColor: 'var(--color-border-light)',
                boxShadow: 'var(--shadow-panel)',
              }}
            >
              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
                {/* Search within lines */}
                <div className="relative w-56 sm:w-64">
                  <input
                    type="text"
                    placeholder="Filter stone, order no..."
                    value={lineSearch}
                    onChange={(e) => {
                      setLineSearch(e.target.value);
                      setSelectedLineIndex(0);
                    }}
                    className="w-full text-[11px] font-mono px-2 py-1 pl-6 rounded border outline-none"
                    style={{
                      backgroundColor: 'var(--color-surface-1)',
                      borderColor: 'var(--color-border-default)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <Search
                    size={11}
                    className="absolute left-1.5 top-2 pointer-events-none"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  />
                </div>

                {/* Shape Filter */}
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-tertiary)' }}>
                    Shape:
                  </span>
                  <select
                    value={shapeFilter}
                    onChange={(e) => {
                      setShapeFilter(e.target.value);
                      setSelectedLineIndex(0);
                    }}
                    className="text-[11px] font-mono font-bold px-2 py-1 rounded border outline-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-surface-1)',
                      borderColor: 'var(--color-border-default)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="ALL">All Shapes ({availableShapes.length})</option>
                    {availableShapes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Filter */}
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-tertiary)' }}>
                    Grade:
                  </span>
                  <select
                    value={gradeFilter}
                    onChange={(e) => {
                      setGradeFilter(e.target.value);
                      setSelectedLineIndex(0);
                    }}
                    className="text-[11px] font-bold px-2 py-1 rounded border outline-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-surface-1)',
                      borderColor: 'var(--color-border-default)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="ALL">All Grades ({availableGrades.length})</option>
                    {availableGrades.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters */}
                {(lineSearch || shapeFilter !== 'ALL' || gradeFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-surface-2)',
                      borderColor: 'var(--color-border-light)',
                      color: 'var(--color-text-secondary)',
                    }}
                    title="Reset all filters"
                  >
                    <RotateCcw size={10} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Right: Record count */}
              <div className="text-[11px] font-mono font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Showing <strong style={{ color: 'var(--color-brand-600)' }}>{filteredLines.length}</strong> of{' '}
                {lines.length} items
              </div>
            </div>

            {/* ── 3. PRECISION 15-COLUMN DATA GRID (The Core Table) ── */}
            <div
              className="flex-1 min-h-0 flex flex-col rounded-xl border overflow-hidden"
              style={{
                backgroundColor: 'var(--color-surface-0)',
                borderColor: 'var(--color-border-light)',
                boxShadow: 'var(--shadow-panel)',
              }}
            >
              <div className="flex-1 min-h-0 overflow-auto content-scrollbar">
                <table className="w-full text-left text-[11px] border-collapse" style={{ minWidth: '1200px' }}>
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'var(--color-surface-1)',
                      zIndex: 10,
                      boxShadow: '0 1px 0 var(--color-border-default)',
                    }}
                  >
                    <tr
                      className="font-black text-[10px] uppercase tracking-wider select-none"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      <th className="py-2.5 px-2 text-center w-10">#</th>
                      <th className="py-2.5 px-2.5 text-left min-w-[200px]">Stone Code & Description</th>
                      <th className="py-2.5 px-2 text-left w-16">Color</th>
                      <th className="py-2.5 px-2 text-left w-16">Shape</th>
                      <th className="py-2.5 px-2 text-left w-20">Size (mm)</th>
                      <th className="py-2.5 px-2 text-left w-20">Cut / Spec</th>
                      <th className="py-2.5 px-2 text-center w-14">Grade</th>
                      <th className="py-2.5 px-2 text-left w-28">PCC Order</th>
                      <th className="py-2.5 px-2 text-left w-16">Cust</th>
                      <th className="py-2.5 px-2 text-right w-16">Height</th>
                      <th className="py-2.5 px-2 text-right w-20">Price/Ct</th>
                      <th className="py-2.5 px-2 text-right w-18">Ct/Pc</th>
                      <th className="py-2.5 px-2 text-right w-20">Qty</th>
                      <th className="py-2.5 px-2 text-right w-22">Price</th>
                      <th className="py-2.5 px-2 text-right w-28">Amount ({header.currency || 'THB'})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={15}
                          className="py-12 text-center text-[12px] font-bold"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          No line items match the selected filter
                        </td>
                      </tr>
                    ) : (
                      filteredLines.map((line, idx) => {
                        const isSelected = selectedLineIndex === idx;
                        return (
                          <tr
                            key={line.seq || idx}
                            onClick={() => setSelectedLineIndex(idx)}
                            className="border-b transition-colors cursor-pointer"
                            style={{
                              borderColor: 'var(--color-border-light)',
                              backgroundColor: isSelected
                                ? 'color-mix(in srgb, var(--color-brand-600) 10%, var(--color-surface-0))'
                                : idx % 2 === 0
                                ? 'var(--color-surface-0)'
                                : 'var(--color-surface-1)',
                            }}
                          >
                            <td
                              className="py-2 px-2 text-center font-mono font-bold"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              {line.seq || idx + 1}
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="flex flex-col min-w-0">
                                <span
                                  className="font-mono font-bold text-[11px] truncate"
                                  style={{ color: 'var(--color-brand-600)' }}
                                >
                                  {line.stoneCode || '—'}
                                </span>
                                <span
                                  className="text-[10px] truncate"
                                  style={{ color: 'var(--color-text-primary)' }}
                                  title={line.stoneName || ''}
                                >
                                  {line.stoneName || '—'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2 font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                              {line.color || '—'}
                            </td>
                            <td
                              className="py-2 px-2 font-mono font-bold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px]"
                                style={{
                                  backgroundColor: 'var(--color-surface-2)',
                                  border: '1px solid var(--color-border-light)',
                                }}
                              >
                                {line.shape || '—'}
                              </span>
                            </td>
                            <td
                              className="py-2 px-2 font-mono font-bold"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {line.size || '—'}
                            </td>
                            <td className="py-2 px-2 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                              {line.characteristic || '—'}
                            </td>
                            <td
                              className="py-2 px-2 text-center font-bold"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {line.grade || '—'}
                            </td>
                            <td className="py-2 px-2">
                              {line.orderNumber ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/po-tracker');
                                  }}
                                  className="inline-flex items-center gap-1 font-mono font-black text-[11px] hover:underline cursor-pointer"
                                  style={{ color: 'var(--color-brand-600)' }}
                                  title="View Order in PCC Production Tracker"
                                >
                                  <span>{line.orderNumber}</span>
                                  <ExternalLink size={10} />
                                </button>
                              ) : (
                                <span className="font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
                                  —
                                </span>
                              )}
                            </td>
                            <td
                              className="py-2 px-2 font-mono font-bold text-[10px]"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {line.customer || '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                              {line.height ? line.height.toString() : '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                              {line.ctPerPc ? line.ctPerPc.toFixed(4) : '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                              {line.ctPerPc ? line.ctPerPc.toFixed(4) : '—'}
                            </td>
                            <td
                              className="py-2 px-2 text-right font-mono font-black"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {line.qty ? line.qty.toLocaleString() : '0'}
                            </td>
                            <td
                              className="py-2 px-2 text-right font-mono font-bold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {line.price
                                ? line.price.toLocaleString(undefined, {
                                    minimumFractionDigits: 4,
                                    maximumFractionDigits: 4,
                                  })
                                : '0.0000'}
                            </td>
                            <td
                              className="py-2 px-2 text-right font-mono font-black text-[12px]"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {line.amount
                                ? line.amount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : '0.00'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredLines.length > 0 && (
                    <tfoot
                      style={{
                        position: 'sticky',
                        bottom: 0,
                        backgroundColor: 'var(--color-surface-1)',
                        borderTop: '2px solid var(--color-border-default)',
                        zIndex: 10,
                      }}
                    >
                      <tr className="font-extrabold text-[11px]">
                        <td
                          colSpan={12}
                          className="py-2 px-3 text-right uppercase tracking-wider"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          Total ({filteredLines.length} Items):
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black text-[12px]" style={{ color: 'var(--color-text-primary)' }}>
                          {totalFilteredQty.toLocaleString()}
                        </td>
                        <td></td>
                        <td className="py-2 px-2 text-right font-mono font-black text-[13px]" style={{ color: 'var(--color-brand-600)' }}>
                          {totalFilteredAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ── 4. ACTIVE ROW DETAIL & REMARKS (Bottom Strip) ── */}
            {currentLine && (
              <div
                className="rounded-lg border px-3 py-2 flex items-center justify-between flex-wrap gap-2 shrink-0 text-[11px]"
                style={{
                  backgroundColor: 'var(--color-surface-0)',
                  borderColor: 'var(--color-border-light)',
                  boxShadow: 'var(--shadow-panel)',
                }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    <Info size={13} style={{ color: 'var(--color-brand-600)' }} />
                    <span>Selected:</span>
                    <strong className="font-mono" style={{ color: 'var(--color-text-primary)' }}>
                      #{currentLine.seq || selectedLineIndex + 1} {currentLine.stoneCode}
                    </strong>
                  </span>

                  {(currentLine.remark1 || currentLine.remark) && (
                    <span className="flex items-center gap-1">
                      <span className="font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Remark (TH):</span>
                      <span style={{ color: 'var(--color-text-primary)' }}>{currentLine.remark1 || currentLine.remark}</span>
                    </span>
                  )}

                  {currentLine.remark2 && (
                    <span className="flex items-center gap-1">
                      <span className="font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Remark (EN):</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{currentLine.remark2}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 font-mono text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  <span>Shape: {currentLine.shape || '—'}</span>
                  <span>Size: {currentLine.size || '—'}</span>
                  <span>Cut: {currentLine.characteristic || '—'}</span>
                  <span>Grade: {currentLine.grade || '—'}</span>
                  <span>Height: {currentLine.height ? `${currentLine.height}mm` : '—'}</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default StonePOWorkspace;
