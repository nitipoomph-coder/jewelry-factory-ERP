import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDefaultCompareYear, monthRange, parseMonths } from '../utils/periodUtils';

export type PeriodPreset = 'full-year' | 'ytd' | 'this-month' | 'last-month' | 'month' | 'week' | 'day' | 'custom';

export interface PeriodSetupConfig {
  presets: PeriodPreset[];
  allowWeekRange?: boolean;
  allowDateFieldToggle?: boolean;
  compareSlots: 1 | 2;
  syncToUrl?: boolean;
  availableYears: string[]; // Needs to be passed in to compute default compare years
  initialValues?: {
    preset?: PeriodPreset;
    monthFrom?: number;
    monthTo?: number;
    weekFrom?: number;
    weekTo?: number;
  dateFrom?: string;
  dateTo?: string;
    baseYear?: string;
    compareActive1?: boolean;
    compareYear1?: string;
    compareActive2?: boolean;
    compareYear2?: string;
    kpiCompareYear?: string;
    selectedMonths?: string[];
    dateField?: 'ordDate' | 'dueDate';
  };
  onReset?: () => void;
}

export interface PeriodState {
  preset: PeriodPreset;
  monthFrom: number;
  monthTo: number;
  weekFrom?: number;
  weekTo?: number;
  dateFrom?: string;
  dateTo?: string;
  baseYear: string;
  compareActive1: boolean;
  compareYear1: string;
  compareActive2: boolean;
  compareYear2: string;
  kpiCompareYear: string;
  selectedYears: string[];
  selectedMonths: string[];
  selectedWeeks?: string[];
  dateField: 'ordDate' | 'dueDate';
}

/**
 * usePeriodSetup - A central hook to manage period filtering states.
 * 
 * Decision on compareSlots = 1:
 * We define compareActive2 and compareYear2 as ALWAYS present in the PeriodState type (not optional).
 * If compareSlots === 1, these fields will simply stay false/empty and UI won't render the second compare slot.
 * Reason: This avoids messy undefined checks (?.compareActive2) throughout the codebase. The consumer can just ignore it safely.
 */
