import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppWorkspace } from '../types';

interface WorkspaceContextType {
  workspace: AppWorkspace;
  setWorkspace: (ws: AppWorkspace) => void;
  switchWorkspace: (ws: AppWorkspace) => void;
  isPcc: boolean;
  isInventory: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = 'app_workspace';

// Auto-detect workspace from route path
export function getWorkspaceFromPath(pathname: string): AppWorkspace | null {
  const normalized = pathname.toLowerCase();
  if (
    normalized.startsWith('/procurement') ||
    normalized.startsWith('/orders') ||
    normalized.startsWith('/sample') ||
    normalized.startsWith('/inventory') ||
    normalized.startsWith('/spare-parts')
  ) {
    return 'INVENTORY';
  }
  if (
    normalized === '/' ||
    normalized.startsWith('/dashboard') ||
    normalized.startsWith('/po-tracker') ||
    normalized.startsWith('/subcontract') ||
    normalized.startsWith('/admin') ||
    normalized.startsWith('/audit')
  ) {
    return 'PCC';
  }
  return null;
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize: Prioritize path deduction, then localStorage, fallback to PCC
  const [storedWorkspace, setWorkspaceState] = useState<AppWorkspace>(() => {
    const fromPath = getWorkspaceFromPath(location.pathname);
    if (fromPath) return fromPath;
    const saved = localStorage.getItem(STORAGE_KEY) as AppWorkspace | null;
    return saved === 'INVENTORY' ? 'INVENTORY' : 'PCC';
  });

  // The route decides the workspace whenever it belongs to one; routes without a workspace keep the last one.
  // Remember the route's workspace during render (React "adjust state on prop change" pattern, no effect).
  const fromPath = getWorkspaceFromPath(location.pathname);
  if (fromPath && fromPath !== storedWorkspace) {
    setWorkspaceState(fromPath);
  }
  const workspace = fromPath ?? storedWorkspace;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, workspace);
  }, [workspace]);

  const setWorkspace = (ws: AppWorkspace) => {
    setWorkspaceState(ws);
  };

  // Switch workspace and navigate to landing page
  const switchWorkspace = (target: AppWorkspace) => {
    if (target === workspace) return;
    setWorkspace(target);
    if (target === 'PCC') {
      navigate('/');
    } else {
      navigate('/procurement/purchase');
    }
  };

  const value = useMemo(() => ({
    workspace,
    setWorkspace,
    switchWorkspace,
    isPcc: workspace === 'PCC',
    isInventory: workspace === 'INVENTORY',
  }), [workspace]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
