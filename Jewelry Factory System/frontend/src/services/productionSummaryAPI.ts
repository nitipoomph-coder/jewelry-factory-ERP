import { fetchWithAuth } from '../utils/fetchWithAuth';

export interface ProductionSummaryParams {
  step: string;
  mode: string;
  year: number;
}

export interface YearMonthParams extends ProductionSummaryParams {
  month?: number; // 1-12
}

export interface WeekParams extends ProductionSummaryParams {
  fromWeek: number;
  toWeek: number;
}

export interface ProductionDataPoint {
  period: number | string; // 1-12 (month), 1-53 (week), 'YYYY-MM-DD' (date)
  custCode: string;
  qty: number;
}

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return query.toString();
};

export const getProductionYearly = async (params: ProductionSummaryParams): Promise<ProductionDataPoint[]> => {
  const q = toQueryString(params as unknown as Record<string, string | number | undefined>);
  const response = await fetchWithAuth(`/api/production-summary/year?${q}`);
  if (!response.ok) throw new Error('API Error');
  const data = await response.json();
  return data.data;
};

export const getProductionWeekly = async (params: WeekParams): Promise<ProductionDataPoint[]> => {
  const q = toQueryString(params as unknown as Record<string, string | number | undefined>);
  const response = await fetchWithAuth(`/api/production-summary/week?${q}`);
  if (!response.ok) throw new Error('API Error');
  const data = await response.json();
  return data.data;
};

export const getProductionMonthly = async (params: YearMonthParams): Promise<ProductionDataPoint[]> => {
  const q = toQueryString(params as unknown as Record<string, string | number | undefined>);
  const response = await fetchWithAuth(`/api/production-summary/month?${q}`);
  if (!response.ok) throw new Error('API Error');
  const data = await response.json();
  return data.data;
};

export const getMaxWeek = async (year: number): Promise<number> => {
  const response = await fetchWithAuth(`/api/production-summary/max-week?year=${year}`);
  if (!response.ok) throw new Error('API Error');
  const data = await response.json();
  return data.maxWeek;
};

export const getHolidays = async (year: number): Promise<string[]> => {
  const response = await fetchWithAuth(`/api/production-summary/holidays?year=${year}`);
  if (!response.ok) throw new Error('API Error');
  const data = await response.json();
  return data.data || [];
};
