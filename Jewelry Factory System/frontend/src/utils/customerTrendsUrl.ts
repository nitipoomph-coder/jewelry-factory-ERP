export const CUSTOMER_TRENDS_PATH = '/dashboard/customer/trends';
export const LEGACY_CUSTOMER_TRENDS_PATH = '/dashboard/sales-customer-groups';

const ALL_MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1));

type CustomerTrendsMetric = 'amount' | 'qty';

type CustomerTrendsLocation = {
  years?: string[];
  months?: string[];
  groups?: string[];
  customers?: string[];
  metric?: CustomerTrendsMetric | string;
};

function uniqueCsvValues(values: string[] = []) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function csv(value: string | null) {
  return uniqueCsvValues(String(value || '').split(','));
}

function normalizedMonths(values: string[] = []) {
  return uniqueCsvValues(values)
    .filter(value => ALL_MONTHS.includes(value))
    .sort((left, right) => Number(left) - Number(right));
}

function hasAllMonths(months: string[]) {
  return months.length === ALL_MONTHS.length
    && ALL_MONTHS.every(month => months.includes(month));
}

export function buildCustomerTrendsPath({
  years = [],
  months = [],
  groups = [],
  customers = [],
  metric = 'amount',
}: CustomerTrendsLocation = {}) {
  const params = new URLSearchParams();
  const normalizedYears = uniqueCsvValues(years);
  const selectedMonths = normalizedMonths(months);
  const normalizedGroups = uniqueCsvValues(groups);
  const normalizedCustomers = uniqueCsvValues(customers);

  if (normalizedYears.length > 0) params.set('years', normalizedYears.join(','));
  if (selectedMonths.length > 0 && !hasAllMonths(selectedMonths)) {
    params.set('months', selectedMonths.join(','));
  }
  if (normalizedGroups.length > 0) params.set('groups', normalizedGroups.join(','));
  else if (normalizedCustomers.length > 0) params.set('customers', normalizedCustomers.join(','));
  if (metric === 'qty') params.set('metric', 'qty');

  const query = params.toString().replaceAll('%2C', ',');
  return query ? `${CUSTOMER_TRENDS_PATH}?${query}` : CUSTOMER_TRENDS_PATH;
}

export function customerTrendsPathFromSearch(search: string) {
  const params = new URLSearchParams(search);
  return buildCustomerTrendsPath({
    years: csv(params.get('years')),
    months: csv(params.get('months')),
    groups: csv(params.get('groups')),
    customers: csv(params.get('customers')),
    metric: params.get('metric') || 'amount',
  });
}
