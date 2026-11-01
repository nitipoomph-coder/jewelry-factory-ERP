// ============================================
// Form configuration per document type
// Defines field layouts based on legacy system screenshots
// ============================================

export interface FormFieldDef {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'select';
  readOnly?: boolean;
  options?: string[];
  colSpan?: number;
  hasSearch?: boolean;
}

export interface TableColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface FormConfig {
  code: string;
  titleTh: string;
  groupLabel: string;                                    // Menu group name e.g. 'Procurement & Receiving'
  apiType: 'procurement' | 'requisition' | 'sample' | 'none'; // Specify backend API used
  hasPhoto?: boolean;                                    // แสดง photo panel (เฉพาะ SOA)
  headerFields: FormFieldDef[];
  stoneFields?: FormFieldDef[];
  tableColumns: TableColumnDef[];
  footerStats?: string[];
}

// ============================================
// SPA — Purchase Stone (ref: legacy screenshot)
// ============================================
const spaConfig: FormConfig = {
  code: 'SPA',
  titleTh: 'Purchase Stone',
  groupLabel: 'Procurement & Receiving',
  apiType: 'procurement',
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
    { name: 'dueDate', label: 'Due Date', type: 'date' },
    { name: 'totalQty', label: 'Total', type: 'number' },
    { name: 'supplierCode', label: 'Supplier', hasSearch: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'currency', label: 'Currency', type: 'select', options: ['THB', 'USD'] },
    { name: 'receiveDate', label: 'Receive Date', type: 'date' },
    { name: 'totalMoney', label: 'Total Amount', type: 'number' },
  ],
  stoneFields: [
    { name: 'color', label: 'Color' },
    { name: 'shape', label: 'Shape' },
    { name: 'size', label: 'Size' },
    { name: 'characteristic', label: 'Characteristic', type: 'select', options: ['FAC', 'CAB'] },
    { name: 'grade', label: 'Grade', type: 'select', options: ['A', 'B', 'C'] },
    { name: 'height', label: 'Height' },
    { name: 'stoneName', label: 'Stone', colSpan: 2 },
    { name: 'unit', label: 'Unit' },
    { name: 'pricePerCarat', label: 'Price/Ct', type: 'number' },
    { name: 'lastPrice', label: 'Last Price', type: 'number' },
    { name: 'weight', label: 'Weight', type: 'number' },
    { name: 'orderNumber', label: 'Order', colSpan: 2 },
    { name: 'jobNumber', label: 'Job No.' },
    { name: 'useStone', label: 'UseStone', type: 'number' },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'totalAmnt', label: 'Total', type: 'number' },
    { name: 'remark1', label: 'Remark 1', colSpan: 6 },
    { name: 'remark2', label: 'Remark 2', colSpan: 6 },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'stoneCode', label: 'Stone' },
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
    { key: 'size', label: 'Size(mm.)' },
    { key: 'char', label: 'Characteristic' },
    { key: 'grade', label: 'Grade' },
    { key: 'order', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'height', label: 'Height(mm).)' },
    { key: 'pricePerCt', label: 'Price/Ct', align: 'right' },
    { key: 'ctPerPc', label: 'Ct/Pc', align: 'right' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'total', label: 'Total Amount', align: 'right' },
  ],
  footerStats: ['Item', 'Total Qty', 'Total Value'],
};

