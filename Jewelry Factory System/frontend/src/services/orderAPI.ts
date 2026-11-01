import { API_BASE_URL } from '../config/api';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { getErrorMessage } from '../utils/errors';
// src/services/orderAPI.ts

export interface OrderSummary {
  Week: string | null;
  OrdNo: string;
  CustCode: string | null;
  ShipTo: string | null;
  CustName: string | null;
  PONo: string | null;
  OrdKind: string | null;
  OrdMat: string | null;
  DueDate: string | null;
  OrdDate: string | null;
  CustDueDate: string | null;
  OrdStatus: string | null;
  TotalQty: number;
  NumSKU: number;
  Amount: number | null;
  SampleItemNo: string | null; // ItemNo ตัวแทนของกลุ่ม (ใช้Assembly URL รูปfrom network path)
  TrackTest: string | null;
  OrdSGS: string | null;
  CustQCDate: string | null;
  OORDate: string | null;
  CloseStatus: string | null;
  TrackRemark: string | null;
  // Sales Remarks (Production Data)
  ReceiveRemark: string | null;
  EnamelRemark: string | null;
  CrystalRemark: string | null;
  AssemblyRemark: string | null;
  ShelfRemark: string | null;
  PackRemark: string | null;
  ProductionRemark: string | null;

  // ─── PO2 / Meta (surfaced from SP) ───
  EXNo: string | null;          // PO2
  OrdMaker: string | null;      // Group

  // ─── Production stage pending qty (ตัวเลข; ติดDelete = ค้าง) ───
  StonePenQty: number | null;
  FitPenQty: number | null;     // Finding
  WijPenQty: number | null;     // Wax
  WstPenQty: number | null;     // Wax Set
  CastPenQty: number | null;
  ControlPenQty: number | null;
  GrindPenQty: number | null;
  PolishPenQty: number | null;
  PlatePenQty: number | null;   // Plating
  QCPenQty: number | null;
  UnFinishQty: number | null;
  FinishQty: number | null;
  ExportQty: number | null;     // Shipped
  BalQty: number | null;        // Balance
  ExpPct: number | null;        // % Shipped

  // ─── Track / QC / Pack (strings) ───
  BookDate: string | null;      // Book Inspect
  BookShip: string | null;
  QC1_Qty: string | null;
  QC1_Date: string | null;
  QC1_Fail: string | null;
  QC2_Qty: string | null;
  QC2_Date: string | null;
  QC2_Fail: string | null;
  QC3_Qty: string | null;
  QC3_Date: string | null;
  PackCard: string | null;      // 1. Card/Box
  TickOrd: string | null;       // 2. Order Ticket/Label
  TickRec: string | null;       // 3. Receive Ticket/Label
  TrackSam: string | null;      // 4. Sample
  TrackCT: string | null;       // 5. Cust CT
  TrackMF: string | null;       // 6. MF
  PackScanDo: string | null;    // 7. Day to Do Pack Scan
  PackScanSen: string | null;   // 8. Pack Scan Send Cust
  PackScanAppv: string | null;  // 9. Pack Scan Approved on
  PackScanMF: string | null;    // 10. Pack Scan Photo on MF
  PolyOrd: string | null;       // 4. Order Polybag
  PolyRec: string | null;       // 5. Receive Polybag
  TagRcyRec: string | null;     // 6. Receive Recycled Tag U413
  ProdRiskIssue: string | null; // Production Risky Issue
  PQCPlanShip: string | null;   // PQC Plan Ship
}

// number|null helper สำหรับ pending-qty (คงค่า 0 ไว้, กัน NaN)
const num = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const x = Number(v);
  return isNaN(x) ? null : x;
};

type RawOrderSummary = Record<string, string | null | undefined>;

