import { useState, useEffect, useRef } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';

import { RefreshCw, FilterX } from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
import { ProductionSummaryChart } from '../components/dashboard/productionSummary/ProductionSummaryChart';
import { ProductionSummaryTable } from '../components/dashboard/productionSummary/ProductionSummaryTable';
import { ProductionDashboardSkeleton } from '../components/dashboard/productionSummary/ProductionDashboardSkeleton';
import { useToast } from '../contexts/ToastContext';
import { getMaxWeek, getHolidays } from '../services/productionSummaryAPI';
import { PRODUCTION_STEPS, PRODUCTION_MODES, MONTH_FULL, getYearOptions, PROD_CUSTOMER_GROUPS } from '../config/productionSummaryConfig';
import type { ProdCustomerGroup } from '../config/productionSummaryConfig';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import PeriodSetupPanel from '../components/period/PeriodSetupPanel';
import { usePeriodSetup } from '../hooks/usePeriodSetup';
import { useTopbarActions } from '../contexts/TopbarActionContext';


function parseDateLocal(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toLocalYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateStr(ymd: string) {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getWorkDaysInDateRange(minDateStr: string, maxDateStr: string, holidays: string[]): number {
  if (!minDateStr || !maxDateStr) return 0;
  let workDays = 0;
  const d = parseDateLocal(minDateStr);
  let end = parseDateLocal(maxDateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (end > today) end = today;

  while (d <= end) {
    if (d.getDay() !== 0) {
      const dStr = toLocalYMD(d);
      if (!holidays.includes(dStr)) {
        workDays++;
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return workDays;
}

function getWorkDaysInMonth(year: number, month: number, holidays: string[]): number {
  let workDays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (date > today) break;

    if (date.getDay() === 0) continue;

    const dStr = toLocalYMD(date);
    if (holidays.includes(dStr)) continue;
    workDays++;
  }
  return workDays;
}

export default function ProductionSummaryPage() {
  const [step, setStep] = useState('GR');
  const [mode, setMode] = useState('good');
  
  const yearsStr = getYearOptions().map(String);
  const periodSetup = usePeriodSetup({ 
    presets: ['ytd', 'full-year', 'month', 'custom', 'week', 'day'],
    allowWeekRange: true,
    compareSlots: 1,
    availableYears: yearsStr
  });



  const [holidays, setHolidays] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartTitle, setChartTitle] = useState('');
  const { showToast } = useToast();

  const committed = periodSetup.committed;
  const activeYearStr = committed.baseYear || committed.selectedYears[0] || String(new Date().getFullYear());
  const activeYear = Number(activeYearStr);

  const isFiltered = step !== 'GR' || 
    mode !== 'good' || 
    committed.preset !== 'full-year' || 
    committed.baseYear !== String(new Date().getFullYear()) ||
    Boolean(committed.compareActive1);

  const handleResetFilters = () => {
    setStep('GR');
    setMode('good');
    periodSetup.actions.reset();
  };

  const handleShowRef = useRef<() => void>(() => {});

  const handleShow = async () => {
    setLoading(true);
    try {
      let rawData: Record<string, unknown>[] = [];
      let weekDatesMap: Record<string, { min: string; max: string }> = {};

      const stepName = PRODUCTION_STEPS.find((s) => s.code === step)?.nameEN || step;
      const modeName = PRODUCTION_MODES.find((m) => m.key === mode)?.label || mode;

      const preset = committed.preset;

      if (preset === 'full-year' || preset === 'ytd') {
        const res = await fetchWithAuth(`/api/production-summary/year?step=${step}&mode=${mode}&year=${activeYear}`);
        const dataJson = await res.json();
        rawData = dataJson.data || [];

        let filteredRawData = rawData;
        if (preset === 'ytd' && activeYear === new Date().getFullYear()) {
          const curMonth = new Date().getMonth() + 1;
          filteredRawData = rawData.filter(d => Number(d.month) <= curMonth);
        }

        const chartData = filteredRawData.map(item => {
          const m = Number(item.month);
          let total = 0;
          const groupData: Record<string, number> = {};

          PROD_CUSTOMER_GROUPS.forEach((g: ProdCustomerGroup) => {
            const val = Number(item[g.id]) || 0;
            groupData[g.id] = val;
            total += val;
          });

          let workDays = getWorkDaysInMonth(activeYear, m, holidays);
          if (total === 0) workDays = 0;
          const avg = workDays > 0 ? total / workDays : 0;

          return {
            period: m,
            periodLabel: MONTH_FULL[m - 1].substring(0, 3).toUpperCase(),
            ...groupData,
            total, avg, workDays
          };
        });
        setData(chartData);
        setChartTitle(`${stepName} Yearly ${modeName} [ ${activeYear} ]`);

      } else if (preset === 'week') {
        const selWeeks = committed.selectedWeeks || [];
        if (selWeeks.length === 0) { setLoading(false); return; }
        const wStart = Math.min(...selWeeks.map(Number));
        const wEnd = Math.max(...selWeeks.map(Number));

        const res = await fetchWithAuth(`/api/production-summary/week?step=${step}&mode=${mode}&year=${activeYear}&fromWeek=${wStart}&toWeek=${wEnd}`);
        const dataJson = await res.json();
        rawData = dataJson.data || [];
        weekDatesMap = dataJson.weekDates || {};

        const chartData = rawData.map(item => {
          const w = Number(item.week);
          let total = 0;
          const groupData: Record<string, number> = {};

          PROD_CUSTOMER_GROUPS.forEach((g: ProdCustomerGroup) => {
            const val = Number(item[g.id]) || 0;
            groupData[g.id] = val;
            total += val;
          });

          let workDays = 0;
          if (weekDatesMap[w]) {
            workDays = getWorkDaysInDateRange(weekDatesMap[w].min, weekDatesMap[w].max, holidays);
          } else {
            workDays = 6;
          }
          
          if (total === 0) workDays = 0;
          const avg = workDays > 0 ? total / workDays : 0;

          return {
            period: w,
            periodLabel: `W${w}`,
            ...groupData,
            total, avg, workDays
          };
        });
        setData(chartData);
        setChartTitle(`${stepName} Weekly ${modeName} [ W${wStart} - W${wEnd} ${activeYear} ]`);

      } else if (preset === 'month' || preset === 'custom') {
        const monthNum = committed.monthFrom || new Date().getMonth() + 1;
        const res = await fetchWithAuth(`/api/production-summary/month?step=${step}&mode=${mode}&year=${activeYear}&month=${monthNum}`);
        const dataJson = await res.json();
        rawData = dataJson.data || [];

        const chartData = rawData.map(item => {
          const d = Number(item.day);
          let total = 0;
          const groupData: Record<string, number> = {};

          PROD_CUSTOMER_GROUPS.forEach((g: ProdCustomerGroup) => {
            const val = Number(item[g.id]) || 0;
            groupData[g.id] = val;
            total += val;
          });

          const date = new Date(activeYear, monthNum - 1, d);
          const dStr = toLocalYMD(date);

          let workDays = 0;
          if (date.getDay() !== 0 && !holidays.includes(dStr)) {
            workDays = 1;
          }
          if (total === 0) workDays = 0;

          return {
            period: dStr,
            periodLabel: `${String(d).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${activeYear}`,
            ...groupData,
            total, workDays
          };
        });
        setData(chartData);
        setChartTitle(`${stepName} Monthly ${modeName} [ ${MONTH_FULL[monthNum - 1]} ${activeYear} ]`);

      } else if (preset === 'day') {
        const fDate = committed.dateFrom || toLocalYMD(new Date());
        let tDate = committed.dateTo || toLocalYMD(new Date());

        const d1 = new Date(fDate);
        const d2 = new Date(tDate);
        if (d1 > d2) {
          showToast("Date From cannot be greater than Date To", "error");
          setLoading(false);
          return;
        }

        const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          const maxD = new Date(d1);
          maxD.setDate(maxD.getDate() + 30);
          tDate = toLocalYMD(maxD);
        }

        const res = await fetchWithAuth(`/api/production-summary/daily?step=${step}&mode=${mode}&startDate=${fDate}&endDate=${tDate}`);
        const dataJson = await res.json();
        rawData = dataJson.data || [];

        const chartData = rawData.map(item => {
          let total = 0;
          const groupData: Record<string, number> = {};

          PROD_CUSTOMER_GROUPS.forEach((g: ProdCustomerGroup) => {
            const val = Number(item[g.id]) || 0;
            groupData[g.id] = val;
            total += val;
          });

          let workDays = 0;
          const dStr = String(item.dateStr);
          const dateObj = parseDateLocal(dStr);
          if (dateObj.getDay() !== 0 && !holidays.includes(dStr)) {
            workDays = 1;
          }
          if (total === 0) workDays = 0;

          const parts = dStr.split('-');
          const label = `${parts[2]}/${parts[1]}/${parts[0]}`;

          return {
            period: dStr,
            periodLabel: label,
            ...groupData,
            total, workDays
          };
        });
        setData(chartData);
        setChartTitle(`${stepName} Daily ${modeName} [ ${formatDateStr(fDate)} - ${formatDateStr(tDate)} ]`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleShowRef.current = handleShow;
  });

  useEffect(() => {
    if (!isReady) return;
    let isCancelled = false;
    const run = async () => {
      await Promise.resolve();
      if (!isCancelled) {
        handleShow();
      }
    };
    run();
    return () => { isCancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mode, committed, isReady]);

  useEffect(() => {
    async function initYear() {
      try {
        setIsReady(false);
        const [, hols] = await Promise.all([
          getMaxWeek(activeYear),
          getHolidays(activeYear)
        ]);

        const cleanHols = hols.map((h: string) => {
          if (h.includes('T')) return h.split('T')[0];
          return h;
        });
        setHolidays(cleanHols);
      } catch (err) {
        console.error('Failed to init year data:', err);
      } finally {
        setIsReady(true);
      }
    }
    initYear();
  }, [activeYear]);

  const { setTopbarActions } = useTopbarActions();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleReload = async () => {
    setIsSpinning(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
    try {
      handleShowRef.current();
      await minDelay;
    } finally {
      setIsSpinning(false);
    }
  };

  const isRefreshing = isSpinning || loading;

  useEffect(() => {
    setTopbarActions(
      <button
        onClick={handleReload}
        disabled={isRefreshing}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isRefreshing ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: isRefreshing ? 0.8 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isRefreshing) {
            e.currentTarget.style.background = 'var(--color-surface-2)';
            e.currentTarget.style.color = 'var(--color-brand-600)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
        title="Reload data"
        aria-label="Reload data"
      >
        <RefreshCw
          size={18}
          strokeWidth={1.75}
          className={isRefreshing ? 'animate-spin text-[var(--color-brand-600)]' : ''}
        />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, isRefreshing]);

  return (
    <div className="erp-page-container print-layout-production flex flex-col h-full bg-[var(--color-ui-canvas)]">
      <div className="no-print">
        <PageHeader
          breadcrumb={BREADCRUMBS.PRODUCTION_SUMMARY}
          contentLayout="workspace"
        />
      </div>

      <div className="app-content-frame app-content-frame--workspace app-page-content flex-1 overflow-hidden p-2.5 flex flex-col min-h-0">
        <div className="flex flex-col h-full gap-2 min-h-0">

          <div className="no-print bg-[var(--color-surface-0)] border border-[var(--color-border-light)] rounded-lg p-2.5 flex flex-col gap-3 shadow-sm shrink-0">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <div style={{ width: 180 }}>
                  <CustomSelect
                    value={step}
                    onChange={setStep}
                    options={PRODUCTION_STEPS.map(s => ({ value: s.code, label: `${s.nameEN} (${s.nameTH})` }))}
                  />
                </div>
                <div style={{ width: 140 }}>
                  <CustomSelect
                    value={mode}
                    onChange={setMode}
                    options={PRODUCTION_MODES.map(m => ({ value: m.key, label: m.label }))}
                  />
                </div>
              </div>
              <div className="w-[1px] h-8 bg-[var(--color-border-light)] shrink-0 self-center" />
              <div className="flex-1 min-w-[300px] flex items-center gap-2">
                <PeriodSetupPanel 
                  periodSetup={periodSetup}
                  availableYears={yearsStr}
                />
                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "6px",
                      color: "var(--color-text-secondary)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                      transition: "all 0.15s ease",
                      flexShrink: 0,
                    }}
                    className="hover:bg-[var(--color-surface-2)] active:scale-95"
                    title="Reset filters"
                    aria-label="Reset filters"
                  >
                    <FilterX size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <ProductionDashboardSkeleton />
          ) : (
            <>
              {/* กล่องกราฟ (ปรับความHeightเป็น 500px) */}
              <div className="print-chart-box" style={{ height: '500px', width: '100%' }}>
                <ProductionSummaryChart data={data} title={chartTitle} showAvgLine={committed.preset === 'full-year' || committed.preset === 'ytd' || committed.preset === 'week'} />
              </div>

              {/* กล่องตาราง (ใส่ class print-table-box) */}
              <div className="print-table-box shrink-0">
                <ProductionSummaryTable data={data} tab={committed.preset === 'week' ? 'week' : (committed.preset === 'month' || committed.preset === 'custom') ? 'month' : committed.preset === 'day' ? 'day' : 'year'} />
              </div>
            </>
          )}

        </div>
      </div>


    </div>
  );
}
