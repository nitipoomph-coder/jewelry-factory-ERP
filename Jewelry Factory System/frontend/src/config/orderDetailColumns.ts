// src/config/orderDetailColumns.ts
// Single source of truth for the Order Detail line table, its "View Columns" popover,
// and the full-column Excel export — keeps all three in sync (the old export silently
// dropped InvoiceDate because columns were hand-listed separately in 3 places).

export type ColGroup = 'core' | 'info' | 'sales' | 'production' | 'remark';
export type ColAlign = 'left' | 'center' | 'right';
export type ExcelType = 'general' | 'text' | 'date' | 'int' | 'currency';

export interface OrderDetailColumn {
  key: string;
  label: string;
  group: ColGroup;
  width: number;
  align: ColAlign;
  /** Always visible + sticky to the left edge regardless of active preset. */
  locked?: boolean;
  excelType?: ExcelType;
  /** Negative values render as a flat danger-colored alert (production qty + balance). */
  negativeIsAlert?: boolean;
  /** Editable only inside the line detail drawer's remarks form; read-only everywhere else. */
  readOnly?: boolean;
  /** Suffix appended to formatted numeric values on screen, e.g. "g" for weights. */
  unit?: string;
}

export const ORDER_DETAIL_COLUMNS: OrderDetailColumn[] = [
  { key: 'OrdNo', label: 'Order No.', group: 'core', width: 110, align: 'left', locked: true, excelType: 'general' },
  { key: 'CustCode', label: 'Customer', group: 'core', width: 70, align: 'left', locked: true, excelType: 'general' },
  { key: 'Sales', label: 'Sales', group: 'info', width: 130, align: 'left', excelType: 'general' },
  { key: 'PONo', label: 'PO no.', group: 'info', width: 130, align: 'left', excelType: 'text' },
  { key: 'PONo2', label: 'PO2', group: 'info', width: 130, align: 'left', excelType: 'text' },
  { key: 'Destination', label: 'Destination', group: 'info', width: 130, align: 'left', excelType: 'text' },
  { key: 'OrdDate', label: 'Order Date', group: 'info', width: 100, align: 'center', excelType: 'date' },
  { key: 'DueDate', label: 'Factory Due', group: 'info', width: 100, align: 'center', excelType: 'date' },
  { key: 'QCDate', label: 'QC Date', group: 'info', width: 100, align: 'center', excelType: 'date' },
  { key: 'CustDueDate', label: 'Cust Due', group: 'info', width: 100, align: 'center', excelType: 'date' },

  { key: '_photo', label: 'Picture', group: 'core', width: 130, align: 'center', locked: true, excelType: 'general' },
  { key: 'LineNo', label: 'Line', group: 'core', width: 50, align: 'center', locked: true, excelType: 'general' },
  { key: 'ItemNo', label: 'Item no.', group: 'core', width: 110, align: 'left', locked: true, excelType: 'general' },
  { key: 'CustItem', label: 'Cust Item', group: 'info', width: 150, align: 'left', excelType: 'text' },
  { key: 'Stone', label: 'Stone', group: 'info', width: 90, align: 'left', excelType: 'text' },
  { key: 'ItemDesc', label: 'Description', group: 'info', width: 200, align: 'left', excelType: 'text' },
  { key: 'Plating', label: 'Plating', group: 'info', width: 130, align: 'left', excelType: 'text' },
  { key: 'ItemSize', label: 'Size', group: 'info', width: 70, align: 'center', excelType: 'text' },
  { key: 'SilverWt', label: 'Silver Wt.', group: 'info', width: 90, align: 'right', excelType: 'int', unit: 'g' },
  { key: 'FinishWt', label: 'Finish Wt.', group: 'info', width: 90, align: 'right', excelType: 'int', unit: 'g' },
  { key: 'SilverWtNB5', label: 'Silver Wt not below 5% ', group: 'info', width: 150, align: 'right', excelType: 'int' },
  { key: 'FinishWtNB5', label: 'Finish Wt not below 5% ', group: 'info', width: 150, align: 'right', excelType: 'int' },

  { key: 'Qty', label: 'Qty', group: 'core', width: 60, align: 'right', locked: true, excelType: 'int' },
  { key: 'Price', label: 'Units Price', group: 'info', width: 90, align: 'right', excelType: 'currency' },
  { key: 'Amount', label: 'Total Amount', group: 'info', width: 110, align: 'right', excelType: 'currency' },
  { key: 'BalQty', label: 'Balance', group: 'info', width: 84, align: 'right', excelType: 'int', negativeIsAlert: true },

  { key: 'StoneQty', label: 'PST', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'FindingQty', label: 'Finding PC1', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'WaxQty', label: 'PWA', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'WaxSetQty', label: 'PAU', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'CastQty', label: 'PCA', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'GrindQty', label: 'PF1/2 Grind', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'EpoxQty', label: 'PEP', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'SolderQty', label: 'PF1/2 Solder', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'FilingQty', label: 'PF1/2 Filing', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'ControlQty', label: 'PC2', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'SetQty', label: 'PL1/2/3 Set', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'PolishQty', label: 'PL1/2/3 Polish', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'PQCQty', label: 'PQC', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'PlatingQty', label: 'PPL', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'AssemQty', label: 'PAS', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },

  { key: 'RecRemark', label: 'Receive', group: 'remark', width: 100, align: 'left', excelType: 'general' },
  { key: 'EnaRemark', label: 'Enamel', group: 'remark', width: 100, align: 'left', excelType: 'general' },
  { key: 'CryRemark', label: 'Crystal', group: 'remark', width: 100, align: 'left', excelType: 'general' },
  { key: 'AsmRemark', label: 'Assembly', group: 'remark', width: 100, align: 'left', excelType: 'general' },
  { key: 'ShfRemark', label: 'Shelf', group: 'remark', width: 100, align: 'left', excelType: 'general' },
  { key: 'PkRemark', label: 'Pack', group: 'remark', width: 100, align: 'left', excelType: 'general' },

  { key: 'FQCQty', label: 'FQC', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'FinishQty', label: 'Finish', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'ExportQty', label: 'Export', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'GroupText', label: 'Group', group: 'remark', width: 100, align: 'left', excelType: 'general' },
  { key: 'ProdRemark', label: 'Remark', group: 'remark', width: 100, align: 'left', excelType: 'general' },

  { key: 'InvoiceNo', label: 'Invoice no.', group: 'sales', width: 110, align: 'left', excelType: 'text', locked: true },
  { key: 'AWB', label: 'AWB', group: 'sales', width: 110, align: 'left', excelType: 'text', locked: true },
  { key: 'InvoiceDate', label: 'Invoice Date', group: 'sales', width: 100, align: 'center', excelType: 'date', locked: true },
  { key: 'OrdRemark', label: 'Order Remark', group: 'remark', width: 180, align: 'left', excelType: 'general', readOnly: true, locked: true },
];