// ============================================
// SRA — SaveReceiveStone (ref: legacy screenshot)
// ============================================
const sraConfig: FormConfig = {
  code: 'SRA',
  titleTh: 'SaveReceiveStone',
  groupLabel: 'Procurement & Receiving',
  apiType: 'procurement',
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'refNumber', label: 'Ref No.' },
    { name: 'receiptNumber', label: 'Receipt No.' },
    { name: 'supplierCode', label: 'Customer Code', hasSearch: true },
    { name: 'deliveryNote', label: 'Delivery Note' },
    { name: 'totalAmount', label: 'Total', type: 'number' },
    { name: 'reason', label: 'Reason', colSpan: 2 },
    { name: 'currency', label: 'Currency', type: 'select', options: ['THB', 'USD'] },
    { name: 'totalMoney', label: 'Total Amount', type: 'number' },
  ],
  stoneFields: [
    { name: 'color', label: 'Color' },
    { name: 'shape', label: 'Shape' },
    { name: 'size', label: 'Size' },
    { name: 'characteristic', label: 'Characteristic', type: 'select', options: [''] },
    { name: 'grade', label: 'Grade' },
    { name: 'stoneName', label: 'Stone' },
    { name: 'warehouse', label: 'Warehouse' },
    { name: 'unit', label: 'Unit' },
    { name: 'height', label: 'Height' },
    { name: 'weight', label: 'Weight', type: 'number' },
    { name: 'dollarPerCt', label: '$/CT', type: 'number' },
    { name: 'subTotal', label: 'Subtotal', type: 'number' },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'total', label: 'Total', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'stone', label: 'Stone' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'gradeAmm', label: 'Height(mm.)' },
    { key: 'dollarCt', label: '$/CT', align: 'right' },
    { key: 'weight', label: 'Weight', align: 'right' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
  ],
  footerStats: ['Item', 'Total Qty', 'Total Value'],
};

// ============================================
// SRB — SaveReceiveStone B (same layout as SRA)
// ============================================
const srbConfig: FormConfig = {
  ...sraConfig,
  code: 'SRB',
  titleTh: 'SaveReceiveStone B',
  groupLabel: 'Procurement & Receiving',
  apiType: 'procurement',
};

// ============================================
// SIR — SaveReturnStone (has own SIRPage.tsx)
// ============================================
const sirConfig: FormConfig = {
  code: 'SIR',
  titleTh: 'SaveReturnStone',
  groupLabel: 'Procurement & Receiving',
  apiType: 'procurement',
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'refNumber', label: 'Doc No.Ref (SRA)', readOnly: true },
    { name: 'category', label: 'Category', type: 'select', options: ['A', 'B', 'C'] },
    { name: 'supplier', label: 'Supplier', colSpan: 2 },
    { name: 'currency', label: 'Currency', type: 'select', options: ['THB', 'USD'] },
    { name: 'exchangeRate', label: 'Exchange Rate', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'stoneCode', label: 'Stone Code' },
    { key: 'unit', label: 'Unit' },
    { key: 'grade', label: 'Height' },
    { key: 'weight', label: 'Weight', align: 'right' },
    { key: 'returnQty', label: 'Return', align: 'right' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'warehouse', label: 'Warehouse' },
  ],
  footerStats: ['Item', 'Total Qty', 'Total Value'],
};

// ============================================
// CHK-SPA — CheckReceiveStonefromPurchase (ref: legacy screenshot)
// ============================================
const chkSpaConfig: FormConfig = {
  code: 'CHK-SPA',
  titleTh: 'CheckReceiveStonefromPurchase',
  groupLabel: 'Check & Count Stock',
  apiType: 'none',
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
    { name: 'purchaseDateEnd', label: 'To Date', type: 'date' },
    { name: 'seller', label: 'Supplier' },
    { name: 'dueDate', label: 'Due Date', type: 'date' },
    { name: 'dueDateEnd', label: 'To Date', type: 'date' },
    { name: 'totalAmount', label: 'Total', type: 'number' },
    { name: 'buyer', label: 'Buyer' },
    { name: 'currency', label: 'Currency', type: 'select', options: ['THB', 'USD'] },
    { name: 'deadlineDate', label: 'Due Date', type: 'date' },
    { name: 'deadlineDateEnd', label: 'To Date', type: 'date' },
    { name: 'totalMoney', label: 'Total Amount', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'stone', label: 'Stone' },
    { key: 'color', label: 'Color' },
    { key: 'grade', label: 'Height' },
    { key: 'aRemain', label: 'A Remain', align: 'right' },
    { key: 'bRemain', label: 'B Remain', align: 'right' },
    { key: 'purchase', label: 'Purchase', align: 'right' },
    { key: 'receive', label: 'Receive', align: 'right' },
    { key: 'shortage', label: 'Shortage', align: 'right' },
    { key: 'status', label: 'Status' },
  ],
  footerStats: ['Item', 'Total Qty'],
};

