// CCTV IT Audit Report — form state.
// Zero-DB: the form lives in React state, is persisted to localStorage and can be
// exported / imported as a JSON file. Holidays come from the existing read-only API.
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { CCTV_STORAGE_KEY } from '../config/cctvAuditConfig';
import { getHolidays } from '../services/productionSummaryAPI';
import type { CctvAuditForm } from '../types';
import {
  cycleStatus,
  exportCctvForm,
  generateCctvForm,
  parseCctvForm,
  setCell,
  setMeta,
  toggleHolidayRow,
} from '../utils/cctvAuditForm';
import { getErrorMessage } from '../utils/errors';

function loadStoredForm(): CctvAuditForm | null {
  try {
    const raw = localStorage.getItem(CCTV_STORAGE_KEY);
    return raw ? parseCctvForm(raw) : null;
  } catch {
    return null;
  }
}

export function useCctvAuditForm() {
  const { showToast } = useToast();
  const [form, setForm] = useState<CctvAuditForm | null>(loadStoredForm);
  const [isGenerating, setIsGenerating] = useState(false);

  // Keep the form after refresh
  useEffect(() => {
    try {
      if (form) localStorage.setItem(CCTV_STORAGE_KEY, JSON.stringify(form));
      else localStorage.removeItem(CCTV_STORAGE_KEY);
    } catch {
      // storage full / blocked — export JSON remains the source of truth
    }
  }, [form]);

  const generate = useCallback(
    async (year: number, month: number, sundayIsHoliday: boolean) => {
      setIsGenerating(true);
      try {
        const holidayDates = await getHolidays(year);
        setForm((current) => generateCctvForm({ year, month, holidayDates, sundayIsHoliday, base: current }));
        showToast('สร้างฟอร์มและแทรกวันหยุดเรียบร้อย', 'success');
      } catch (error) {
        showToast(getErrorMessage(error, 'ดึงข้อมูลวันหยุดไม่สำเร็จ'), 'error');
      } finally {
        setIsGenerating(false);
      }
    },
    [showToast],
  );

  const importFile = useCallback(
    async (file: File) => {
      try {
        setForm(parseCctvForm(await file.text()));
        showToast('นำเข้าฟอร์มเรียบร้อย', 'success');
      } catch (error) {
        showToast(getErrorMessage(error, 'นำเข้าไฟล์ไม่สำเร็จ'), 'error');
      }
    },
    [showToast],
  );

  const exportForm = useCallback(() => {
    if (form) exportCctvForm(form);
  }, [form]);

  const clearForm = useCallback(() => setForm(null), []);

  const onCycleStatus = useCallback(
    (rowId: string, colId: string) => setForm((f) => (f ? cycleStatus(f, rowId, colId) : f)),
    [],
  );
  const onSetCell = useCallback(
    (rowId: string, colId: string, value: string) => setForm((f) => (f ? setCell(f, rowId, colId, value) : f)),
    [],
  );
  const onToggleHoliday = useCallback(
    (rowId: string) => setForm((f) => (f ? toggleHolidayRow(f, rowId) : f)),
    [],
  );
  const onSetMeta = useCallback(
    <K extends keyof CctvAuditForm['meta']>(key: K, value: CctvAuditForm['meta'][K]) =>
      setForm((f) => (f ? setMeta(f, key, value) : f)),
    [],
  );

  return {
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
  };
}
