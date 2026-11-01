import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { RefreshCw } from 'lucide-react';
import './CustomerDashboard.css';

export interface CustomerDashboardOutletContext {
  availableYears: string[];
  refreshCounter: number;
  isRefreshing: boolean;
  triggerRefresh: () => void;
  setIsRefreshing: (val: boolean) => void;
  isChildLoading: boolean;
  setIsChildLoading: (val: boolean) => void;
}

export default function CustomerDashboardLayout() {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChildLoading, setIsChildLoading] = useState(true);
  const { setTopbarActions } = useTopbarActions();

  useEffect(() => {
    fetchAvailableYears().then((years: number[]) => {
      const stringYears = years.map(String).sort((a: string, b: string) => b.localeCompare(a));
      setAvailableYears(stringYears);
    }).catch(console.error);
  }, []);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setIsChildLoading(true);
    setRefreshCounter(c => c + 1);
  };

  const isSpinning = isRefreshing || isChildLoading || availableYears.length === 0;

  useEffect(() => {
    setTopbarActions(
      <button
        type="button"
        onClick={triggerRefresh}
        disabled={isSpinning}
        className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border-none bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)] transition-colors cursor-pointer"
        style={{
          cursor: isSpinning ? 'wait' : 'pointer',
          opacity: isSpinning ? 0.8 : 1,
        }}
        title="Refresh Data"
        aria-label="Refresh Data"
      >
        <RefreshCw size={18} strokeWidth={1.75} className={isSpinning ? 'animate-spin text-[var(--color-brand-600)]' : ''} />
      </button>
    );

    return () => setTopbarActions(null);
  }, [setTopbarActions, isSpinning]);

  return (
    <>
      <Outlet context={{ 
        availableYears, 
        refreshCounter, 
        isRefreshing, 
        triggerRefresh, 
        setIsRefreshing,
        isChildLoading,
        setIsChildLoading,
      }} />
    </>
  );
}
