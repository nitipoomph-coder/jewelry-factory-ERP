/**
 * Customer Group Configuration
 * 
 * Single Source of Truth for customer grouping in the system
 * Used in: CustomerDashboard, CustomerDetailModal
 * 
 * Rule: Do not hardcode group logic directly in Components
 */

export interface CustomerGroup {
  id: string;
  label: string;
  color: string;
  /** Customer codes belonging to this group (exact match with CustCode prefix) */
  prefixes: string[];
  /** Default visibility status (if false, it won't be selected by default and is considered legacy) */
  isActive?: boolean;
  /** Show this group's KPI on the Customer Report Matrix (By Customer view only) */
  showKpi?: boolean;
}

/**
 * All customer groups (excluding General)
 * General = Any customer code that does not match defined groups
 */
export const CUSTOMER_GROUPS: CustomerGroup[] = [
  {
    id: 'N008',
    label: 'N008 Group',
    color: 'var(--color-customer-group-n008)',
    prefixes: ['N008', 'N048', 'N065', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'],
    isActive: true,
    showKpi: true,
  },
  {
    id: 'N044',
    label: 'N044 Group',
    color: 'var(--color-customer-group-n044)',
    prefixes: ['N044'],
    isActive: true,
    showKpi: true,
  },
  {
    id: 'N098',
    label: 'N098 Group',
    color: 'var(--color-customer-group-n098)',
    prefixes: ['N098'],
    isActive: true,
    showKpi: true,
  },
  {
    id: 'N051',
    label: 'N051 Group',
    color: 'var(--color-customer-group-n051)',
    prefixes: ['N051'],
    isActive: true,
    showKpi: true,
  },
  {
    id: 'N083',
    label: 'N083 Group',
    color: 'var(--color-customer-group-n083)',
    prefixes: ['N083', 'N086', 'N087', 'N088', 'N089'],
    isActive: true,
  },

  {
    id: 'MLT',
    label: 'MLT Group',
    color: 'var(--color-customer-group-mlt)',
    prefixes: [
      'U411', 'U412', 'U413', 'U414', 'U415', 'U416',
      'U417', 'U418', 'U419', 'U420', 'U421', 'U422',
      'U423', 'U424', 'U425', 'U426',
    ],
    isActive: true,
  },
];

/** General Group (Customers not matching any defined group) */
export const GENERAL_GROUP: CustomerGroup = {
  id: 'General',
  label: 'General',
  color: 'var(--color-customer-group-general)',
  prefixes: [],
  isActive: true,
};

/** ALL_GROUPS including General — Used for UI toggle / legend */
export const ALL_GROUPS: CustomerGroup[] = [...CUSTOMER_GROUPS, GENERAL_GROUP];

/** Every group id. Used as the Active list before the data is known; the default selection is the period's Active groups (hooks/useGroupSelection.ts). */
export const ACTIVE_GROUP_IDS: string[] = ALL_GROUPS.map(g => g.id);

/**
 * Customer groups that have orders in the current scope, in ALL_GROUPS order.
 * Feeds the group filter's Active / Inactive split. Pass null while the data is not known yet
 * (first load) → every group is treated as active, so groups do not jump between sections.
 */
export function getActiveGroupIds(activeCustomerCodes: Iterable<string> | null): string[] {
  if (!activeCustomerCodes) return ACTIVE_GROUP_IDS;
  const activeIds = new Set<string>();
  for (const code of activeCustomerCodes) {
    if (code) activeIds.add(getCustomerGroupId(code));
  }
  return ALL_GROUPS.filter(g => activeIds.has(g.id)).map(g => g.id);
}

/**
 * Server-side customer filter for the selected groups (Order List API: /api/dashboard/sales-orders).
 * General has no code list, so when it is selected the filter becomes
 * "every customer except the codes of the named groups that are NOT selected" —
 * new customer codes are then included automatically.
 * No group or every group selected → no customer filter.
 */
export function getGroupCustomerFilter(groupIds: string[]): { customers: string[]; excludeCustomers: string[] } {
  if (groupIds.length === 0 || ALL_GROUPS.every(g => groupIds.includes(g.id))) {
    return { customers: [], excludeCustomers: [] };
  }
  if (groupIds.includes(GENERAL_GROUP.id)) {
    return {
      customers: [],
      excludeCustomers: CUSTOMER_GROUPS.filter(g => !groupIds.includes(g.id)).flatMap(g => g.prefixes),
    };
  }
  return {
    customers: CUSTOMER_GROUPS.filter(g => groupIds.includes(g.id)).flatMap(g => g.prefixes),
    excludeCustomers: [],
  };
}

/**
 * Determine which group a customer belongs to
 * @param custCode Customer code e.g. "N008", "U411", "N048"
 * @returns group ID e.g. "N008", "MLT", "General"
 */
export function getCustomerGroupId(custCode: string): string {
  const code = custCode.toUpperCase().trim();
  for (const group of CUSTOMER_GROUPS) {
    if (group.prefixes.some(prefix => code.startsWith(prefix))) {
      return group.id;
    }
  }
  return 'General';
}