// ============================================
// SOA — SaveOrderStone (ref: legacy screenshot)
// ============================================
const soaConfig: FormConfig = {
  code: 'SOA',
  titleTh: 'SaveOrderStone',
  groupLabel: 'Orderand requisition',
  apiType: 'requisition',
  hasPhoto: true,
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'orderNumber', label: 'Order No.' },
    { name: 'orderDate', label: 'Order Date', type: 'date' },
    { name: 'supplierCode', label: 'Customer Code', hasSearch: true },
    { name: 'dueDate', label: 'Due Date', type: 'date' },
    { name: 'poNumber', label: 'PO No.' },
    { name: 'itemCount', label: 'Item', type: 'number' },
    { name: 'jobNumber', label: 'Job No.' },
    { name: 'qty', label: 'Qty', type: 'number' },
    { name: 'stone', label: 'Stone' },
    { name: 'detail', label: 'Detail' },
  ],
  stoneFields: [
    { name: 'color', label: 'Color' },
    { name: 'shape', label: 'Shape' },
    { name: 'size', label: 'Size' },
    { name: 'characteristic', label: 'Characteristic', type: 'select', options: [''] },
    { name: 'grade', label: 'Grade' },
    { name: 'stoneName', label: 'Stone' },
    { name: 'stoneType', label: 'Category' },
    { name: 'stoneQty', label: 'Qty', type: 'number' },
    { name: 'useStone', label: 'UseStone' },
    { name: 'height', label: 'Height' },
    { name: 'sendGrade', label: 'Send', type: 'select', options: [''] },
    { name: 'note', label: 'Remark', colSpan: 2 },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'order', label: 'Order' },
    { key: 'group', label: 'Group' },
    { key: 'item', label: 'Item' },
    { key: 'jobNo', label: 'Job No.' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'stone', label: 'Stone' },
    { key: 'type', label: 'Category' },
    { key: 'use', label: 'Use' },
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
    { key: 'size', label: 'Size' },
    { key: 'char', label: 'Characteristic' },
    { key: 'grade', label: 'Grade' },
    { key: 'gradeAmm', label: 'Height(cm.)' },
  ],
  footerStats: ['Item', 'Total Qty', 'Total Value'],
};

// ============================================
// SIA — RequisitionStone (same layout as SRA)
// ============================================
const siaConfig: FormConfig = {
  ...sraConfig,
  code: 'SIA',
  titleTh: 'RequisitionStone',
  groupLabel: 'Orderand requisition',
  apiType: 'requisition',
};

// ============================================
// SIB — RequisitionStone B (ref: legacy screenshot)
// ============================================
const sibConfig: FormConfig = {
  code: 'SIB',
  titleTh: 'RequisitionStone B',
  groupLabel: 'Orderand requisition',
  apiType: 'requisition',
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'refNumber', label: 'Ref No.' },
    { name: 'supplierCode', label: 'Customer Code', hasSearch: true },
    { name: 'total', label: 'Total', type: 'number' },
    { name: 'reason', label: 'Reason', colSpan: 2 },
    { name: 'currency', label: 'Currency', type: 'select', options: ['THB', 'USD'] },
    { name: 'totalMoney', label: 'Total Amount', type: 'number' },
  ],
  stoneFields: [
    { name: 'color', label: 'Color' },
    { name: 'shape', label: 'Shape' },
    { name: 'size', label: 'Size' },
    { name: 'characteristic', label: 'Characteristic', type: 'select', options: [''] },
    { name: 'grade', label: 'Grade' },
    { name: 'stoneName', label: 'Stone' },
    { name: 'warehouse', label: 'Warehouse' },
    { name: 'unit', label: 'Unit' },
    { name: 'checkGrade', label: 'CheckHeight' },
    { name: 'weight', label: 'Weight', type: 'number' },
    { name: 'useStone', label: 'UseStone' },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'total', label: 'Total', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'stone', label: 'Stone' },
    { key: 'unit', label: 'Unit' },
    { key: 'grade', label: 'Height' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'weight', label: 'Weight', align: 'right' },
    { key: 'use', label: 'Use', align: 'right' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
  ],
  footerStats: ['Item', 'Total Qty', 'Total Value'],
};