export const ORDER_DETAIL_COLUMNS_BY_KEY: Record<string, OrderDetailColumn> = Object.fromEntries(
  ORDER_DETAIL_COLUMNS.map((c) => [c.key, c])
);

export const LOCKED_COLUMN_KEYS = ORDER_DETAIL_COLUMNS.filter((c) => c.locked).map((c) => c.key);

function keysOf(...groups: ColGroup[]): string[] {
  return ORDER_DETAIL_COLUMNS.filter((c) => groups.includes(c.group)).map((c) => c.key);
}

export type ColumnPreset = 'Sales' | 'Production' | 'Remarks' | 'All';

export const COLUMN_GROUP_PRESETS: Record<ColumnPreset, string[]> = {
  Sales: [
    // Customer Data
    'OrdDate', 'DueDate', 'QCDate', 'CustDueDate',
    'Sales', 'PONo', 'Destination', 'CustItem', 'Stone', 'ItemDesc', 'Plating', 'ItemSize', 'OrdRemark', 'Price', 'Amount',
    // Production Data (Finish is checked)
    'FinishQty',
    // Shipping Data
    'InvoiceNo', 'InvoiceDate', 'AWB',
    // Remarks
    'RecRemark', 'EnaRemark', 'CryRemark', 'AsmRemark', 'ShfRemark', 'PkRemark', 'GroupText', 'ProdRemark'
  ],
  Production: [
    // Customer Data
    'OrdDate', 'DueDate', 'Stone', 'ItemDesc', 'Plating', 'ItemSize', 'OrdRemark',
    // Production Data
    'StoneQty', 'FindingQty', 'WaxQty', 'WaxSetQty', 'CastQty', 'GrindQty', 'EpoxQty',
    'SolderQty', 'FilingQty', 'ControlQty', 'SetQty', 'PolishQty', 'PQCQty', 'PlatingQty',
    'AssemQty', 'FQCQty', 'FinishQty', 'ExportQty', 'BalQty',
    // Remarks
    'RecRemark', 'EnaRemark', 'CryRemark', 'AsmRemark', 'ShfRemark', 'PkRemark', 'GroupText', 'ProdRemark'
  ],
  Remarks: keysOf('core', 'info', 'remark'), // Not used in UI but kept for type
  All: ORDER_DETAIL_COLUMNS.map((c) => c.key),
};