export function usePeriodSetup(config: PeriodSetupConfig) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialization: read from URL if syncToUrl is true (and not ignored), otherwise use initialValues
  const initializeState = useCallback((ignoreUrl = false): PeriodState => {
    const currentMonth = new Date().getMonth() + 1;
    let preset: PeriodPreset = config.initialValues?.preset || 'full-year';
    let monthFrom = config.initialValues?.monthFrom || (preset === 'full-year' ? 1 : currentMonth);
    let monthTo = config.initialValues?.monthTo || (preset === 'full-year' ? 12 : currentMonth);
    let weekFrom = config.initialValues?.weekFrom || 1;
    let weekTo = config.initialValues?.weekTo || 12;
      let dateFrom = config.initialValues?.dateFrom;
      let dateTo = config.initialValues?.dateTo;
    let selectedMonths: string[] = config.initialValues?.selectedMonths || (preset === 'full-year' ? ['1','2','3','4','5','6','7','8','9','10','11','12'] : monthRange(monthFrom, monthTo).map(String));
    let baseYear = config.initialValues?.baseYear || (config.availableYears.length > 0 ? config.availableYears[0] : String(new Date().getFullYear()));
    let compareActive1 = config.initialValues?.compareActive1 || false;
    let compareYear1 = config.initialValues?.compareYear1 || getDefaultCompareYear(baseYear, config.availableYears);
    let compareActive2 = config.initialValues?.compareActive2 || false;
    let compareYear2 = config.initialValues?.compareYear2 || 'none';
    if (compareYear2 === 'none' && config.compareSlots === 2 && config.availableYears.length > 0) {
      const remainingYears = config.availableYears.filter(y => y !== compareYear1 && y !== baseYear);
      if (remainingYears.length > 0) {
        compareYear2 = getDefaultCompareYear(baseYear, remainingYears);
      }
    }
    let kpiCompareYear = config.initialValues?.kpiCompareYear || compareYear1;
    let dateField: 'ordDate' | 'dueDate' = config.initialValues?.dateField || 'ordDate';

    if (config.syncToUrl && !ignoreUrl) {
      const urlYears = searchParams.get('years')?.split(',').filter(Boolean) || [];
      const urlMonths = parseMonths(searchParams.get('months'));
      const urlKpi = searchParams.get('kpiCompare');
      const urlPreset = searchParams.get('preset') as PeriodPreset | null;
      const urlWStart = searchParams.get('wStart');
      const urlWEnd = searchParams.get('wEnd');
      const urlDateFrom = searchParams.get('dateFrom');
      const urlDateTo = searchParams.get('dateTo');
      const urlDateField = searchParams.get('dateField') as 'ordDate' | 'dueDate' | null;

      if (urlPreset) preset = urlPreset;
      if (urlWStart) weekFrom = Number(urlWStart);
      if (urlWEnd) weekTo = Number(urlWEnd);
      if (urlDateFrom) dateFrom = urlDateFrom;
      if (urlDateTo) dateTo = urlDateTo;
      if (urlDateField) dateField = urlDateField;

      if (urlMonths.length > 0) {
        selectedMonths = urlMonths.map(String);
        const numMonths = urlMonths.map(Number).sort((a, b) => a - b);
        monthFrom = numMonths[0];
        monthTo = numMonths[numMonths.length - 1];
        if (!urlPreset) preset = urlMonths.length === 12 ? 'full-year' : 'month';
      } else {
        if (preset === 'full-year') {
          selectedMonths = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
          monthFrom = 1;
          monthTo = 12;
        } else if (preset === 'ytd') {
          const currentM = new Date().getMonth() + 1;
          selectedMonths = Array.from({ length: currentM }, (_, i) => String(i + 1));
          monthFrom = 1;
          monthTo = currentM;
        } else {
          const currentM = new Date().getMonth() + 1;
          selectedMonths = [String(currentM)];
          monthFrom = currentM;
          monthTo = currentM;
          if (!urlPreset) preset = 'month';
        }
      }

      if (urlYears.length > 0) {
        baseYear = urlYears[0];
        if (urlYears.length > 1) {
          compareActive1 = true;
          compareYear1 = urlYears[1];
        }
        if (config.compareSlots === 2 && urlYears.length > 2) {
          compareActive2 = true;
          compareYear2 = urlYears[2];
        }
      }

      if (urlKpi) {
        kpiCompareYear = urlKpi;
      }
    }

    // Compute derived selections
    const selectedYears = [baseYear];
    if (compareActive1 && compareYear1 && compareYear1 !== 'none') selectedYears.push(compareYear1);
    if (config.compareSlots === 2 && compareActive2 && compareYear2 && compareYear2 !== 'none') selectedYears.push(compareYear2);
    
    const selectedWeeks = config.allowWeekRange ? Array.from({ length: weekTo - weekFrom + 1 }, (_, i) => String(weekFrom + i)) : undefined;

    return {
      preset, monthFrom, monthTo, weekFrom, weekTo, dateFrom, dateTo,
      baseYear, compareActive1, compareYear1, compareActive2, compareYear2, kpiCompareYear,
      selectedYears, selectedMonths, selectedWeeks, dateField
    };
  }, [config.initialValues, config.availableYears, config.syncToUrl, config.compareSlots, config.allowWeekRange, searchParams]);

  const [committed, setCommitted] = useState<PeriodState>(initializeState);
  const [draft, setDraft] = useState<PeriodState>(committed);

  // Sync state if availableYears changes or URL changes (if syncToUrl)
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once when availableYears first becomes available (from [] -> populated)
    // We don't want to overwrite user's manual selections if the parent re-renders and passes a new array reference
    if (config.availableYears.length === 0 || isInitialized.current) return;
    
    setCommitted(prev => {
      let changed = false;
      const next = { ...prev };
      
      // If baseYear is still the fallback (current year) and it's not in the real availableYears, update it
      if (config.availableYears.length > 0 && !config.availableYears.includes(next.baseYear)) {
        next.baseYear = next.selectedYears[0] || config.availableYears[0];
        changed = true;
      }
      
      // If compareYear1 is not valid according to real availableYears, recalculate it
      if (!next.compareYear1 || next.compareYear1 === 'none' || !config.availableYears.includes(next.compareYear1)) {
        next.compareYear1 = next.selectedYears[1] || getDefaultCompareYear(next.baseYear, config.availableYears);
        changed = true;
      }

      // If compareYear2 is not valid, reset it
      if (config.compareSlots === 2) {
        if (!next.compareYear2 || next.compareYear2 === 'none' || !config.availableYears.includes(next.compareYear2)) {
          const remainingYears = config.availableYears.filter(y => y !== next.compareYear1 && y !== next.baseYear);
          next.compareYear2 = next.selectedYears[2] || (remainingYears.length > 0 ? getDefaultCompareYear(next.baseYear, remainingYears) : 'none');
          changed = true;
        }
      }
      
      // Update derived arrays if changed
      if (changed) {
        const newSelected = [next.baseYear];
        if (next.compareActive1 && next.compareYear1 && next.compareYear1 !== 'none') newSelected.push(next.compareYear1);
        if (config.compareSlots === 2 && next.compareActive2 && next.compareYear2 && next.compareYear2 !== 'none') newSelected.push(next.compareYear2);
        next.selectedYears = newSelected;
        
        // Also update draft so it doesn't get out of sync
        setDraft(prevDraft => ({ ...prevDraft, ...next }));
      }
      
      return changed ? next : prev;
    });

    isInitialized.current = true;
  }, [config.availableYears, config.compareSlots]);

  const setDraftField = useCallback((patch: Partial<PeriodState>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const applyPreset = useCallback((preset: PeriodPreset) => {
    const currentMonth = new Date().getMonth() + 1;
    let newStart = draft.monthFrom;
    let newEnd = draft.monthTo;
    
    if (preset === 'ytd') {
      newStart = 1;
      newEnd = currentMonth;
    } else if (preset === 'this-month') {
      newStart = currentMonth;
      newEnd = currentMonth;
    } else if (preset === 'last-month') {
      newStart = currentMonth === 1 ? 12 : currentMonth - 1;
      newEnd = newStart;
    } else if (preset === 'full-year') {
      newStart = 1;
      newEnd = 12;
    }
    
    setDraft(prev => ({
      ...prev,
      preset,
      monthFrom: newStart,
      monthTo: newEnd,
      selectedMonths: monthRange(newStart, newEnd).map(String)
    }));
  }, [draft.monthFrom, draft.monthTo]);

  const syncDraft = useCallback(() => {
    setDraft(committed);
  }, [committed]);

  const apply = useCallback(() => {
    // Recompute derived arrays based on draft
    const selectedYears = [draft.baseYear];
    if (draft.compareActive1 && draft.compareYear1 && draft.compareYear1 !== 'none') selectedYears.push(draft.compareYear1);
    if (config.compareSlots === 2 && draft.compareActive2 && draft.compareYear2 && draft.compareYear2 !== 'none') selectedYears.push(draft.compareYear2);
    
    // If not month mode, override selectedMonths with contiguous range, else use exactly what was drafted
    const finalSelectedMonths = (draft.preset === 'month') 
      ? (draft.selectedMonths?.length > 0 ? draft.selectedMonths : ['1']) 
      : monthRange(draft.monthFrom, draft.monthTo).map(String);

    const selectedWeeks = config.allowWeekRange && draft.weekFrom && draft.weekTo 
      ? Array.from({ length: draft.weekTo - draft.weekFrom + 1 }, (_, i) => String(draft.weekFrom! + i)) 
      : undefined;

    const newCommitted = {
      ...draft,
      selectedYears,
      selectedMonths: finalSelectedMonths,
      selectedWeeks,
      dateField: draft.dateField
    };
    
    setCommitted(newCommitted);

    if (config.syncToUrl) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('years', selectedYears.join(','));
        next.set('preset', newCommitted.preset);
        
        if (finalSelectedMonths.length === 12) {
          next.delete('months');
        } else {
          next.set('months', finalSelectedMonths.join(','));
        }

        if (newCommitted.preset === 'week' && newCommitted.weekFrom && newCommitted.weekTo) {
          next.set('wStart', String(newCommitted.weekFrom));
          next.set('wEnd', String(newCommitted.weekTo));
        } else {
          next.delete('wStart');
          next.delete('wEnd');
        }

        if (newCommitted.preset === 'day' && newCommitted.dateFrom && newCommitted.dateTo) {
          next.set('dateFrom', newCommitted.dateFrom);
          next.set('dateTo', newCommitted.dateTo);
        } else {
          next.delete('dateFrom');
          next.delete('dateTo');
        }

        if (draft.kpiCompareYear && draft.kpiCompareYear !== 'none') {
          next.set('kpiCompare', draft.kpiCompareYear);
        } else {
          next.delete('kpiCompare');
        }

        const defaultDateField = config.initialValues?.dateField || 'ordDate';
        if (draft.dateField !== defaultDateField) {
          next.set('dateField', draft.dateField);
        } else {
          next.delete('dateField');
        }

        return next;
      }, { replace: true });
    }
  }, [draft, config.compareSlots, config.allowWeekRange, config.syncToUrl, setSearchParams]);

  const reset = useCallback(() => {
    const newState = initializeState(true);
    setCommitted(newState);
    setDraft(newState);
    if (config.syncToUrl) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('years');
        next.delete('months');
        next.delete('preset');
        next.delete('wStart');
        next.delete('wEnd');
        next.delete('dateFrom');
        next.delete('dateTo');
        next.delete('kpiCompare');
        return next;
      }, { replace: true });
    }
    
    // Allow caller to wipe other states (like groups)
    if (config.onReset) {
      config.onReset();
    }
  }, [config.syncToUrl, setSearchParams, config.onReset, initializeState]);
    
  const applyChanges = useCallback((patch: Partial<PeriodState>) => {
    setDraft(prevDraft => {
      const updatedDraft = { ...prevDraft, ...patch };

      const selectedYears = [updatedDraft.baseYear];
      if (updatedDraft.compareActive1 && updatedDraft.compareYear1 && updatedDraft.compareYear1 !== 'none') selectedYears.push(updatedDraft.compareYear1);
      if (config.compareSlots === 2 && updatedDraft.compareActive2 && updatedDraft.compareYear2 && updatedDraft.compareYear2 !== 'none') selectedYears.push(updatedDraft.compareYear2);

      const finalSelectedMonths = (updatedDraft.preset === 'month') 
        ? (updatedDraft.selectedMonths?.length > 0 ? updatedDraft.selectedMonths : ['1']) 
        : monthRange(updatedDraft.monthFrom, updatedDraft.monthTo).map(String);

      const selectedWeeks = config.allowWeekRange && updatedDraft.weekFrom && updatedDraft.weekTo 
        ? Array.from({ length: updatedDraft.weekTo - updatedDraft.weekFrom + 1 }, (_, i) => String(updatedDraft.weekFrom! + i)) 
        : undefined;

      const newCommitted: PeriodState = {
        ...updatedDraft,
        selectedYears,
        selectedMonths: finalSelectedMonths,
        selectedWeeks,
        dateField: updatedDraft.dateField
      };

      setCommitted(newCommitted);

      if (config.syncToUrl) {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('years', selectedYears.join(','));
          next.set('preset', newCommitted.preset);

          if (finalSelectedMonths.length === 12) {
            next.delete('months');
          } else {
            next.set('months', finalSelectedMonths.join(','));
          }

          if (newCommitted.preset === 'week' && newCommitted.weekFrom && newCommitted.weekTo) {
            next.set('wStart', String(newCommitted.weekFrom));
            next.set('wEnd', String(newCommitted.weekTo));
          } else {
            next.delete('wStart');
            next.delete('wEnd');
          }

          if (newCommitted.preset === 'day' && newCommitted.dateFrom && newCommitted.dateTo) {
            next.set('dateFrom', newCommitted.dateFrom);
            next.set('dateTo', newCommitted.dateTo);
          } else {
            next.delete('dateFrom');
            next.delete('dateTo');
          }

          if (updatedDraft.kpiCompareYear && updatedDraft.kpiCompareYear !== 'none') {
            next.set('kpiCompare', updatedDraft.kpiCompareYear);
          } else {
            next.delete('kpiCompare');
          }

          const defaultDateField = config.initialValues?.dateField || 'ordDate';
          if (updatedDraft.dateField !== defaultDateField) {
            next.set('dateField', updatedDraft.dateField);
          } else {
            next.delete('dateField');
          }

          return next;
        }, { replace: true });
      }

      return updatedDraft;
    });
  }, [config.compareSlots, config.allowWeekRange, config.syncToUrl, setSearchParams]);

  return {
    committed,
    draft,
    actions: {
      setDraftField,
      applyPreset,
      syncDraft,
      apply,
      reset,
      applyChanges
    },
    config
  };
}

// ============================================================================
// TYPE SANITY CHECKS (Examples of usage as requested)
// ============================================================================

// 1. Dashboard / Trends usage
// const dashboardPeriod = usePeriodSetup({ 
//   presets: ['full-year','ytd','this-month','last-month'], 
//   compareSlots: 2, 
//   syncToUrl: true,
//   availableYears: ['2026', '2025', '2024'] 
// });

// 2. Matrix usage
// const matrixPeriod = usePeriodSetup({ 
//   presets: ['full-year','month','week'], 
//   allowWeekRange: true, 
//   compareSlots: 2, 
//   syncToUrl: false,
//   availableYears: ['2026', '2025', '2024']
// });