// ============================================
// SIS — SaveSendStone WorkOrder (ref: legacy screenshot)
// ============================================
const sisConfig: FormConfig = {
  code: 'SIS',
  titleTh: 'SaveSendStone WorkOrder',
  groupLabel: 'Orderand requisition',
  apiType: 'requisition',
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'total', label: 'Total', type: 'number' },
    { name: 'totalMoney', label: 'Total Amount', type: 'number' },
    { name: 'reason', label: 'Reason', colSpan: 2 },
    { name: 'note', label: 'Remark', colSpan: 2 },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'order', label: 'Order' },
    { key: 'item', label: 'Item' },
    { key: 'jobNo', label: 'Job No.' },
    { key: 'stone', label: 'Stone' },
    { key: 'type', label: 'Category' },
    { key: 'grade', label: 'Height' },
    { key: 'weight', label: 'Weight', align: 'right' },
    { key: 'use', label: 'Use', align: 'right' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
  ],
  footerStats: ['Item', 'Total Qty', 'Total Value'],
};

// ============================================
// SIP — RequisitionStone Repair (ref: legacy screenshot)
// ============================================
const sipConfig: FormConfig = {
  code: 'SIP',
  titleTh: 'RequisitionStone Repair',
  groupLabel: 'Orderand requisition',
  apiType: 'requisition',
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'refNumber', label: 'Ref No.' },
    { name: 'department', label: 'Department' },
    { name: 'reason', label: 'Reason' },
    { name: 'stone', label: 'Stone' },
    { name: 'orderNumber', label: 'Order No.' },
    { name: 'itemCount', label: 'Item', type: 'number' },
    { name: 'jobNumber', label: 'Job No.' },
    { name: 'detail', label: 'Detail', colSpan: 2 },
  ],
  stoneFields: [
    { name: 'color', label: 'Color' },
    { name: 'shape', label: 'Shape' },
    { name: 'size', label: 'Size' },
    { name: 'characteristic', label: 'Characteristic', type: 'select', options: [''] },
    { name: 'grade', label: 'Grade' },
    { name: 'stoneQty', label: 'Qty', type: 'number' },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'total', label: 'Total', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'department', label: 'Department' },
    { key: 'order', label: 'Order' },
    { key: 'item', label: 'Item' },
    { key: 'jobNo', label: 'Job No.' },
    { key: 'refNo', label: 'Ref No.' },
    { key: 'reason', label: 'Reason' },
    { key: 'stone', label: 'Stone' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'price', label: 'Price', align: 'right' },
  ],
  footerStats: ['Item', 'Total Qty', 'Total Value'],
};

// ============================================
// SSA — SaveOrderStone Sample Room (ref: legacy screenshot)
// ============================================
const ssaConfig: FormConfig = {
  code: 'SSA',
  titleTh: 'SaveOrderStone Sample Room',
  groupLabel: 'Sample Room',
  apiType: 'sample',
  hasPhoto: true,
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'supplierCode', label: 'Customer Code' },
    { name: 'note', label: 'Remark', colSpan: 2 },
    { name: 'psNo', label: 'PS No' },
    { name: 'pdNo', label: 'PD No' },
    { name: 'jobNumber', label: 'Job No.' },
    { name: 'dateOther1', label: 'Other Date', type: 'date' },
    { name: 'dateOther2', label: 'Other Date', type: 'date' },
  ],
  stoneFields: [
    { name: 'color', label: 'Color' },
    { name: 'shape', label: 'Shape' },
    { name: 'size', label: 'Size' },
    { name: 'characteristic', label: 'Characteristic', type: 'select', options: [''] },
    { name: 'grade', label: 'Grade' },
    { name: 'weight', label: 'Weight', type: 'number' },
    { name: 'height', label: 'Height' },
    { name: 'src', label: 'S.R.C.' },
    { name: 'seed', label: 'Pc', type: 'number' },
    { name: 'useStone', label: 'UseStone' },
    { name: 'price', label: 'Price', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'psNo', label: 'PS No' },
    { key: 'pdNo', label: 'PD No' },
    { key: 'jobNo', label: 'Job No.' },
    { key: 'customer', label: 'Customer' },
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
    { key: 'size', label: 'Size' },
    { key: 'char', label: 'Characteristic' },
    { key: 'grade', label: 'Grade' },
    { key: 'height', label: 'Height' },
    { key: 'seed', label: 'Pc', align: 'right' },
    { key: 'useStone', label: 'UseStone', align: 'right' },
    { key: 'workUse', label: 'WorkUseStone', align: 'right' },
    { key: 'sampleWork', label: 'Sample Work', align: 'right' },
    { key: 'src', label: 'S.R.C.' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'weight', label: 'Weight', align: 'right' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'note', label: 'Remark' },
  ],
  footerStats: ['Item', 'Total Qty', 'Total Value'],
};

