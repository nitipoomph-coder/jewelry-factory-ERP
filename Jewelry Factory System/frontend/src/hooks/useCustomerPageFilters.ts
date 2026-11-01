import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ACTIVE_GROUP_IDS, ALL_GROUPS, getCustomerGroupId, type CustomerGroup } from '../config/customerGroups';
import { usePeriodSetup, type PeriodSetupConfig, type PeriodPreset } from './usePeriodSetup';
import { parseListParam } from '../utils/periodUtils';
import type { CustomerSummaryRow } from './useCustomerSalesData';

export const ALL_GROUP_IDS = ALL_GROUPS.map((group: CustomerGroup) => group.id);

export function parseGroups(value: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return [];
  if (normalized === 'all') return ALL_GROUP_IDS;
  if (normalized === 'none') return [];
  const groupIds = new Set(ALL_GROUP_IDS);
  return parseListParam(value).filter(groupId => groupIds.has(groupId));
}

export function useCustomerPageFilters(availableYears: string[], configOverrides?: Partial<PeriodSetupConfig>, custData: CustomerSummaryRow[] = []) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Global Filter States
  const hasGroupsParam = searchParams.has('groups');
  
  const requestedGroups = useMemo(() => {
    return parseGroups(searchParams.get('groups'));
  }, [searchParams]);

  const defaultGroups = ACTIVE_GROUP_IDS;

  const [selGroups, setSelGroups] = useState<string[]>(hasGroupsParam ? requestedGroups : defaultGroups);

  // Initialize unified Period Setup Hook
  const periodSetupConfig = useMemo(() => ({
    availableYears,
    syncToUrl: true,
    presets: ['full-year', 'ytd', 'month', 'week', 'day', 'custom'] as PeriodPreset[],
    compareSlots: 2 as const,
    allowWeekRange: true,
    onReset: () => {
      setSelGroups(ACTIVE_GROUP_IDS);
    },
    ...configOverrides
  }), [availableYears, configOverrides]);

  const periodSetup = usePeriodSetup(periodSetupConfig);

  // Sync groups to URL
  useEffect(() => {
    const isAllGroups = selGroups.length === ALL_GROUP_IDS.length;
    const currentGroups = searchParams.get('groups') || '';
    const targetGroups = selGroups.length === 0 ? 'none' : isAllGroups ? 'all' : selGroups.join(',');

    if (currentGroups !== targetGroups) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (targetGroups) next.set('groups', targetGroups);
        else next.delete('groups');
        return next;
      }, { replace: true });
    }
  }, [selGroups, searchParams, setSearchParams]);

  // All customer groups are active by default across pages
  const dynamicActiveGroups = useMemo(() => {
    return ALL_GROUP_IDS;
  }, []);

  const toggleGroup = (id: string) => {
    setSelGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const isFiltered = useMemo(() => {
    const currentMonth = String(new Date().getMonth() + 1);
    const isDefaultMonth = periodSetup.committed.preset === 'month' && periodSetup.committed.selectedMonths?.length === 1 && periodSetup.committed.selectedMonths[0] === currentMonth;
    const isFullYear = periodSetup.committed.preset === 'full-year' || (periodSetup.committed.monthFrom === 1 && periodSetup.committed.monthTo === 12);
    const isPeriodFiltered = !(isDefaultMonth || isFullYear) || periodSetup.committed.compareActive1 || periodSetup.committed.compareActive2;
    
    const isGroupsFiltered = selGroups.length !== ACTIVE_GROUP_IDS.length || !ACTIVE_GROUP_IDS.every((id: string) => selGroups.includes(id));
    return isPeriodFiltered || isGroupsFiltered;
  }, [periodSetup.committed, selGroups]);

  const resetFilters = () => {
    periodSetup.actions.reset();
  };

  return {
    periodSetup,
    selGroups,
    setSelGroups,
    toggleGroup,
    dynamicActiveGroups,
    isFiltered,
    resetFilters
  };
}
