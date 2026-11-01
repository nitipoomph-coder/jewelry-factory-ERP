import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const TopbarActionsStateContext = createContext<React.ReactNode | null>(null);
const TopbarActionsDispatchContext = createContext<(actions: React.ReactNode | null) => void>(() => {});

export function TopbarActionProvider({ children }: { children: React.ReactNode }) {
  const [topbarActions, setTopbarActionsState] = useState<React.ReactNode | null>(null);

  const setTopbarActions = useCallback((actions: React.ReactNode | null) => {
    setTopbarActionsState(actions);
  }, []);

  return (
    <TopbarActionsDispatchContext.Provider value={setTopbarActions}>
      <TopbarActionsStateContext.Provider value={topbarActions}>
        {children}
      </TopbarActionsStateContext.Provider>
    </TopbarActionsDispatchContext.Provider>
  );
}

export function useTopbarActions() {
  const topbarActions = useContext(TopbarActionsStateContext);
  const setTopbarActions = useContext(TopbarActionsDispatchContext);
  return useMemo(() => ({ topbarActions, setTopbarActions }), [topbarActions, setTopbarActions]);
}

export function useSetTopbarActions() {
  return useContext(TopbarActionsDispatchContext);
}
