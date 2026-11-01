import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchTopItemsGallery, fetchAvailableSalespersons, type TopGalleryItem, type TopGalleryResponse } from '../services/itemYearlySummaryAPI';
import { ALL_GROUPS, ACTIVE_GROUP_IDS, type CustomerGroup } from '../config/customerGroups';
import { usePeriodSetup } from './usePeriodSetup';

// --- Shared Constants & Types ---
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export type PeriodPreset = "full-year" | "ytd" | "this-month" | "last-month" | "custom";

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = [String(CURRENT_YEAR), String(CURRENT_YEAR - 1), String(CURRENT_YEAR - 2), String(CURRENT_YEAR - 3)];

export const PERIOD_PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "full-year", label: "Full Year" },
  { id: "ytd", label: "YTD" },
  { id: "this-month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
];

export interface ProductTypeOption {
  value: string;
  label: string;
  description: string;
}

export const PRODUCT_TYPE_OPTIONS: ProductTypeOption[] = [
  { value: 'ALL', label: 'All', description: 'All products' },
  { value: 'BBS', label: 'BBS', description: 'Bracelet & Bangle' },
  { value: 'BES', label: 'BES', description: 'Earring' },
  { value: 'BNS', label: 'BNS', description: 'Necklace' },
  { value: 'BRS', label: 'BRS', description: 'Ring' },
  { value: 'OTH', label: 'Others', description: 'Other jewelry' },
];

export const ALL_PRODUCT_TYPES: string[] = ['BBS', 'BES', 'BNS', 'BRS', 'OTH'];

export type PerspectiveMode = 'combined' | 'compare';



// --- Helper Functions ---
export const getDefaultCompareYear = (baseYear: string, years: string[]) => {
  const sortedYears = [...years].map(String).sort((a, b) => Number(a) - Number(b));
  return [...sortedYears].reverse().find(year => Number(year) < Number(baseYear)) || (sortedYears[0] !== baseYear ? sortedYears[0] : '');
};

export const normalizeStyleNo = (value: unknown) => String(value || "").trim().toUpperCase();
export const normalizeCustomerCode = (value: unknown) => String(value || "").trim().toUpperCase();
export const customerItemKey = (customerCode: unknown, styleNo: unknown) => `${normalizeCustomerCode(customerCode)}|${normalizeStyleNo(styleNo)}`;

export const getGroupLabel = (groupId: string) => ALL_GROUPS.find((group: CustomerGroup) => group.id === groupId)?.label || groupId;

export const currentMonthNumber = () => new Date().getMonth() + 1;
export const clampMonth = (month: number) => Math.min(12, Math.max(1, Number(month) || 1));
export const monthRange = (startMonth: number, endMonth: number) => {
  const start = clampMonth(Math.min(startMonth, endMonth));
  const end = clampMonth(Math.max(startMonth, endMonth));
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};
export const monthRangeLabel = (startMonth: number, endMonth: number) => {
  const start = clampMonth(Math.min(startMonth, endMonth));
  const end = clampMonth(Math.max(startMonth, endMonth));
  return start === 1 && end === 12 ? "Full Year" : `${MONTHS[start - 1]}-${MONTHS[end - 1]}`;
};
export const presetRange = (preset: PeriodPreset) => {
  const current = currentMonthNumber();
  if (preset === "ytd") return { startMonth: 1, endMonth: current };
  if (preset === "this-month") return { startMonth: current, endMonth: current };
  if (preset === "last-month") {
    const last = current === 1 ? 12 : current - 1;
    return { startMonth: last, endMonth: last };
  }
  return { startMonth: 1, endMonth: 12 };
};