export const fetchOrders = async (params: { status?: 'pending' | 'finish' | 'all', dateType?: string, dateFrom?: string, dateTo?: string, noCache?: boolean }): Promise<{ ok: boolean; data: OrderSummary[]; error?: string }> => {
  try {
    const baseUrl = `${API_BASE_URL}/orders`;
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.dateType) queryParams.append('dateType', params.dateType);
    if (params.noCache) queryParams.append('noCache', '1');
    queryParams.append('_t', Date.now().toString());

    const url = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;

    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();

    // Waitงรับกรณี Backend Sendมาเป็น Array ตรงๆ หรือSendมาเป็น { ok: true, data: [...] }
    const rawData = Array.isArray(result) ? result : (Array.isArray(result.data) ? result.data : []);

    // ⭐️ DATA MAPPING: ดักจับชื่อ Key เผื่อ Backend (C#) Sendมาเป็นตัวPrintเล็ก
    const mappedData: OrderSummary[] = (rawData as RawOrderSummary[]).map((item) => ({
      Week: item.OrdWeek || item.Week || item.week || '-',
      OrdNo: item.OrdNo || item.ordNo || item.ord_no || '-',
      CustCode: item.CustCode || item.custCode || '-',
      ShipTo: item.CustMultiAddr || item.custMultiAddr || item.ShipTo || item.shipTo || '-',
      CloseStatus: item.CloseStatus || item.CloseStatus || null,
      CustName: item.CustName || item.custName || '-',
      PONo: item.PONo || item.poNo || item.po_no || '-',
      OrdKind: item.OrdKind || item.ordKind || '-',
      OrdMat: item.OrdMat || item.ordMat || '-',
      DueDate: item.DueDate || item.dueDate || null,
      OrdDate: item.OrdDate || item.ordDate || null,
      CustDueDate: item.CustDueDate || item.custDueDate || null,
      OrdStatus: item.CloseStatus || item.closestatus || item.status || null,
      TotalQty: Number(item.SumQty || item.sumQty || item.TotalQty || item.totalQty || 0),
      NumSKU: Number(item.SumItem || item.sumItem || item.NumSKU || 0),
      Amount: Number(item.SumAmnt || item.sumAmnt || item.Amount || item.amount || 0),
      SampleItemNo: item.SampleItemNo || item.sampleItemNo || null,
      TrackTest: item.TrackTest || '-',
      OrdSGS: item.OrdSGS || '-',
      CustQCDate: item.CustQCDate || null,
      OORDate: item.OORDate || null,
      TrackRemark: item.TrackRemark || item.remark || '-',

      // Sales Remarks (Production Data)
      ReceiveRemark: item.ReceiveRemark || item.receiveRemark || null,
      EnamelRemark: item.EnamelRemark || item.enamelRemark || null,
      CrystalRemark: item.CrystalRemark || item.crystalRemark || null,
      AssemblyRemark: item.AssemblyRemark || item.assemblyRemark || null,
      ShelfRemark: item.ShelfRemark || item.shelfRemark || null,
      PackRemark: item.PackRemark || item.packRemark || null,
      ProductionRemark: item.ProductionRemark || item.productionRemark || null,

      // ─── PO2 / Meta ───
      EXNo: item.EXNo || item.exNo || null,
      OrdMaker: item.OrdMaker || item.ordMaker || null,

      // ─── Production stage pending qty ───
      StonePenQty: num(item.StonePenQty),
      FitPenQty: num(item.FitPenQty),
      WijPenQty: num(item.WijPenQty),
      WstPenQty: num(item.WstPenQty),
      CastPenQty: num(item.CastPenQty),
      ControlPenQty: num(item.ControlPenQty),
      GrindPenQty: num(item.GrindPenQty),
      PolishPenQty: num(item.PolishPenQty),
      PlatePenQty: num(item.PlatePenQty),
      QCPenQty: num(item.QCPenQty),
      UnFinishQty: num(item.UnFinishQty),
      FinishQty: num(item.FinishQty),
      ExportQty: num(item.ExportQty),
      BalQty: num(item.BalQty),
      ExpPct: num(item.ExpPct),

      // ─── Track / QC / Pack ───
      BookDate: item.BookDate || null,
      BookShip: item.BookShip || null,
      QC1_Qty: item.QC1_Qty || null,
      QC1_Date: item.QC1_Date || null,
      QC1_Fail: item.QC1_Fail || null,
      QC2_Qty: item.QC2_Qty || null,
      QC2_Date: item.QC2_Date || null,
      QC2_Fail: item.QC2_Fail || null,
      QC3_Qty: item.QC3_Qty || null,
      QC3_Date: item.QC3_Date || null,
      PackCard: item.PackCard || null,
      TickOrd: item.TickOrd || null,
      TickRec: item.TickRec || null,
      TrackSam: item.TrackSam || null,
      TrackCT: item.TrackCT || null,
      TrackMF: item.TrackMF || null,
      PackScanDo: item.PackScanDo || null,
      PackScanSen: item.PackScanSen || null,
      PackScanAppv: item.PackScanAppv || null,
      PackScanMF: item.PackScanMF || null,
      PolyOrd: item.PolyOrd || null,
      PolyRec: item.PolyRec || null,
      TagRcyRec: item.TagRcyRec || null,
      ProdRiskIssue: item.ProdRiskIssue || null,
      PQCPlanShip: item.PQCPlanShip || null,
    }));

    return { ok: true, data: mappedData };

  } catch (error: unknown) {
    console.error("Error fetching orders:", error);
    return { ok: false, data: [], error: getErrorMessage(error, 'Failed to fetch') };
  }
};
