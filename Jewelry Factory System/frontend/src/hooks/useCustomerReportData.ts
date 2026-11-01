import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { fetchAvailableYearsMeta } from '../services/dashboardAPI';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import { useTheme } from '../contexts/useTheme';
import { useCustomerPageFilters } from './useCustomerPageFilters';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const YEAR_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];

export interface CustomerSummaryRecord {
  id: string;
  name?: string;
  topItem?: string;
  topItemQty?: number | string;
  monthly?: Record<string, Record<string, number | string>>;
  monthlyQty?: Record<string, Record<string, number | string>>;
  weekly?: Record<string, Record<string, number | string>>;
  weeklyQty?: Record<string, Record<string, number | string>>;
  daily?: Record<string, Record<string, number | string>>;
  dailyQty?: Record<string, Record<string, number | string>>;
}

export interface CustomerReportMatrixRow extends Record<string, unknown> {
  id: string;
  label: string;
  topItem?: string;
  topItemQty?: number;
}

import type { CustomerDashboardOutletContext } from '../pages/CustomerDashboardLayout';

export function useCustomerReportData() {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { availableYears, refreshCounter, triggerRefresh, isRefreshing, setIsChildLoading, setIsRefreshing } = useOutletContext<CustomerDashboardOutletContext>();

  const { periodSetup, selGroups, setSelGroups, toggleGroup, dynamicActiveGroups, isFiltered, resetFilters } = useCustomerPageFilters(
    availableYears, 
    { 
      presets: ['ytd', 'custom', 'month', 'week', 'day'],
      allowWeekRange: true 
    },
    [] 
  );

  const selectedYears = periodSetup.committed.selectedYears;
  const selectedMonths = periodSetup.committed.selectedMonths;
  const kpiCompareYear = periodSetup.committed.kpiCompareYear;
  const metric = searchParams.get('metric') || 'amount';

  const handleSetMetric = useCallback((nextMetric: 'amount' | 'qty') => {
    const newParams = new URLSearchParams(searchParams);
    if (nextMetric === 'qty') {
      newParams.set('metric', 'qty');
    } else {
      newParams.delete('metric');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const fmt = useCallback((val: number) => {
    if (metric === 'qty') return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [metric]);
  const fmtCurr = fmt;

  const activeYears: string[] = selectedYears;
  const baseYear = selectedYears[0] || '';
  const selMonths = useMemo(() => {
    return selectedMonths.map((mIdx: string) => MONTHS[Number(mIdx) - 1]);
  }, [selectedMonths]);

  const [custData, setCustData] = useState<CustomerSummaryRecord[]>([]);
  const [firstDataYear, setFirstDataYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const periodSetupPreset = periodSetup.committed.preset;
  const viewMode: 'ytd' | 'monthly' | 'weekly' | 'daily' = periodSetupPreset === 'day' ? 'daily' : periodSetupPreset === 'week' ? 'weekly' : (periodSetupPreset === 'custom' || periodSetupPreset === 'month' ? 'monthly' : 'ytd');
  const setViewMode = () => {}; // mock to satisfy props for now

  const [userAggregationMode, setUserAggregationMode] = useState<'group' | 'customer' | null>(null);
  const [prevSelGroupsLen, setPrevSelGroupsLen] = useState(selGroups.length);
  if (prevSelGroupsLen !== selGroups.length) {
    setPrevSelGroupsLen(selGroups.length);
    setUserAggregationMode(null);
  }
  const aggregationMode = userAggregationMode ?? (selGroups.length === 1 ? 'customer' : 'group');
  const setAggregationMode = (mode: 'group' | 'customer') => setUserAggregationMode(mode);

  const searchQuery = searchParams.get('search') || '';
  const setSearchQuery = () => { }; // Mock to satisfy table props
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const resetMatrixView = useCallback(() => {
    setSortOrder('desc');
  }, []);

  const currentDate = useMemo(() => new Date(), []);
  const currentYearStr = String(currentDate.getFullYear());
  const currentMonthIdx = currentDate.getMonth();
  const displayMonths = useMemo(() => MONTHS.filter(m => selMonths.includes(m)), [selMonths]);

  const displayDays = useMemo(() => {
    if (viewMode !== 'daily' || !periodSetup.committed.dateFrom || !periodSetup.committed.dateTo) return [];
    const start = new Date(periodSetup.committed.dateFrom);
    const end = new Date(periodSetup.committed.dateTo);
    const days: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      days.push(`${mm}-${dd}`);
    }
    return days;
  }, [viewMode, periodSetup.committed.dateFrom, periodSetup.committed.dateTo]);

  const displayWeeks = useMemo(() => {
    if (viewMode !== 'weekly' || !periodSetup.committed.selectedWeeks) return [];
    return periodSetup.committed.selectedWeeks.map((w: string) => Number(w)).sort((a: number, b: number) => a - b);
  }, [viewMode, periodSetup.committed.selectedWeeks]);

  const dataYears = useMemo(() => {
    if (firstDataYear === null) return [];
    const startYear = Number(firstDataYear);
    const maxYear = Math.max(...activeYears.map(Number).filter(Boolean));
    if (!Number.isFinite(startYear) || !Number.isFinite(maxYear) || maxYear < startYear) return [];
    return Array.from({ length: maxYear - startYear + 1 }, (_, index) => String(startYear + index));
  }, [activeYears, firstDataYear]);

  const displayYears = activeYears;

  useEffect(() => {
    fetchAvailableYearsMeta()
      .then(({ firstDataYear }) => {
        setFirstDataYear(firstDataYear);
      })
      .catch((err: unknown) => console.error('Error fetching available years:', err));
  }, []);

  useEffect(() => {
    if (dataYears.length === 0) return;
    let cancelled = false;
    const loadTimer = window.setTimeout(() => {
      setLoading(true);
      fetchCustomerSummary({
        years: dataYears,
        months: selMonths.length > 0 ? selMonths.map(String) : undefined,
        startDate: viewMode === 'daily' ? periodSetup.committed.dateFrom : undefined,
        endDate: viewMode === 'daily' ? periodSetup.committed.dateTo : undefined,
        wStart: viewMode === 'weekly' ? periodSetup.committed.weekFrom : undefined,
        wEnd: viewMode === 'weekly' ? periodSetup.committed.weekTo : undefined,
        dateField: periodSetup.committed.dateField
      })
        .then((cData) => { if (!cancelled) setCustData(cData); })
        .catch((err: unknown) => console.error('Error fetching customer summary data:', err))
        .finally(() => { 
          if (!cancelled) {
            setLoading(false);
            if (setIsChildLoading) setIsChildLoading(false);
            if (setIsRefreshing) setIsRefreshing(false);
          }
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, [dataYears, selMonths, refreshCounter, viewMode, periodSetup.committed]);

  const growthComparisons = useMemo<{ a: string; b: string }[]>(() => {
    if (activeYears.length < 2) return [];
    const sortedDesc = [...activeYears].map(String).sort((y1, y2) => Number(y2) - Number(y1));
    const newestYear = sortedDesc[0];
    const pairs: { a: string; b: string }[] = [];
    for (let i = 1; i < sortedDesc.length; i++) {
      if (sortedDesc[i] && sortedDesc[i] !== newestYear) {
        pairs.push({ a: newestYear, b: sortedDesc[i] });
      }
    }
    return pairs;
  }, [activeYears]);

  const tableData = useMemo(() => {
    if (!baseYear || activeYears.length === 0) return { rows: [], colTotals: {} as Record<string, number>, activeYears: [] as string[] };

    let rows: CustomerReportMatrixRow[] = [];

    const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
    const Q_MAP: Record<string, string[]> = {
      Q1: ['Jan', 'Feb', 'Mar'],
      Q2: ['Apr', 'May', 'Jun'],
      Q3: ['Jul', 'Aug', 'Sep'],
      Q4: ['Oct', 'Nov', 'Dec']
    };

    if (aggregationMode === 'group') {
      const groupRows: Record<string, CustomerReportMatrixRow> = {};
      selGroups.forEach((gId: string) => {
        const group = ALL_GROUPS.find((g) => g.id === gId);
        if (!group) return;
        groupRows[gId] = { id: gId, label: group.label, topItem: '', topItemQty: 0 };
        activeYears.forEach((yr: string) => {
          groupRows[gId][`isTrulyNew_${yr}`] = false;
          displayMonths.forEach((m: string) => { groupRows[gId][`${yr}_${m}`] = 0; });
          QUARTERS.forEach(q => { groupRows[gId][`${yr}_${q}`] = 0; });
          for (let w = 1; w <= 53; w++) { groupRows[gId][`${yr}_W${w}`] = 0; }
          displayDays.forEach((dStr: string) => { groupRows[gId][`${yr}_D_${dStr}`] = 0; });
          groupRows[gId][`${yr}_total`] = 0;
        });
      });

      custData.forEach(cust => {
        const gId = getCustomerGroupId(cust.id || '');
        if (!selGroups.includes(gId)) return;

        const row = groupRows[gId];
        if (!row) return;
        const source = metric === 'qty' ? cust.monthlyQty : cust.monthly;

        activeYears.forEach((yr: string) => {
          displayMonths.forEach((m: string) => {
            const idx = MONTHS.indexOf(m);
            const val = source?.[yr]?.[String(idx + 1)] || 0;
            row[`${yr}_${m}`] = Number(row[`${yr}_${m}`]) + Number(val);
            row[`${yr}_total`] = Number(row[`${yr}_total`]) + Number(val);
          });
          QUARTERS.forEach(q => {
            row[`${yr}_${q}`] = Q_MAP[q].reduce((s, m) => s + Number(row[`${yr}_${m}`] || 0), 0);
          });
          const weekSource = metric === 'qty' ? cust.weeklyQty : cust.weekly;
          for (let w = 1; w <= 53; w++) {
            const wVal = weekSource?.[yr]?.[String(w)] || 0;
            row[`${yr}_W${w}`] = Number(row[`${yr}_W${w}`]) + Number(wVal);
          }
          const daySource = metric === 'qty' ? cust.dailyQty : cust.daily;
          for (let d = 1; d <= 31; d++) {
            const dVal = daySource?.[yr]?.[String(d)] || 0;
            row[`${yr}_D${d}`] = Number(row[`${yr}_D${d}`]) + Number(dVal);
          }
        });
      });

      rows = Object.values(groupRows).filter((r) => activeYears.some((yr: string) => Number(r[`${yr}_total`]) > 0));
    } else {
      const custRows: Record<string, CustomerReportMatrixRow> = {};

      custData.forEach(cust => {
        const gId = getCustomerGroupId(cust.id || '');
        if (!selGroups.includes(gId)) return;
        const cId = cust.id || '';

        if (!custRows[cId]) {
          custRows[cId] = { id: cId, label: cId, topItem: '', topItemQty: 0 };
          activeYears.forEach((yr: string) => {
            custRows[cId][`isTrulyNew_${yr}`] = false;
            displayMonths.forEach((m: string) => { custRows[cId][`${yr}_${m}`] = 0; });
            QUARTERS.forEach(q => { custRows[cId][`${yr}_${q}`] = 0; });
            for (let w = 1; w <= 53; w++) { custRows[cId][`${yr}_W${w}`] = 0; }
            displayDays.forEach((dStr: string) => { custRows[cId][`${yr}_D_${dStr}`] = 0; });
            custRows[cId][`${yr}_total`] = 0;
          });
        }

        const row = custRows[cId];
        const source = metric === 'qty' ? cust.monthlyQty : cust.monthly;

        activeYears.forEach((yr: string) => {
          displayMonths.forEach((m: string) => {
            const idx = MONTHS.indexOf(m);
            const val = source?.[yr]?.[String(idx + 1)] || 0;
            row[`${yr}_${m}`] = Number(row[`${yr}_${m}`]) + Number(val);
            row[`${yr}_total`] = Number(row[`${yr}_total`]) + Number(val);
          });
          QUARTERS.forEach(q => {
            row[`${yr}_${q}`] = Q_MAP[q].reduce((s, m) => s + Number(row[`${yr}_${m}`] || 0), 0);
          });
          const weekSource = metric === 'qty' ? cust.weeklyQty : cust.weekly;
          for (let w = 1; w <= 53; w++) {
            const wVal = weekSource?.[yr]?.[String(w)] || 0;
            row[`${yr}_W${w}`] = Number(row[`${yr}_W${w}`]) + Number(wVal);
          }
          const daySource = metric === 'qty' ? cust.dailyQty : cust.daily;
          for (let d = 1; d <= 31; d++) {
            const dVal = daySource?.[yr]?.[String(d)] || 0;
            row[`${yr}_D${d}`] = Number(row[`${yr}_D${d}`]) + Number(dVal);
          }
        });
      });

      rows = Object.values(custRows).filter((r) => activeYears.some((yr: string) => Number(r[`${yr}_total`]) > 0));
    }

    rows.sort((a, b) => {
      const valA = Number(a[`${activeYears[0]}_total`] || 0);
      const valB = Number(b[`${activeYears[0]}_total`] || 0);
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    const colTotals: Record<string, number> = {};
    activeYears.forEach((yr: string) => {
      colTotals[`${yr}_total`] = 0;
      displayMonths.forEach((m: string) => { colTotals[`${yr}_${m}`] = 0; });
      QUARTERS.forEach(q => { colTotals[`${yr}_${q}`] = 0; });
      for (let w = 1; w <= 53; w++) { colTotals[`${yr}_W${w}`] = 0; }
      displayDays.forEach((dStr: string) => { colTotals[`${yr}_D_${dStr}`] = 0; });
    });
    rows.forEach(r => {
      activeYears.forEach((yr: string) => {
        colTotals[`${yr}_total`] += Number(r[`${yr}_total`] || 0);
        displayMonths.forEach((m: string) => { colTotals[`${yr}_${m}`] += Number(r[`${yr}_${m}`] || 0); });
        QUARTERS.forEach(q => { colTotals[`${yr}_${q}`] += Number(r[`${yr}_${q}`] || 0); });
        for (let w = 1; w <= 53; w++) { colTotals[`${yr}_W${w}`] += Number(r[`${yr}_W${w}`] || 0); }
        displayDays.forEach((dStr: string) => { colTotals[`${yr}_D_${dStr}`] += Number(r[`${yr}_D_${dStr}`] || 0); });
      });
    });

    return { rows, colTotals, activeYears };
  }, [custData, baseYear, activeYears, displayMonths, displayDays, metric, sortOrder, aggregationMode, selGroups]);

  const groupKpis = useMemo(() => {
    if (tableData.rows.length <= 1 && activeYears.length <= 1) return [];

    const groupTotals: Record<string, Record<string, number>> = {};
    selGroups.forEach((gId: string) => {
      groupTotals[gId] = {};
      activeYears.forEach((yr: string) => { groupTotals[gId][yr] = 0; });
    });

    tableData.rows.forEach(row => {
      const gId = getCustomerGroupId(row.id);
      if (!groupTotals[gId]) return;
      activeYears.forEach((yr: string) => {
        groupTotals[gId][yr] += Number(row[`${yr}_total`] || 0);
      });
    });

    return ALL_GROUPS
      .filter((g) => selGroups.includes(g.id) && groupTotals[g.id])
      .map((g) => ({ ...g, totals: groupTotals[g.id] }));
  }, [tableData, selGroups, activeYears]);

  return {
    theme,
    metric,
    handleSetMetric,
    fmt,
    fmtCurr,
    baseYear,
    activeYears,
    displayYears,
    displayMonths,
    displayWeeks,
    displayDays,
    selMonths,
    selGroups,
    kpiCompareYear,
    loading,
    viewMode,
    setViewMode,
    aggregationMode,
    setAggregationMode,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    growthComparisons,
    resetMatrixView,
    currentYearStr,
    currentMonthIdx,
    tableData,
    groupKpis,
    triggerRefresh,
    isRefreshing,
    periodSetup,
    setSelGroups,
    toggleGroup,
    dynamicActiveGroups,
    isFiltered,
    resetFilters,
    availableYears
  };
}