// --- Custom Hook ---
export function useTopOrdersGalleryData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isAnalyticsPage = location.pathname.includes('/analytics');
  // Top Items Qty analytics view ranks by Quantity; gallery overview defaults to Amount
  const metric = isAnalyticsPage ? 'qty' : ((searchParams.get("metric") || 'amount') as 'qty' | 'amount');

  const [availableYears, setAvailableYears] = useState<string[]>(DEFAULT_YEARS);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const [rowLimit, setRowLimit] = useState<number | 'all'>(50);

  const [selGroups, setSelGroups] = useState<string[]>(() => {
    const urlGroups = searchParams.get("groups");
    if (!urlGroups || urlGroups.toLowerCase() === 'all') return ACTIVE_GROUP_IDS;
    if (urlGroups.toLowerCase() === 'none') return [];
    return urlGroups.split(",").map(s => s.trim()).filter(Boolean);
  });

  const [selTypes, setSelTypes] = useState<string[]>(() => {
    const urlType = searchParams.get("type");
    if (!urlType || urlType === 'ALL') return ALL_PRODUCT_TYPES;
    if (urlType === 'NONE') return [];
    const parsed = urlType.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    return parsed.length > 0 ? parsed : ALL_PRODUCT_TYPES;
  });

  const productType = selTypes.length === 0
    ? 'NONE'
    : (selTypes.length === ALL_PRODUCT_TYPES.length ? 'ALL' : selTypes.join(','));

  const setProductType = useCallback((typeVal: string) => {
    if (!typeVal || typeVal === 'ALL') {
      setSelTypes(ALL_PRODUCT_TYPES);
    } else if (typeVal === 'NONE') {
      setSelTypes([]);
    } else {
      setSelTypes(typeVal.split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
    }
  }, []);

  const toggleType = useCallback((typeKey: string) => {
    setSelTypes((prev) =>
      prev.includes(typeKey) ? prev.filter((t) => t !== typeKey) : [...prev, typeKey]
    );
  }, []);

  const [perspectiveMode, setPerspectiveMode] = useState<PerspectiveMode>('combined');

  const [salesName, setSalesName] = useState<string>(() => {
    return searchParams.get("salesName") || 'ALL';
  });
  const [availableSalespersons, setAvailableSalespersons] = useState<string[]>([]);

  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const periodSetup = usePeriodSetup({
    presets: ['full-year', 'ytd', 'month', 'week', 'day', 'custom'],
    compareSlots: 2,
    syncToUrl: true,
    availableYears: availableYears,
    allowDateFieldToggle: true,
    allowWeekRange: true,
    initialValues: {
      dateField: 'dueDate',
    },
  });

  const [galleryResponse, setGalleryResponse] = useState<TopGalleryResponse | null>(null);
  const [portfolioAllResponse, setPortfolioAllResponse] = useState<TopGalleryResponse | null>(null);
  const [previewItem, setPreviewItem] = useState<TopGalleryItem | null>(null);

  const filterTransitionTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const hasLoadedInitialRef = useRef(false);

  const selectedMonthNumbers = useMemo(() => {
    return monthRange(periodSetup.committed.monthFrom, periodSetup.committed.monthTo);
  }, [periodSetup.committed.monthFrom, periodSetup.committed.monthTo]);

  const selectedPeriodLabel = monthRangeLabel(periodSetup.committed.monthFrom, periodSetup.committed.monthTo);
  const selectedGroupsKey = selGroups.join(",");

  const analyticsPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set("metric", "qty");
    if (periodSetup.committed.baseYear) params.set("year", periodSetup.committed.baseYear);
    if (periodSetup.committed.compareActive1 && periodSetup.committed.compareYear1) params.set("compareYear", periodSetup.committed.compareYear1);
    if (selectedMonthNumbers.length) params.set("months", selectedMonthNumbers.join(","));
    if (periodSetup.committed.dateFrom) params.set("dateFrom", periodSetup.committed.dateFrom);
    if (periodSetup.committed.dateTo) params.set("dateTo", periodSetup.committed.dateTo);
    if (periodSetup.committed.weekFrom) params.set("wStart", String(periodSetup.committed.weekFrom));
    if (periodSetup.committed.weekTo) params.set("wEnd", String(periodSetup.committed.weekTo));
    if (periodSetup.committed.dateField !== 'dueDate') params.set("dateField", periodSetup.committed.dateField);
    if (salesName && salesName !== 'ALL') params.set("salesName", salesName);
    if (selectedGroupsKey && selGroups.length < ALL_GROUPS.length) params.set("groups", selectedGroupsKey);
    if (selTypes.length > 0 && selTypes.length < ALL_PRODUCT_TYPES.length) {
      params.set("type", selTypes.join(','));
    } else if (selTypes.length === 0) {
      params.set("type", "NONE");
    }
    return `/dashboard/top-orders/analytics?${params.toString()}`;
  }, [periodSetup.committed, metric, selTypes, selectedGroupsKey, selectedMonthNumbers, salesName]);

  const startFilterTransition = (duration = 600) => {
    setFilterLoading(true);
    if (filterTransitionTimer.current) window.clearTimeout(filterTransitionTimer.current);
    filterTransitionTimer.current = window.setTimeout(() => setFilterLoading(false), duration);
  };

  useEffect(() => {
    return () => {
      if (filterTransitionTimer.current) window.clearTimeout(filterTransitionTimer.current);
    };
  }, []);

  // 1. Initial years load
  useEffect(() => {
    let cancelled = false;
    fetchAvailableYears()
      .then((years: number[]) => {
        if (cancelled) return;
        const stringYears = (years || []).map(String).sort((a: string, b: string) => b.localeCompare(a));
        if (stringYears.length > 0) {
          setAvailableYears(stringYears);
          if (!periodSetup.committed.baseYear) {
            periodSetup.actions.setDraftField({
              baseYear: stringYears[0],
              compareYear1: stringYears[1] || ''
            });
            periodSetup.actions.apply();
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching available years:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 1.5 Fetch available salespersons
  useEffect(() => {
    let cancelled = false;
    fetchAvailableSalespersons()
      .then((list) => {
        if (!cancelled && list?.length > 0) {
          setAvailableSalespersons(list);
        }
      })
      .catch((err) => {
        console.error("Error fetching available salespersons:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Fetch Top Gallery items from API
  useEffect(() => {
    if (!periodSetup.committed.baseYear || availableYears.length === 0) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        if (hasLoadedInitialRef.current) {
          setFilterLoading(true);
        }
        setLoading(true);
      }
    });

    const baseYr = periodSetup.committed.baseYear;
    const compYr1 = periodSetup.committed.compareActive1 ? periodSetup.committed.compareYear1 : undefined;
    const compYr2 = periodSetup.committed.compareActive2 && periodSetup.committed.compareYear2 !== 'none' ? periodSetup.committed.compareYear2 : undefined;

    // Fetch all selected active year(s) to guarantee ranks match the user's active filter scope
    const yearsToFetch = Array.from(new Set([baseYr, compYr1, compYr2].filter(Boolean) as string[]));

    const isMonthMode = periodSetup.committed.preset === 'month' || periodSetup.committed.preset === 'custom' || periodSetup.committed.preset === 'this-month' || periodSetup.committed.preset === 'last-month' || periodSetup.committed.preset === 'ytd';
    const isWeekMode = periodSetup.committed.preset === 'week';
    const isDayMode = periodSetup.committed.preset === 'day';

    const monthsToFetch = isMonthMode && selectedMonthNumbers.length > 0 && selectedMonthNumbers.length < 12
      ? selectedMonthNumbers.map(String)
      : undefined;

    const commonParams = {
      years: yearsToFetch,
      months: monthsToFetch,
      baseYear: baseYr,
      compareYear: compYr1,
      groups: selGroups.length === ALL_GROUPS.length ? ['all'] : selGroups,
      salesName: salesName !== 'ALL' ? salesName : undefined,
      metric,
      search: searchQuery,
      limit: rowLimit === 'all' ? 1000 : rowLimit,
      rankBy: (perspectiveMode === 'compare' || !compYr1 ? 'base' : 'combined') as 'base' | 'combined',
      dateField: periodSetup.committed.dateField,
      startDate: isDayMode ? periodSetup.committed.dateFrom : undefined,
      endDate: isDayMode ? periodSetup.committed.dateTo : undefined,
      wStart: isWeekMode ? periodSetup.committed.weekFrom : undefined,
      wEnd: isWeekMode ? periodSetup.committed.weekTo : undefined,
    };

    const mainFetch = fetchTopItemsGallery({
      ...commonParams,
      productType,
    });

    const portfolioFetch = productType !== 'ALL'
      ? fetchTopItemsGallery({
        ...commonParams,
        productType: 'ALL',
      })
      : null;

    Promise.all([mainFetch, portfolioFetch])
      .then(([mainData, portfolioData]) => {
        if (cancelled) return;
        setGalleryResponse(mainData);
        if (portfolioData) {
          setPortfolioAllResponse(portfolioData);
        } else {
          setPortfolioAllResponse(mainData);
        }
        hasLoadedInitialRef.current = true;
      })
      .catch((err) => {
        console.error("Error fetching top gallery items:", err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setFilterLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [availableYears, periodSetup.committed, metric, perspectiveMode, productType, salesName, searchQuery, selGroups, selectedMonthNumbers, refreshVersion, rowLimit]);

  const items = galleryResponse?.items || [];
  const portfolioAllItems = portfolioAllResponse?.items || galleryResponse?.items || [];
  const summary = galleryResponse?.summary || {
    totalItemsCount: 0,
    portfolioTotalQty: 0,
    portfolioTotalAmnt: 0,
    baseYearTotalQty: 0,
    baseYearTotalAmnt: 0,
    compareYearTotalQty: 0,
    compareYearTotalAmnt: 0,
  };



  const toggleGroup = (gId: string) => {
    startFilterTransition();
    setSelGroups((prev) =>
      prev.includes(gId) ? prev.filter((x) => x !== gId) : [...prev, gId]
    );
  };

  const swapYears = () => {
    if (!periodSetup.committed.compareActive1 || !periodSetup.committed.compareYear1 || periodSetup.committed.compareYear1 === periodSetup.committed.baseYear) return;
    startFilterTransition();

    periodSetup.actions.setDraftField({
      baseYear: periodSetup.committed.compareYear1,
      compareYear1: periodSetup.committed.baseYear,
    });
    periodSetup.actions.apply();
  };

  const handleSetSalesName = useCallback((newSalesName: string) => {
    startFilterTransition(400);
    setSalesName(newSalesName);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newSalesName && newSalesName !== 'ALL') {
        next.set('salesName', newSalesName);
      } else {
        next.delete('salesName');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    const defaultBase = availableYears[0] || String(CURRENT_YEAR);
    const defaultComp = getDefaultCompareYear(defaultBase, availableYears) || String(CURRENT_YEAR - 1);

    startFilterTransition(400);
    setPerspectiveMode('combined');
    setSalesName('ALL');
    setProductType('ALL');
    setSearchDraft('');
    setSearchQuery('');

    periodSetup.actions.reset();
    periodSetup.actions.applyChanges({
      preset: 'full-year',
      monthFrom: 1,
      monthTo: 12,
      baseYear: defaultBase,
      compareActive1: false,
      compareActive2: false,
      compareYear1: defaultComp,
      compareYear2: 'none',
      dateField: 'dueDate',
    });

    setSelGroups(ACTIVE_GROUP_IDS);
    setRefreshVersion((v) => v + 1);

    if (searchParams.toString()) {
      const nextParams = new URLSearchParams();
      const currentMetric = searchParams.get('metric');
      if (currentMetric && currentMetric !== 'amount') {
        nextParams.set('metric', currentMetric);
      }
      setSearchParams(nextParams, { replace: true });
    }
  }, [availableYears, periodSetup, searchParams, setSearchParams]);

  const isFiltered = useMemo(() => {
    const defaultBase = String(CURRENT_YEAR);
    const isPerspectiveFiltered = perspectiveMode !== 'combined';
    const isCompareFiltered = periodSetup.committed.compareActive1 || periodSetup.committed.compareActive2;
    const isProductTypeFiltered = productType !== 'ALL';
    const isSalesFiltered = salesName !== 'ALL' && salesName !== '';
    const isSearchFiltered = searchQuery.trim() !== '' || searchDraft.trim() !== '';
    const isPeriodFiltered = (periodSetup.committed.preset !== 'full-year' || periodSetup.committed.monthFrom !== 1 || periodSetup.committed.monthTo !== 12 || (periodSetup.committed.baseYear !== '' && periodSetup.committed.baseYear !== defaultBase) || periodSetup.committed.dateField !== 'dueDate');
    const isGroupsFiltered = selGroups.length !== ACTIVE_GROUP_IDS.length || !ACTIVE_GROUP_IDS.every(id => selGroups.includes(id));
    return isPerspectiveFiltered || isCompareFiltered || isProductTypeFiltered || isSalesFiltered || isSearchFiltered || isPeriodFiltered || isGroupsFiltered;
  }, [periodSetup, perspectiveMode, productType, salesName, searchDraft, searchQuery, selGroups]);

  const refreshData = useCallback(() => {
    startFilterTransition(400);
    setRefreshVersion((v) => v + 1);
  }, []);

  return {
    metric,
    isInitialLoading: loading && !galleryResponse,
    isFilterLoading: filterLoading || (loading && !!galleryResponse),
    availableYears,
    periodSetup,
    baseYear: periodSetup.committed.baseYear,
    compareYear: periodSetup.committed.compareYear1,
    compareEnabled: periodSetup.committed.compareActive1,
    selGroups,
    setSelGroups,
    toggleGroup,
    salesName,
    setSalesName: handleSetSalesName,
    availableSalespersons,
    productType,
    setProductType,
    selTypes,
    setSelTypes,
    toggleType,
    searchDraft,
    setSearchDraft,
    searchQuery,
    setSearchQuery,
    periodPreset: periodSetup.committed.preset,
    periodDraft: periodSetup.draft,
    setPeriodDraft: periodSetup.actions.setDraftField,
    applyPeriodDraft: periodSetup.actions.apply,
    items,
    portfolioAllItems,
    summary,
    previewItem,
    setPreviewItem,
    analyticsPath,
    selectedMonthNumbers,
    selectedPeriodLabel,
    startFilterTransition,
    perspectiveMode,
    setPerspectiveMode,
    swapYears,
    resetFilters,
    isFiltered,
    rowLimit,
    setRowLimit,
    refreshData,
  };
}

