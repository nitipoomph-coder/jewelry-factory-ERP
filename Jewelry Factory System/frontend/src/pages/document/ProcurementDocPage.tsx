import { formatDateDDMMYYYY } from '../../utils/dateUtils';
// color-lint-ignore-file: print-only output requires fixed black and white ink colors.
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DocumentLayout from '../../components/layout/DocumentLayout';
import { StonePOWorkspace } from '../../components/document/StonePOWorkspace';
import type { DocListItem, BreadcrumbItem } from '../../components/layout/DocumentLayout';
import { formConfigMap } from '../../config/formConfigs';
import { BREADCRUMBS } from '../../config/breadcrumbs';
import { useToast } from '../../contexts/ToastContext';
import {
  fetchDocumentList,
  fetchDocumentDetail,
  generateNextDocumentNumber,
  updateDocumentHeader,
} from '../../services/procurementAPI';
import type { ProcDocDetail, ProcDocHeader, ProcDocLine } from '../../services/procurementAPI';
import { getErrorMessage } from '../../utils/errors';

// ─── Route → docType mapping ──────────────────
const routeToDocType: Record<string, string> = {
  '/procurement/purchase': 'SPA',
  '/procurement/receive': 'SRA',
  '/procurement/receive-b': 'SRB',
  '/procurement/return': 'SIR',
};

export default function ProcurementDocPage() {
  const location = useLocation();
  const docType = routeToDocType[location.pathname] || 'SPA';
  return <ProcurementDocWorkspace key={docType} docType={docType} />;
}

