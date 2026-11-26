// Holds the Excel export the current page registered (see contexts/pageExportStore.ts).
import { useState } from 'react';
import type { ReactNode } from 'react';
import { PageExcelExportContext, SetPageExcelExportContext, type PageExcelExport } from './pageExportStore';

export function PageExportProvider({ children }: { children: ReactNode }) {
  const [pageExport, setPageExport] = useState<PageExcelExport | null>(null);
  return (
    <SetPageExcelExportContext.Provider value={setPageExport}>
      <PageExcelExportContext.Provider value={pageExport}>
        {children}
      </PageExcelExportContext.Provider>
    </SetPageExcelExportContext.Provider>
  );
}
