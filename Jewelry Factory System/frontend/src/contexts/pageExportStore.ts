// Page Excel export "plug" for the Global Topbar (Print / Export menu → Export to Excel).
// The topbar knows nothing about any page: a page that can export registers its own function with
// usePageExcelExport() while it is mounted, and the topbar's Export to Excel item calls it. Pages that
// register nothing leave the item disabled. Provider: contexts/PageExportContext.tsx (in AppLayout).
import { createContext, useContext, useEffect, useRef } from 'react';

export interface PageExcelExport {
  /** Builds and downloads the page's Excel file */
  run: () => void | Promise<void>;
  /** Shown as the menu item's tooltip, e.g. "2,733 order lines" */
  description?: string;
  /** Nothing to export right now (no rows) */
  disabled?: boolean;
}

export const PageExcelExportContext = createContext<PageExcelExport | null>(null);
export const SetPageExcelExportContext = createContext<(value: PageExcelExport | null) => void>(() => {});

/** Topbar side: the export the current page registered, or null. */
export function usePageExcelExportAction(): PageExcelExport | null {
  return useContext(PageExcelExportContext);
}

/**
 * Page side: registers `run` as the topbar's Export to Excel while the page is mounted.
 * `run` may change on every render (it reads the page's latest rows); the topbar always calls the latest one.
 */
export function usePageExcelExport(run: () => void | Promise<void>, options: { description?: string; disabled?: boolean } = {}) {
  const setExport = useContext(SetPageExcelExportContext);
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  const { description, disabled } = options;
  useEffect(() => {
    setExport({ run: () => runRef.current(), description, disabled });
  }, [setExport, description, disabled]);
  useEffect(() => () => setExport(null), [setExport]);
}
