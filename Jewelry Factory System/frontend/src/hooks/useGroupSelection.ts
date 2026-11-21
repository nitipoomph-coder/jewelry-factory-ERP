// Customer group selection with an automatic default (Sales Summary, Customer Report, Top Item Gallery).
//
// manualGroups === null → automatic: the selection is the period's Active groups (groups with
// ordered qty in the current scope) and follows them when the period changes. Inactive groups are
// not selected, which changes no totals (they have no orders in the scope).
// Any user change stores an explicit list; picking exactly the Active groups returns to automatic.
import { useCallback, useMemo } from 'react';
import { ALL_GROUPS } from '../config/customerGroups';

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(id => b.includes(id));

export function useGroupSelection(
  manualGroups: string[] | null,
  setManualGroups: (groups: string[] | null) => void,
  activeGroupIds: string[],
  onChange?: () => void,
) {
  // Keep ALL_GROUPS order so colors and legends stay stable.
  const selGroups = useMemo(() => {
    const source = manualGroups ?? activeGroupIds;
    return ALL_GROUPS.filter(g => source.includes(g.id)).map(g => g.id);
  }, [manualGroups, activeGroupIds]);

  const setSelGroups = useCallback((groups: string[]) => {
    onChange?.();
    setManualGroups(sameSet(groups, activeGroupIds) ? null : groups);
  }, [activeGroupIds, onChange, setManualGroups]);

  const toggleGroup = useCallback((id: string) => {
    setSelGroups(selGroups.includes(id) ? selGroups.filter(x => x !== id) : [...selGroups, id]);
  }, [selGroups, setSelGroups]);

  return { selGroups, setSelGroups, toggleGroup, isAutoGroups: manualGroups === null };
}
