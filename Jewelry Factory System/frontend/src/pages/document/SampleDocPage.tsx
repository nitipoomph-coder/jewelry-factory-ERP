import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DocumentLayout from '../../components/layout/DocumentLayout';
import type { DocListItem, BreadcrumbItem } from '../../components/layout/DocumentLayout';
import { formConfigMap } from '../../config/formConfigs';
import { BREADCRUMBS } from '../../config/breadcrumbs';
import { useToast } from '../../contexts/ToastContext';
import {
  fetchSampleDocuments,
  fetchSampleDocument,
  type SampleDocument,
} from '../../services/sampleAPI';
import { getErrorMessage } from '../../utils/errors';

// ─── Route → docType mapping ──────────────────
const routeToDocType: Record<string, string> = {
  '/sample/order': 'SSA',
  '/sample/dispatch': 'SIM',
};

export default function SampleDocPage() {
  const location = useLocation();
  const docType = routeToDocType[location.pathname] || 'SSA';
  return <SampleDocWorkspace key={docType} docType={docType} />;
}

function SampleDocWorkspace({ docType }: { docType: string }) {
  const { showToast } = useToast();
  const formConfig = formConfigMap[docType];

  const [docList, setDocList] = useState<DocListItem[]>([]);
  const [selectedDocNo, setSelectedDocNo] = useState('');
  const [docDetail, setDocDetail] = useState<SampleDocument | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const [loadedListKey, setLoadedListKey] = useState('');
  const [loadedDetailNo, setLoadedDetailNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listKey = `${docType}:${page}:${search}`;
  const loading = loadedListKey !== listKey;
  const detailLoading = Boolean(selectedDocNo && loadedDetailNo !== selectedDocNo);

  const groupLabel = 'Sample Department';
  const itemLabel = formConfig?.titleTh || docType;

  const breadcrumb: BreadcrumbItem[] = BREADCRUMBS.DOCUMENT(groupLabel, itemLabel, docType);

  // ─── Load document list ─────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchSampleDocuments(docType, { page, limit: 50, search })
      .then(response => {
        if (cancelled) return;
        const mappedList = response.data.map(d => ({
          no: d.DocuNo,
          date: d.DocuDate ? formatDateDDMMYYYY(d.DocuDate) : '',
        }));
        setDocList(mappedList);
        setTotalPages(response.totalPages || 1);
        setSelectedDocNo(current => current || mappedList[0]?.no || '');
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        const message = getErrorMessage(requestError, 'Failed to load document list');
        console.warn(`Failed to load list for ${docType}:`, requestError);
        if (!message.includes('404')) setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoadedListKey(listKey);
      });
    return () => { cancelled = true; };
  }, [docType, page, search, listKey]);

  useEffect(() => {
    if (!selectedDocNo) return;
    let cancelled = false;
    fetchSampleDocument(selectedDocNo)
      .then(nextDetail => {
        if (cancelled) return;
        setDocDetail(nextDetail);
        setLoadedDetailNo(selectedDocNo);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(requestError, 'Failed to fetch Document'));
        setDocDetail(null);
        setLoadedDetailNo(selectedDocNo);
      });
    return () => { cancelled = true; };
  }, [selectedDocNo]);

  const handleSelectDoc = (docNo: string) => setSelectedDocNo(docNo);

  function handleClear() {
    setSelectedDocNo('');
    setDocDetail(null);
    setError(null);
  };

  const handleSave = () => {
    showToast('System in development phase (Read-Only)', 'warning');
  };

  return (
    <DocumentLayout
      docType={docType}
      formConfig={formConfig}
      breadcrumb={breadcrumb}
      docList={docList}
      selectedDocNo={selectedDocNo}
      onSelectDoc={handleSelectDoc}
      onSearchList={(text) => {
        setSearch(text);
        setPage(1);
      }}
      onSearchSubmit={(text) => {
        if (text.trim()) {
          handleSelectDoc(text.trim());
        }
      }}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      docDetail={docDetail}
      loading={loading}
      detailLoading={detailLoading}
      error={error}
      onClearError={() => setError(null)}
      hasPhoto={formConfig?.hasPhoto}
      onNew={handleClear}
      onSave={handleSave}
      onCancel={handleClear}
    />
  );
}
