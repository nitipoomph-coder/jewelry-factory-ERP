import { fetchWithAuth } from '../utils/fetchWithAuth';
import { API_BASE_URL } from '../config/api';
// src/services/poTrackerAPI.ts

export const BASE_URL = API_BASE_URL;

export interface OrderSummary {
  // ── existing ──────────────────────────────────────────────
  OrdNo: string;
  OrdDate: string;
  DueDate: string;
  CustCode: string;
  CustName: string;
  PONo: string;
  OrdMat: string;
  OrdKind: string;           // New / Replen
  CustMultiAddr: string;     // Ship To
  OrdStatus: string;
  CloseStatus: string;
  TotalQty: number;
  TotalAmount: number;
  CurrCode: string;
  Week: string;
  CastStatus: string | null;
  PolishStatus: string | null;
  PlateStatus: string | null;
  AssemStatus: string | null;
  QCStatus: string | null;
  LineCount: number;
  SumItem: number;           // No. of SKU

  // ── dates ─────────────────────────────────────────────────
  CustQCDate: string | null;   // QC Date
  CustDueDate: string | null;  // Cust Due Date

  // ── from OrdTrackDT ───────────────────────────────────────
  OrdSGS: string | null;       // SGS date
  TrackTest: string | null;    // QA/BBQ/Testing date
  OORDate: string | null;      // OOR Date
  BookDate: string | null;     // Booking Date

  QC1_Qty: number | null;
  QC1_Date: string | null;
  QC1_Fail: number | null;

  QC2_Qty: number | null;
  QC2_Date: string | null;
  QC2_Fail: number | null;

  QC3_Qty: number | null;
  QC3_Date: string | null;

  // ── production pending qty ────────────────────────────────
  PolishPenQty: number | null;  // PST column
  PlatePenQty: number | null;   // PC1 column
}

export interface ProcessInfo {
  qty: number | null;
  status: string | null;
}

export interface OrderLine {
  LineNo: number;
  ItemNo: string;
  ItemDesc: string;
  ItemMat: string;
  ItemSize: string;
  Qty: number;
  Price: number;
  Amount: number;
  FinishQty: number | null;
  FinishStatus: string | null;
  ItemStatus: string | null;
  processes: {
    Cast: ProcessInfo;
    Grind: ProcessInfo;
    Polish: ProcessInfo;
    Set: ProcessInfo;
    Epox: ProcessInfo;
    Plate: ProcessInfo;
    Assem: ProcessInfo;
    QC: ProcessInfo;
    Pack: ProcessInfo;
  };
}

export interface OrderHeader {
  OrdNo: string;
  OrdDate: string;
  DueDate: string;
  CustCode: string;
  CustName: string;
  PONo: string;
  OrdMat: string;
  OrdStatus: string;
  CloseStatus: string;
  TotalQty: number;
  TotalAmount: number;
  CurrCode: string;
}

export interface OrderDetail {
  header: OrderHeader;
  lines: OrderLine[];
  lineCount: number;
}

// ─── fetchOrders ──────────────────────────────────────────────────────────────
export async function fetchOrders(params?: {
  status?: 'pending' | 'all';
  custCode?: string;
  dateType?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ ok: boolean; data: OrderSummary[]; count: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.custCode) qs.set('custCode', params.custCode);
  if (params?.dateType) qs.set('dateType', params.dateType);
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.set('dateTo', params.dateTo);

  const res = await fetchWithAuth(`${BASE_URL}/orders?${qs}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  // backend Send { ok, data, count }
  return { ok: json.ok ?? true, data: json.data ?? [], count: json.count ?? 0 };
}

// ─── fetchOrderDetail (by OrdNo) ──────────────────────────────────────────────
export async function fetchOrderDetail(ordNo: string, qsParams?: URLSearchParams): Promise<OrderDetail> {
  const queryStr = qsParams ? `?${qsParams.toString()}` : '';
  const res = await fetchWithAuth(`${BASE_URL}/orders/${encodeURIComponent(ordNo)}${queryStr}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return await res.json();
}

// ─── fetchOrderByPo (by PONo) ─────────────────────────────────────────────────
// Key หลัก — ดึงทุก OrdNo ใต้ PONo เดียวกัน
export interface OrderDetailByPo {
  ok: boolean;
  header: OrderHeader & {
    PONo: string;
    OrdNos: string[];    // Item OrdNo Allใต้ PO นี้
    OrdKind: string | null;
    Week: string | null;
  };
  lines: (OrderLine & { OrdNo: string })[];
  lineCount: number;
  ordCount: number;
}

export async function fetchOrderByPo(poNo: string, qsParams?: URLSearchParams): Promise<OrderDetailByPo> {
  const queryStr = qsParams ? `?${qsParams.toString()}` : '';
  const res = await fetchWithAuth(`${BASE_URL}/orders/by-po/${encodeURIComponent(poNo)}${queryStr}`);
  if (!res.ok) throw new Error(`API error ${res.status} — PO "${poNo}" not found`);
  return await res.json();
}

// ─── fetchOrderByGroup ────────────────────────────────────────────────────────
export async function fetchOrderByGroup(cust: string, addr: string, kind: string, mat: string, duedate: string, qsParams?: URLSearchParams): Promise<OrderDetailByPo> {
  const path = [cust, encodeURIComponent(addr), encodeURIComponent(kind), encodeURIComponent(mat), encodeURIComponent(duedate)].join('/');
  const queryStr = qsParams ? `?${qsParams.toString()}` : '';
  const res = await fetchWithAuth(`${BASE_URL}/orders/group/${path}${queryStr}`);
  if (!res.ok) throw new Error(`API error ${res.status} — Group data not found`);
  return await res.json();
}

// ─── fetchSearch (Global Search) ──────────────────────────────────────────────
export interface SearchResultItem {
  id: string;
  type: 'order' | 'item' | 'customer';
  title: string;
  sub: string;
  path: string;
  itemNo?: string | null;
}

export async function fetchSearch(query: string, type?: string): Promise<SearchResultItem[]> {
  const qs = new URLSearchParams();
  qs.set('q', query);
  if (type && type !== 'all') qs.set('type', type);

  const res = await fetchWithAuth(`${BASE_URL}/search?${qs.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

// ─── updateOrderRemarks (Save Sales & Production Remarks) ─────────────────────
export async function updateOrderRemarks(payload: {
  OrdNo: string;
  LineNo: number;
  RecRemark: string;
  EnaRemark: string;
  CryRemark: string;
  AsmRemark: string;
  ShfRemark: string;
  PkRemark: string;
  ProdRemark: string;
}): Promise<{ ok: boolean }> {
  const res = await fetchWithAuth(`${BASE_URL}/orders/remarks`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return await res.json();
}