// src/components/orderDetail/format.ts
import type { OrderDetailColumn } from '../../config/orderDetailColumns';

import { formatDateDDMMYY } from '../../utils/dateUtils';

export const DATE_KEYS = new Set(['OrdDate', 'DueDate', 'QCDate', 'CustDueDate', 'InvoiceDate']);

export const fDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return formatDateDDMMYY(d);
};

export const fQty = (n: number | string | null | undefined) =>
  n == null || n === '' ? '—' : Number(n).toLocaleString();

export const fAmt = (n: number | string | null | undefined) =>
  n == null || n === '' ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatV(key: string, val: unknown): string {
  if (val == null || val === '') return '—';
  if (DATE_KEYS.has(key)) return fDate(val as string);
  if (key === 'Price' || key === 'Amount') return fAmt(Number(val));
  if (typeof val === 'number') return fQty(val);
  return String(val);
}

/** Formats a raw line value for on-screen display, driven by the column registry's excelType/unit. */
export function formatColumnValue(col: OrderDetailColumn, val: unknown): string {
  if (val == null || val === '') return '—';
  switch (col.excelType) {
    case 'date':
      return fDate(val as string);
    case 'currency':
      return fAmt(Number(val));
    case 'int':
      return `${fQty(Number(val))}${col.unit ?? ''}`;
    default:
      return String(val);
  }
}
