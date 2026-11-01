import { fetchWithAuth } from '../utils/fetchWithAuth';
const API_BASE = '/api/requisition';

export interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
}

export type RequisitionRecord = Record<string, unknown>;

export interface RequisitionDocument {
  header: RequisitionRecord;
  lines: RequisitionRecord[];
}

export interface SaveRequisitionRequest extends RequisitionDocument {
  docType: string;
}

export interface RequisitionListItem extends RequisitionRecord {
  DocuNo: string;
  DocuDate?: string;
  DocuStatus?: string;
}

export interface RequisitionListResponse {
  data: RequisitionListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchRequisitionDocuments(docType: string, params?: FetchParams): Promise<RequisitionListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.search) query.append('search', params.search);

  const res = await fetchWithAuth(`${API_BASE}/documents/${encodeURIComponent(docType)}?${query.toString()}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { data: json.data, total: json.total, page: json.page, totalPages: json.totalPages } as RequisitionListResponse;
}

export async function fetchRequisitionDocument(docuNo: string): Promise<RequisitionDocument> {
  const res = await fetchWithAuth(`${API_BASE}/document/${encodeURIComponent(docuNo)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { header: json.header, lines: json.lines } as RequisitionDocument;
}

export async function fetchOrderForRequisition(ordNo: string): Promise<RequisitionDocument> {
  const res = await fetchWithAuth(`${API_BASE}/order/${encodeURIComponent(ordNo)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { header: json.header, lines: json.lines } as RequisitionDocument;
}

export async function saveRequisitionDocument(data: SaveRequisitionRequest) {
  const res = await fetchWithAuth(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json;
}

export async function generateNextDocumentNumber(docType: string): Promise<string> {
  const res = await fetchWithAuth(`${API_BASE}/next-number/${encodeURIComponent(docType)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}
