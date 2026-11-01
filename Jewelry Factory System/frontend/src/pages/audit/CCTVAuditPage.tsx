// CCTV IT Audit Report — fill the checks on screen, print, sign by hand.
// Route: /audit/cctv-report (admin) · Zero-DB: form kept as JSON (localStorage + Import/Export).
import { useMemo, useRef, useState } from 'react';
import { Download, Printer, Trash2, Upload, Sparkles, Video } from 'lucide-react';
import CctvAuditTable from '../../components/audit/CctvAuditTable';
import { THAI_MONTHS } from '../../config/cctvAuditConfig';
import { useCctvAuditForm } from '../../hooks/useCctvAuditForm';

export default function CCTVAuditPage() {
  const {
    form,
    isGenerating,
    generate,
    importFile,
    exportForm,
    clearForm,
    onCycleStatus,
    onSetCell,
    onToggleHoliday,
    onSetMeta,
  } = useCctvAuditForm();

  const today = new Date();
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [sundayIsHoliday, setSundayIsHoliday] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthOptions = useMemo(
    () => THAI_MONTHS.map((label, i) => ({ value: String(i + 1), label })),
    [],
  );
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1].map((y) => ({ value: String(y), label: `${y + 543} (${y})` }));
  }, []);

  const handleGenerate = () => {
    if (form && !window.confirm('ฟอร์มปัจจุบันจะถูกแทนที่ด้วยฟอร์มใหม่ ต้องการดำเนินการต่อหรือไม่?\n(แนะนำให้ Export JSON เก็บไว้ก่อน)')) {
      return;
    }
    void generate(Number(year), Number(month), sundayIsHoliday);
  };

  const handleClear = () => {
    if (window.confirm('ล้างฟอร์มปัจจุบันออกจากเบราว์เซอร์นี้?\n(ถ้ายังไม่ได้ Export JSON ข้อมูลจะหาย)')) clearForm();
  };

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full text-[var(--color-text-primary)] pb-12">
        {/* ─── Top Header Bar (Screen Only) ────────────────────────────────────────── */}
        <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/10 flex items-center justify-center text-blue-500 shadow-xs">
              <Video size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] m-0">
                  CCTV Physical Security & Audit Report
                </h1>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300 font-semibold">
                  Monthly Compliance
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] m-0 mt-0.5">
                Surveillance inspection log, operational camera verification, and physical facility security checklist.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              disabled={!form}
              onClick={exportForm}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs border-0 disabled:opacity-40"
              title="Export Form data as JSON file"
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              disabled={!form}
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-xs border-0 disabled:opacity-40"
              title="Print standard audit checklist"
            >
              <Printer size={13} />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              disabled={!form}
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all cursor-pointer shadow-xs border-0 disabled:opacity-40"
              title="Clear current form from storage"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* ─── Modern Clean Toolbar (Screen Only) ─────────────────────────────────── */}
        <div className="no-print bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              <Upload size={13} />
              <span>Import Form JSON</span>
            </button>

            <span className="h-5 w-px bg-slate-200 dark:bg-slate-700/60 mx-1" aria-hidden="true" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Month:</span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="py-2 px-3 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Year:</span>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="py-2 px-3 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {yearOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer pl-1 select-none">
              <input
                type="checkbox"
                checked={sundayIsHoliday}
                onChange={(e) => setSundayIsHoliday(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/20 border-slate-300 cursor-pointer"
              />
              <span>วันอาทิตย์เป็นวันหยุด (Sunday Holiday)</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={13} className={isGenerating ? 'animate-spin' : ''} />
            <span>Generate Schedule</span>
          </button>
        </div>

        <p className="no-print m-0 text-xs text-slate-400">
          ฟอร์มถูกจัดเก็บในเบราว์เซอร์เครื่องนี้ (Zero-DB JSON) — กด Export JSON เพื่อสำรองข้อมูลเป็นหลักฐานก่อนพิมพ์ทุกครั้ง
        </p>

        {/* ─── Printable / Editable Sheet ────────────────────────────────────────── */}
        {form ? (
          <div className={`bg-white dark:bg-slate-900/60 rounded-2xl shadow-xs border border-slate-200/50 dark:border-slate-800/50 p-6 overflow-x-auto ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}>
            <CctvAuditTable
              form={form}
              onCycleStatus={onCycleStatus}
              onSetCell={onSetCell}
              onToggleHoliday={onToggleHoliday}
              onSetMeta={onSetMeta}
            />
          </div>
        ) : (
          <div className="no-print bg-white dark:bg-slate-900/60 rounded-2xl shadow-xs border border-slate-200/50 dark:border-slate-800/50 p-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-1">
              <Video size={24} />
            </div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              ยังไม่มีฟอร์มตรวจสอบสำหรับรอบนี้
            </div>
            <p className="text-xs text-slate-400 max-w-md m-0">
              เลือกเดือนและปีที่ต้องการด้านบน แล้วกดปุ่ม <strong>Generate Schedule</strong> เพื่อสร้างตารางตรวจสอบ หรือกด <strong>Import Form JSON</strong> เพื่อเปิดไฟล์เดิม
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles size={13} />
              <span>สร้างฟอร์มเดือนปัจจุบัน</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
