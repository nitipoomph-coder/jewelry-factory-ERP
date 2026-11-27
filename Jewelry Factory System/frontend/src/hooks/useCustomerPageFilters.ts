import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_GROUPS, type CustomerGroup } from '../config/customerGroups';
import { usePeriodSetup, type PeriodSetupConfig, type PeriodPreset } from './usePeriodSetup';
import { parseListParam } from '../utils/periodUtils';

export const ALL_GROUP_IDS = ALL_GROUPS.map((group: CustomerGroup) => group.id);

export function parseGroups(value: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return [];
  if (normalized === 'all') return ALL_GROUP_IDS;
  if (normalized === 'none') return [];
  const groupIds = new Set(ALL_GROUP_IDS);
  return parseListParam(value).filter(groupId => groupIds.has(groupId));
}

// No `groups` param (or the old default `groups=all`) → automatic Active-group selection.
function manualGroupsFromParam(value: string | null): string[] | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'all') return null;
  return parseGroups(value);
}

// Period setup + the manual part of the group selection. Pages resolve the actual selection with
// useGroupSelection(groupSelection.manualGroups, groupSelection.setManualGroups, activeGroupIds)
// once they know the period's Active groups.
export function useCustomerPageFilters(availableYears: string[], configOverrides?: Partial<PeriodSetupConfig>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [manualGroups, setManualGroups] = useState<string[] | null>(() => manualGroupsFromParam(searchParams.get('groups')));

  // Initialize unified Period Setup Hook
  const periodSetupConfig = useMemo(() => ({
    availableYears,
    syncToUrl: true,
    presets: ['full-year', 'ytd', 'month', 'week', 'day', 'custom'] as PeriodPreset[],
    compareSlots: 2 as const,
    allowWeekRange: true,
    // Order Date / Due Date switch, the same as Top Items (every Sales page reads VW_Web_SalesDashboard
    // through salesDateBasis, so the choice applies to every query of the page)
    allowDateFieldToggle: true,
    onReset: () => {
      setManualGroups(null);
    },
    ...configOverrides
  }), [availableYears, configOverrides]);

  const periodSetup = usePeriodSetup(periodSetupConfig);

  // Sync groups to URL: automatic → no param; manual → 'none' or the id list
  useEffect(() => {
    const currentGroups = searchParams.get('groups') || '';
    const targetGroups = manualGroups === null ? '' : manualGroups.length === 0 ? 'none' : manualGroups.join(',');

    if (currentGroups !== targetGroups) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (targetGroups) next.set('groups', targetGroups);
        else next.delete('groups');
        return next;
      }, { replace: true });
    }
  }, [manualGroups, searchParams, setSearchParams]);

  const isFiltered = useMemo(() => {
    const currentMonth = String(new Date().getMonth() + 1);
    const isDefaultMonth = periodSetup.committed.preset === 'month' && periodSetup.committed.selectedMonths?.length === 1 && periodSetup.committed.selectedMonths[0] === currentMonth;
    const isFullYear = periodSetup.committed.preset === 'full-year' || (periodSetup.committed.monthFrom === 1 && periodSetup.committed.monthTo === 12);
    const isPeriodFiltered = !(isDefaultMonth || isFullYear) || periodSetup.committed.compareActive1 || periodSetup.committed.compareActive2;

    const isGroupsFiltered = manualGroups !== null;
    return isPeriodFiltered || isGroupsFiltered;
  }, [periodSetup.committed, manualGroups]);

  const resetFilters = () => {
    periodSetup.actions.reset();
  };

  return {
    periodSetup,
    groupSelection: { manualGroups, setManualGroups },
    isFiltered,
    resetFilters
  };
}
