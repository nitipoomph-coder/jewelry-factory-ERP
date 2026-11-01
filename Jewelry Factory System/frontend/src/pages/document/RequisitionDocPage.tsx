import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DocumentLayout from '../../components/layout/DocumentLayout';
import type { DocListItem, BreadcrumbItem } from '../../components/layout/DocumentLayout';
import { formConfigMap } from '../../config/formConfigs';
import { BREADCRUMBS } from '../../config/breadcrumbs';
import { useToast } from '../../contexts/ToastContext';
import {
  fetchRequisitionDocuments,
  fetchRequisitionDocument,
  fetchOrderForRequisition,
  saveRequisitionDocument,
  generateNextDocumentNumber,
  type RequisitionDocument,
} from '../../services/requisitionAPI';
import { getErrorMessage } from '../../utils/errors';

const routeToDocType: Record<string, string> = {
  '/orders/create': 'SOA',
  '/orders/issue': 'SIA',
  '/orders/issue-b': 'SIB',
  '/orders/repair': 'SIP',
  '/orders/dispatch-order': 'SIS',
};

export default function RequisitionDocPage() {
  const location = useLocation();
  const docType = routeToDocType[location.pathname] || 'SOA';
  return <RequisitionDocWorkspace key={docType} docType={docType} />;
}

function RequisitionDocWorkspace({ docType }: { docType: string }) {
  const { showToast } = useToast();
  const formConfig = formConfigMap[docType];

  const [docList, setDocList] = useState<DocListItem[]>([]);
  const [selectedDocNo, setSelectedDocNo] = useState('');
  const [docDetail, setDocDetail] = useState<RequisitionDocument | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const [listRefreshVersion, setListRefreshVersion] = useState(0);
  const [loadedListKey, setLoadedListKey] = useState('');
  const [loadedDetailNo, setLoadedDetailNo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listKey = `${docType}:${page}:${search}:${listRefreshVersion}`;
  const loading = formConfig?.apiType === 'none' ? false : loadedListKey !== listKey;
  const detailLoading = actionLoading || Boolean(selectedDocNo && loadedDetailNo !== selectedDocNo);

  const groupLabel = 'Order Lines & Issues';
  const itemLabel = formConfig?.titleTh || docType;

  const breadcrumb: BreadcrumbItem[] = BREADCRUMBS.DOCUMENT(groupLabel, itemLabel, docType);

  const hasPhoto = formConfig?.hasPhoto;

  useEffect(() => {
    if (formConfig?.apiType === 'none') return;
    let cancelled = false;
    fetchRequisitionDocuments(docType, { page, limit: 50, search })
      .then(response => {
        if (cancelled) return;
        const mappedList = response.data.map(d => ({
          no: d.DocuNo,
          date: d.DocuDate ? formatDateDDMMYYYY(d.DocuDate) : '',
          status: d.DocuStatus,
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
  }, [docType, page, search, listKey, formConfig?.apiType]);

  const loadDocList = () => setListRefreshVersion(version => version + 1);

  useEffect(() => {
    if (!selectedDocNo) return;
    let cancelled = false;
    fetchRequisitionDocument(selectedDocNo)
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

  const handleFetchRef = async (refNo: string) => {
    if (!refNo.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const data = await fetchOrderForRequisition(refNo);
      setDocDetail({
        header: {
          ...data.header,
          DocuDate: new Date().toISOString(),
          DocuNo: 'NEW',
        },
        lines: data.lines.map((line, index) => ({
          ...line,
          ListNo: index + 1,
          GoodQty: Number(line.ItemQty ?? 0),
        }))
      });
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Failed to fetch reference'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClear = async () => {
    if (isEditing && selectedDocNo) {
      await fetch('/api/lock/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docNo: selectedDocNo, user: 'Staff' })
      }).catch(e => console.error(e));
    }
    setIsEditing(false);
    setSelectedDocNo('');
    setDocDetail(null);
    setError(null);
  };

  const handleNew = async () => {
    setActionLoading(true);
    try {
      const nextNo = await generateNextDocumentNumber(docType);
      setSelectedDocNo('');
      setDocDetail({
        header: {
          DocuNo: nextNo,
          DocuDate: new Date().toISOString(),
          DocuStatus: 'N'
        },
        lines: []
      });
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Failed to generate new document'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDocNo) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/lock/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docNo: selectedDocNo, user: 'Staff' })
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(`Cannot edit: ${json.error} (Locked by ${json.lockedBy || 'someone'})`, 'error');
        return;
      }
      setIsEditing(true);
    } catch (requestError: unknown) {
      showToast('Failed to acquire lock: ' + getErrorMessage(requestError, 'Unknown error'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async () => {
    if (!docDetail?.header) return;

    if (formConfig?.apiType === 'none') {
      showToast('System in development phase (UI Only)', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        docType: docType,
        header: docDetail.header,
        lines: docDetail.lines
      };
      await saveRequisitionDocument(payload);
      showToast('Document saved successfully!', 'success');
      handleClear();
      loadDocList();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Failed to save document'));
    } finally {
      setActionLoading(false);
    }
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
      hasPhoto={hasPhoto}
      isEditing={isEditing}
      onNew={handleNew}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleClear}
      onFetchRef={handleFetchRef}
    />
  );
}