function ProcurementDocWorkspace({ docType }: { docType: string }) {
  const { showToast } = useToast();
  const formConfig = formConfigMap[docType];

  const [docList, setDocList] = useState<DocListItem[]>([]);
  const [selectedDocNo, setSelectedDocNo] = useState('');
  const [docDetail, setDocDetail] = useState<ProcDocDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const [listRefreshVersion, setListRefreshVersion] = useState(0);
  const [loadedListKey, setLoadedListKey] = useState('');
  const [loadedDetailNo, setLoadedDetailNo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listKey = `${docType}:${page}:${search}:${listRefreshVersion}`;
  const loading = loadedListKey !== listKey;
  const detailLoading = actionLoading || Boolean(selectedDocNo && loadedDetailNo !== selectedDocNo);

  const groupLabel = 'Procurement & Receiving';
  const itemLabel = formConfig?.titleTh || docType;

  const breadcrumb: BreadcrumbItem[] = BREADCRUMBS.DOCUMENT(groupLabel, itemLabel, docType);

  // ─── Load document list ─────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchDocumentList(docType, { page, limit: 50, search })
      .then(response => {
        if (cancelled) return;
        const mappedList = response.data.map(d => ({
          no: d.docNumber,
          date: d.docDate,
          status: d.status,
        }));
        setDocList(mappedList);
        setTotalPages(response.totalPages || 1);
        setSelectedDocNo(current => current || mappedList[0]?.no || '');
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getErrorMessage(requestError, 'Failed to load document list'));
      })
      .finally(() => {
        if (!cancelled) setLoadedListKey(listKey);
      });
    return () => { cancelled = true; };
  }, [docType, page, search, listKey]);

  useEffect(() => {
    if (!selectedDocNo) return;
    let cancelled = false;
    fetchDocumentDetail(selectedDocNo)
      .then(nextDetail => {
        if (cancelled) return;
        setDocDetail(nextDetail);
        setLoadedDetailNo(selectedDocNo);
        setIsEditing(false);
        setEditDraft({});
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(requestError, 'Failed to load document'));
        setDocDetail(null);
        setLoadedDetailNo(selectedDocNo);
      });
    return () => { cancelled = true; };
  }, [selectedDocNo]);

  const handleSelectDoc = (docNo: string) => {
    setSelectedDocNo(docNo);
    setIsEditing(false);
    setEditDraft({});
  };

  const loadDocList = () => setListRefreshVersion(version => version + 1);

  // ─── Handlers ───────────────────────────────

  const handleNew = async () => {
    setActionLoading(true);
    try {
      const nextNo = await generateNextDocumentNumber(docType);
      setSelectedDocNo('');
      setIsEditing(true);
      const newHeader: ProcDocHeader = {
        docNumber: nextNo,
        docDate: formatDateDDMMYYYY(new Date()),
        purchaseDate: '',
        dueDate: '',
        receiveDate: '',
        supplierCode: '',
        supplierName: '',
        buyer: '',
        currency: 'THB',
        exchangeRate: 1,
        totalQty: 0,
        totalAmount: 0,
        refNumber: '',
        billNumber: '',
        invoiceNumber: '',
        remark: '',
        category: '',
        status: 'N',
      };
      setDocDetail({ header: newHeader, lines: [] });
      setEditDraft(Object.fromEntries(
        Object.entries(newHeader).map(([k, v]) => [k, String(v)])
      ));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Failed to generate new document'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditDraft(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleEdit = async () => {
    if (!selectedDocNo) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/lock/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docNo: selectedDocNo, user: 'Staff' }),
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(`Cannot edit: ${json.error} (Locked by ${json.lockedBy || 'someone'})`, 'error');
        return;
      }
      if (docDetail?.header) {
        setEditDraft(Object.fromEntries(
          Object.entries(docDetail.header).map(([k, v]) => [k, String(v ?? '')])
        ));
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
    setActionLoading(true);
    try {
      const updatedHeader: ProcDocHeader = {
        ...docDetail.header,
        ...editDraft,
        exchangeRate: Number(editDraft.exchangeRate ?? docDetail.header.exchangeRate),
        totalQty: Number(editDraft.totalQty ?? docDetail.header.totalQty),
        totalAmount: Number(editDraft.totalAmount ?? docDetail.header.totalAmount),
      };
      await updateDocumentHeader(selectedDocNo, updatedHeader);

      await fetch('/api/lock/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docNo: selectedDocNo, user: 'Staff' }),
      }).catch(e => console.error('Lock release error:', e));

      setDocDetail(prev => prev ? { ...prev, header: updatedHeader } : null);
      setIsEditing(false);
      setEditDraft({});
      loadDocList();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Save failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (isEditing && selectedDocNo) {
      await fetch('/api/lock/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docNo: selectedDocNo, user: 'Staff' }),
      }).catch(e => console.error(e));
    }
    setIsEditing(false);
    setEditDraft({});
    setSelectedDocNo('');
    setDocDetail(null);
  };

  // ─── Print Template ──────────────────────────
  const getPrintTemplate = () => {
    if (!docDetail) return null;
    const lines = docDetail.lines || [];
    const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
    const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0);

    return (
      <div className="print-only" style={{ color: '#000000', backgroundColor: '#ffffff', padding: '0px', fontFamily: '"Arial", "Prompt", sans-serif' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* คอลัมน์ฝั่งซ้าย: โลโก้andข้อมูDeleteริษัท ใช้ Flexbox Arrangeเรียง */}
              <td colSpan={2} style={{ border: '1.5px solid #000000', padding: '12px 16px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img
                    src="/iconCLL.jpg"
                    alt="Company Logo"
                    style={{ height: '60px', width: 'auto', objectFit: 'contain' }}
                  />
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
                      Jewelry Factory Co., Ltd.
                    </div>
                    <div style={{ fontSize: '11px', color: '#333333', marginTop: '4px' }}>
                      224, 224/10 Moo.7 Samrong Nuea, Mueang Samut Prakan, Samut Prakan 10270 Thailand
                    </div>
                    <div style={{ fontSize: '11px', color: '#333333' }}>
                      Tel: 66-2-7540596 &nbsp;&nbsp;Email: hello@clljewelry.com &nbsp;&nbsp;Website: www.clljewelry.com
                    </div>
                  </div>
                </div>
              </td>
              {/* คอลัมน์ฝั่งขวา: ประเภทDocument */}
              <td style={{ border: '1px solid #000000', width: '30%', padding: '10px', textAlign: 'center', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  {docType === 'SPA' ? 'Purchase Order' : (docType === 'SRA' || docType === 'SRB') ? 'Goods Receipt' : 'Goods Return'}
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000000', width: '70px', padding: '6px', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#f0f0f0', fontSize: '11px', fontWeight: 'bold' }}>
                Supply
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px 12px', verticalAlign: 'middle', fontSize: '12px', fontWeight: 'bold' }}>
                <span style={{ fontFamily: 'monospace', letterSpacing: '1px', marginRight: '24px' }}>
                  {docDetail.header.supplierCode}
                </span>
                <span>{docDetail.header.supplierName}</span>
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px 12px', verticalAlign: 'middle', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                Order No : {docDetail.header.docNumber}
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', borderTop: 'none', tableLayout: 'fixed', textAlign: 'center', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '12.5%' }}>
                {docType === 'SPA' ? 'Order Date' : (docType === 'SIR' ? 'Return Date' : 'Rec Date')}
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '12.5%' }}>
                {docType === 'SPA' ? 'Due Date' : 'Doc Date'}
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '15%' }}>
                {docType === 'SPA' ? 'Ship Via' : 'Ref No'}
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '10%' }}>
                {docType === 'SPA' ? 'Order By' : (docType === 'SIR' ? 'Return By' : 'Rec By')}
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '12.5%' }}>Approved By</td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '12.5%' }}>Total Qty</td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '15%' }}>Total Amount</td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '10%' }}>Currency</td>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 'bold', fontSize: '11px', height: '24px' }}>
              <td style={{ border: '1px solid #000000', padding: '4px' }}>{docDetail.header.docDate}</td>
              <td style={{ border: '1px solid #000000', padding: '4px' }}>
                {docType === 'SPA' ? (docDetail.header.dueDate || docDetail.header.docDate) : docDetail.header.docDate}
              </td>
              <td style={{ border: '1px solid #000000', padding: '4px', fontFamily: 'monospace' }}>
                {docType === 'SPA' ? '' : (docDetail.header.refNumber || '')}
              </td>
              <td style={{ border: '1px solid #000000', padding: '4px' }}>{docDetail.header.buyer || 'POR'}</td>
              <td style={{ border: '1px solid #000000', padding: '4px' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000000', padding: '4px', fontFamily: 'monospace' }}>
                {totalQty.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td style={{ border: '1px solid #000000', padding: '4px', fontFamily: 'monospace' }}>
                {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
              </td>
              <td style={{ border: '1px solid #000000', padding: '4px', fontFamily: 'monospace' }}>{docDetail.header.currency}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', borderTop: 'none', tableLayout: 'fixed', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center', height: '22px' }}>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '3.5%', padding: '2px' }}>No</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '23%', padding: '2px' }}>Color</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '12%', padding: '2px' }}>Shape</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '6%', padding: '2px' }}>Size</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '15%', padding: '2px' }}>Cut</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '5%', padding: '2px' }}>Grade</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '7%', padding: '2px' }}>Quantity</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '5%', padding: '2px' }}>Unit</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '8%', padding: '2px' }}>Price</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '10%', padding: '2px' }}>CLL PO</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '8%', padding: '2px' }}>Ct Wt</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '8%', padding: '2px' }}>Price/Ct</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line: ProcDocLine, idx: number) => {
              const currency = docDetail.header.currency || 'THB';
              const curSymbol = currency === 'USD' ? '$' : currency === 'THB' ? '฿' : currency === 'EUR' ? '€' : currency;
              return (
                <tr key={idx} style={{ height: '36px', verticalAlign: 'middle' }}>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '4px 2px' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #000000', padding: '4px 6px', lineHeight: '1.2' }}>
                    <div style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{line.stoneCode}</div>
                    <div style={{ fontSize: '9px', color: '#333333' }}>{line.stoneName || line.stoneCode}</div>
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '4px 6px', lineHeight: '1.2' }}>
                    <div style={{ fontWeight: 'bold' }}>{line.shape}</div>
                    <div style={{ fontSize: '8.5px', color: '#333333', textTransform: 'capitalize' }}>{line.shapeName || '—'}</div>
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '4px 2px', fontWeight: 'bold' }}>{line.size || '—'}</td>
                  <td style={{ border: '1px solid #000000', padding: '4px 6px', lineHeight: '1.2' }}>
                    <div style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{line.characteristic}</div>
                    <div style={{ fontSize: '8.5px', color: '#333333' }}>{line.specName || '—'}</div>
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '4px 2px', fontWeight: 'bold' }}>{line.grade || '—'}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace' }}>{(line.qty || 0).toLocaleString()}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '4px 2px' }}>{line.unit || 'PCS'}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    <span style={{ float: 'left', marginRight: '2px', fontSize: '9px', fontWeight: 'normal' }}>{curSymbol}</span>
                    <span>{Number(line.price || 0).toFixed(4)}</span>
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '4px 6px', lineHeight: '1.2', fontFamily: 'monospace' }}>
                    <div style={{ fontWeight: 'bold' }}>{line.orderNumber || ''}</div>
                    <div style={{ fontSize: '9px', fontWeight: 'normal', color: '#333333' }}>{line.customer || ''}</div>
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace' }}>{Number(line.weight || 0).toFixed(4)}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace' }}>{Number(line.ctPerPc || 0).toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px' }}>
          <div>( R75-413-A1 )</div>
          <div style={{ fontFamily: 'monospace' }}>Page &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1 / 1</div>
        </div>
      </div>
    );
  };

  if (docType === 'SPA') {
    return (
      <StonePOWorkspace
        docList={docList}
        selectedDocNo={selectedDocNo}
        onSelectDoc={handleSelectDoc}
        docDetail={docDetail}
        loading={loading}
        detailLoading={detailLoading}
        error={error}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        search={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
      />
    );
  }

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
        if (text.trim()) handleSelectDoc(text.trim());
      }}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      docDetail={docDetail}
      loading={loading}
      detailLoading={detailLoading}
      error={error}
      onClearError={() => setError(null)}
      hasPhoto={false}
      isEditing={isEditing}
      editDraft={editDraft}
      onFieldChange={handleFieldChange}
      onNew={handleNew}
      onSave={handleSave}
      onEdit={handleEdit}
      onCancel={handleCancel}
      printTemplate={getPrintTemplate()}
    />
  );
}