// ============================================
// SIM — SaveSendStone Sample Room (ref: legacy screenshot)
// ============================================
const simConfig: FormConfig = {
  code: 'SIM',
  titleTh: 'SaveSendStone Sample Room',
  groupLabel: 'Sample Room',
  apiType: 'sample',
  headerFields: [
    { name: 'docNumber', label: 'Doc No.', readOnly: true },
    { name: 'docDate', label: 'Doc Date', type: 'date' },
    { name: 'refNumber', label: 'Ref No.' },
    { name: 'supplierCode', label: 'Customer Code', hasSearch: true },
    { name: 'supplierName', label: '' },
    { name: 'total', label: 'Total', type: 'number' },
    { name: 'reason', label: 'Reason', colSpan: 2 },
    { name: 'currency', label: 'Currency', type: 'select', options: ['THB', 'USD'] },
    { name: 'totalMoney', label: 'Total Amount', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'Seq' },
    { key: 'stone', label: 'Stone' },
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
    { key: 'size', label: 'Size' },
    { key: 'char', label: 'Characteristic' },
    { key: 'grade', label: 'Grade' },
    { key: 'height', label: 'Height' },
    { key: 'seed', label: 'Pc', align: 'right' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'weight', label: 'Weight', align: 'right' },
    { key: 'use', label: 'Use', align: 'right' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
  ],
  footerStats: ['Item', 'Total Qty', 'Total Value'],
};

// ============================================
// CFM-STK — Confirm Stock (ref: legacy screenshot)
// ============================================
const cfmStkConfig: FormConfig = {
  code: 'CFM-STK',
  titleTh: 'Confirm Stock',
  groupLabel: 'Check & Count Stock',
  apiType: 'none',
  headerFields: [
    { name: 'stone', label: 'Stone', hasSearch: true },
  ],
  tableColumns: [
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
    { key: 'size', label: 'Size' },
    { key: 'spec', label: 'Spec' },
    { key: 'grade', label: 'Grade' },
    { key: 'in', label: 'In', align: 'right' },
    { key: 'out', label: 'Out', align: 'right' },
    { key: 'return', label: 'Return', align: 'right' },
    { key: 'totalQty', label: 'Total Qty', align: 'right' },
    { key: 'totalAmnt', label: 'Total Amnt', align: 'right' },
  ],
  footerStats: ['Total List', 'Stock Qty', 'Stock Amnt'],
};

// ============================================
// Lookup map: code => config
// ============================================
export const formConfigMap: Record<string, FormConfig> = {
  SPA: spaConfig,
  SRA: sraConfig,
  SRB: srbConfig,
  SIR: sirConfig,
  'CHK-SPA': chkSpaConfig,
  SOA: soaConfig,
  SIA: siaConfig,
  SIB: sibConfig,
  SIS: sisConfig,
  SIP: sipConfig,
  SSA: ssaConfig,
  SIM: simConfig,
  'CFM-STK': cfmStkConfig,
};
