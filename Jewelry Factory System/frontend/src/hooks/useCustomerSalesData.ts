import { useMemo } from 'react';
import { ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type Metric = 'amount' | 'qty';
type MonthlySummaryMap = Record<string, Record<string, number>>;
export type CustomerSummaryRow = {
  id?: string;
  monthly?: MonthlySummaryMap;
  monthlyQty?: MonthlySummaryMap;
};
type RawSummary = Record<string, Record<string, Record<string, number>>>;
export type ChartDatum = { label: string; sortKey?: string } & Record<string, string | number | undefined>;

interface UseCustomerSalesDataProps {
  custData: CustomerSummaryRow[];
  availableYears: string[];
  activeYears: string[];
  selectedMonths: string[];
  sortedSel: string[];
  metric: Metric;
  mode: 'yearly' | 'monthly';
  monthlySeries: 'year' | 'group';
  kpiCompareYear?: string;
}

export function useCustomerSalesData({
  custData,
  availableYears,
  activeYears,
  selectedMonths,
  sortedSel,
  metric,
  mode,
  monthlySeries,
  kpiCompareYear
}: UseCustomerSalesDataProps) {

  // Convert customer data into RAW[year][month][groupId] structure
  const RAW = useMemo(() => {
    const raw: RawSummary = {};
    availableYears.forEach(y => {
      raw[y] = {};
      MONTHS.forEach((m) => {
        raw[y][m] = {};
        ALL_GROUPS.forEach(g => { raw[y][m][g.id] = 0; });
      });
    });

    custData.forEach(cust => {
      const gId = getCustomerGroupId(cust.id || '');
      availableYears.forEach(y => {
        MONTHS.forEach((m, mi) => {
          const mStr = (mi + 1).toString();
          const source = metric === 'qty' ? cust.monthlyQty : cust.monthly;
          const val = Number(source?.[y]?.[mStr]) || 0;
          raw[y][m][gId] += val;
        });
      });
    });
    return raw;
  }, [custData, availableYears, metric]);

  // Build chartData based on mode
  const chartData = useMemo(() => {
    if (mode === "yearly") {
      if (monthlySeries === 'year') {
        return sortedSel.map(gId => {
          const g = ALL_GROUPS.find(x => x.id === gId)!;
          const r: ChartDatum = { label: g.label };
          activeYears.forEach(y => {
            const prevY = String(Number(y) - 1);
            r[y] = selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[gId] || 0), 0);
            r[`${y}_prev`] = selectedMonths.reduce((s, mStr) => s + (RAW[prevY]?.[MONTHS[parseInt(mStr) - 1]]?.[gId] || 0), 0);
          });
          return r;
        });
      } else {
        return activeYears.map(y => {
          const prevY = String(Number(y) - 1);
          const r: ChartDatum = { label: String(y) };
          sortedSel.forEach(g => { 
            r[g] = selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[g] || 0), 0); 
            r[`${g}_prev`] = selectedMonths.reduce((s, mStr) => s + (RAW[prevY]?.[MONTHS[parseInt(mStr) - 1]]?.[g] || 0), 0); 
          });
          return r;
        });
      }
    } else {
      const sortedMonths = [...selectedMonths].sort((a, b) => parseInt(a) - parseInt(b));
      if (monthlySeries === 'year') {
        return sortedMonths.map(mStr => {
          const m = MONTHS[parseInt(mStr) - 1];
          const r: ChartDatum = { label: m };
          activeYears.forEach(y => {
            const prevY = String(Number(y) - 1);
            r[y] = sortedSel.reduce((sum, g) => sum + (RAW[y]?.[m]?.[g] || 0), 0);
            r[`${y}_prev`] = sortedSel.reduce((sum, g) => sum + (RAW[prevY]?.[m]?.[g] || 0), 0);
          });
          return r;
        });
      } else {
        const list: ChartDatum[] = [];
        sortedMonths.forEach(mStr => {
          activeYears.forEach(y => {
            const prevY = String(Number(y) - 1);
            const m = MONTHS[parseInt(mStr) - 1];
            const label = activeYears.length > 1 ? `${m} ${String(y).slice(2)}` : m;
            const r: ChartDatum = { label, sortKey: `${mStr.padStart(2, '0')}-${y}` };
            sortedSel.forEach(g => {
              r[g] = RAW[y]?.[m]?.[g] || 0;
              r[`${g}_prev`] = RAW[prevY]?.[m]?.[g] || 0;
            });
            list.push(r);
          });
        });
        return list;
      }
    }
  }, [mode, monthlySeries, activeYears, selectedMonths, sortedSel, RAW]);

  // Summary Cards computation
  const summaries = useMemo(() => {
    const sortedDesc = [...activeYears].sort((a, b) => Number(b) - Number(a));
    const baseYear = sortedDesc.length > 0 ? sortedDesc[0] : null;
    const targetCompYear = kpiCompareYear === 'none' ? null : (kpiCompareYear && activeYears.includes(kpiCompareYear) && kpiCompareYear !== baseYear
      ? kpiCompareYear
      : (sortedDesc.length > 1 ? sortedDesc.find(y => y !== baseYear) || null : null));

    return sortedSel.map(gId => {
      const g = ALL_GROUPS.find(x => x.id === gId)!;

      const yearTotals: Record<string, number> = {};
      activeYears.forEach(y => {
        yearTotals[y] = selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[gId] || 0), 0);
      });

      const totalLatestYear = baseYear ? (yearTotals[baseYear] || 0) : 0;

      let diff = null;
      let pct = null;
      if (baseYear && targetCompYear && baseYear !== targetCompYear) {
        const curr = yearTotals[baseYear] || 0;
        const prev = yearTotals[targetCompYear] || 0;
        if (prev > 0 || curr > 0) {
          diff = curr - prev;
          if (prev > 0) pct = ((curr - prev) / prev) * 100;
        }
      }

      return { ...g, yearTotals, totalLatestYear, diff, pct, maxYear: baseYear, minYear: targetCompYear, latestYear: baseYear };
    });
  }, [sortedSel, activeYears, selectedMonths, RAW, kpiCompareYear]);

  const yearSummaries = useMemo(() => {
    const sortedDesc = [...activeYears].sort((a, b) => Number(b) - Number(a));
    const baseYear = sortedDesc.length > 0 ? sortedDesc[0] : null;
    const targetCompYear = kpiCompareYear === 'none' ? null : (kpiCompareYear && activeYears.includes(kpiCompareYear) && kpiCompareYear !== baseYear
      ? kpiCompareYear
      : (sortedDesc.length > 1 ? sortedDesc.find(y => y !== baseYear) || null : null));

    const yearTotals: Record<string, number> = {};
    activeYears.forEach(y => yearTotals[y] = 0);

    activeYears.forEach(y => {
      sortedSel.forEach(gId => {
        yearTotals[y] += selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[gId] || 0), 0);
      });
    });

    return sortedDesc.map(y => {
      let diff = null;
      let pct = null;
      let compYear = null;

      if (y === baseYear && targetCompYear) {
        const curr = yearTotals[y] || 0;
        const prev = yearTotals[targetCompYear] || 0;
        if (prev > 0 || curr > 0) {
          diff = curr - prev;
          compYear = targetCompYear;
          if (prev > 0) pct = ((curr - prev) / prev) * 100;
        }
      }

      return { year: y, total: yearTotals[y], diff, pct, compYear };
    });
  }, [sortedSel, activeYears, selectedMonths, RAW, kpiCompareYear]);

  // Grand Total computation
  const { grandTotal, grandYoy, grandLatestYear } = useMemo(() => {
    let gTotal = 0;

    const grandYearTotals: Record<string, number> = {};
    activeYears.forEach(y => {
      grandYearTotals[y] = 0;
    });

    summaries.forEach(g => {
      activeYears.forEach(y => {
        grandYearTotals[y] += (g.yearTotals[y] || 0);
      });
    });

    const reversedYears = [...activeYears].sort((a, b) => Number(b) - Number(a));
    const latestYear = reversedYears.length > 0 ? reversedYears[0] : null;
    const targetCompYear = kpiCompareYear === 'none' ? null : (kpiCompareYear && activeYears.includes(kpiCompareYear) && kpiCompareYear !== latestYear
      ? kpiCompareYear
      : (reversedYears.length > 1 ? reversedYears.find(y => y !== latestYear) || null : null));

    if (latestYear) {
      gTotal = grandYearTotals[latestYear] || 0;
    }

    const gYoy: { currYr: string, prevYr: string, pct: number | null }[] = [];

    if (latestYear && targetCompYear && latestYear !== targetCompYear) {
      const currVal = grandYearTotals[latestYear] || 0;
      const prevVal = grandYearTotals[targetCompYear] || 0;
      let pct = null;
      if (prevVal > 0) {
        pct = ((currVal - prevVal) / prevVal) * 100;
      }
      gYoy.push({ currYr: latestYear, prevYr: targetCompYear, pct });
    }

    return { grandTotal: gTotal, grandYoy: gYoy, grandLatestYear: latestYear };
  }, [summaries, activeYears, kpiCompareYear]);

  return {
    RAW,
    chartData,
    summaries,
    yearSummaries,
    grandTotal,
    grandYoy,
    grandLatestYear
  };
}
