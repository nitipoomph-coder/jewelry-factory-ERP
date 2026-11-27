// Order List Excel export (page: pages/SalesCustomerGroupDetail.tsx, started from the Global Topbar's
// Export to Excel). One sheet laid out for reading and printing:
//   rows 1-3  title, scope (group / customer / period / date basis) and the page filters
//   header    bold on a light fill, filter buttons, frozen with the first column (OrdNo)
//   data      real numbers (#,##0 / $#,##0.00) and real dates (dd/mm/yyyy), not text
//   Total     SUBTOTAL formulas, so the sums follow Excel's own filter
// Print: landscape, fit to one page wide, header row repeated on every page.
// Excel colors are ARGB values (Excel cannot read the app's CSS tokens).
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type OrderListExcelType = 'text' | 'int' | 'money' | 'decimal' | 'date';

export interface OrderListExcelColumn<Row> {
  label: string;
  /** Screen width in px; Excel width ≈ px / 7 */
  width: number;
  type: OrderListExcelType;
  value: (row: Row) => string | number | Date | null | undefined;
  /** Sum this column in the Total row */
  total?: boolean;
}

export interface OrderListExcelInput<Row> {
  title: string;
  /** "Key: value" pairs on the scope line, e.g. ["Group", "N008 Group"] */
  scope: [string, string][];
  /** Page filters in force (customers, type, search); empty → no filter line */
  filters: [string, string][];
  columns: OrderListExcelColumn<Row>[];
  rows: Row[];
  fileName: string;
}

const NUM_FMT: Record<OrderListExcelType, string | undefined> = {
  text: '@',
  int: '#,##0',
  money: '$#,##0.00',
  decimal: '#,##0.00',
  date: 'dd/mm/yyyy',
};

const FONT = 'Calibri';
const HEADER_FILL = 'FFEEF1F5';
const TOTAL_FILL = 'FFF5F6F8';
const RULE_COLOR = 'FFD9DDE3';
const HAIR_COLOR = 'FFE9ECF0';
const MUTED_TEXT = 'FF5F6670';

function columnLetter(n: number): string {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

/** A date at midnight UTC, so Excel shows the same day in every time zone. */
function excelDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function cellValue(type: OrderListExcelType, raw: unknown): ExcelJS.CellValue {
  if (raw === null || raw === undefined || raw === '' || raw === '-') return null;
  if (type === 'date') return excelDate(raw);
  if (type === 'int' || type === 'money' || type === 'decimal') {
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }
  return String(raw);
}

export async function exportOrderListExcel<Row>({ title, scope, filters, columns, rows, fileName }: OrderListExcelInput<Row>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Order List');
  const lastCol = columnLetter(columns.length);
  const exportedAt = new Date();
  const stamp = `${String(exportedAt.getDate()).padStart(2, '0')}/${String(exportedAt.getMonth() + 1).padStart(2, '0')}/${exportedAt.getFullYear()} ${String(exportedAt.getHours()).padStart(2, '0')}:${String(exportedAt.getMinutes()).padStart(2, '0')}`;

  // ── Title, scope, filters ──
  sheet.getCell('A1').value = title;
  sheet.getCell('A1').font = { name: FONT, size: 14, bold: true };
  sheet.getRow(1).height = 22;

  const scopeText = [...scope.map(([k, v]) => `${k}: ${v}`), `${rows.length.toLocaleString()} lines`, `Exported ${stamp}`].join('   ·   ');
  sheet.getCell('A2').value = scopeText;
  sheet.getCell('A2').font = { name: FONT, size: 10, color: { argb: MUTED_TEXT } };

  if (filters.length > 0) {
    sheet.getCell('A3').value = `Filters: ${filters.map(([k, v]) => `${k}: ${v}`).join('   ·   ')}`;
    sheet.getCell('A3').font = { name: FONT, size: 10, color: { argb: MUTED_TEXT } };
  }

  // ── Header ──
  const headerRowIdx = 5;
  const headerRow = sheet.getRow(headerRowIdx);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.label;
    cell.font = { name: FONT, size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: col.type === 'text' ? 'left' : col.type === 'date' ? 'center' : 'right' };
    cell.border = { top: { style: 'thin', color: { argb: RULE_COLOR } }, bottom: { style: 'thin', color: { argb: RULE_COLOR } } };
    sheet.getColumn(i + 1).width = Math.max(8, Math.round(col.width / 7));
  });
  headerRow.height = 20;

  // ── Data ──
  const firstDataRow = headerRowIdx + 1;
  rows.forEach((row, r) => {
    const excelRow = sheet.getRow(firstDataRow + r);
    columns.forEach((col, i) => {
      const cell = excelRow.getCell(i + 1);
      cell.value = cellValue(col.type, col.value(row));
      cell.font = { name: FONT, size: 10 };
      const fmt = NUM_FMT[col.type];
      if (fmt) cell.numFmt = fmt;
      if (col.type === 'date') cell.alignment = { horizontal: 'center' };
      cell.border = { bottom: { style: 'hair', color: { argb: HAIR_COLOR } } };
    });
  });
  const lastDataRow = firstDataRow + rows.length - 1;

  // ── Total (SUBTOTAL 109 skips rows hidden by Excel's filter) ──
  if (rows.length > 0) {
    const totalRow = sheet.getRow(lastDataRow + 1);
    columns.forEach((col, i) => {
      const cell = totalRow.getCell(i + 1);
      cell.font = { name: FONT, size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
      cell.border = { top: { style: 'thin', color: { argb: RULE_COLOR } } };
      if (i === 0) {
        cell.value = 'Total';
      } else if (col.total) {
        const letter = columnLetter(i + 1);
        const result = rows.reduce((sum, row) => sum + (Number(col.value(row)) || 0), 0);
        cell.value = { formula: `SUBTOTAL(109,${letter}${firstDataRow}:${letter}${lastDataRow})`, result: Math.round(result * 100) / 100 };
        const fmt = NUM_FMT[col.type];
        if (fmt) cell.numFmt = fmt;
      }
    });
  }

  // ── Filter buttons, frozen header + first column, print layout ──
  sheet.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: columns.length } };
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: headerRowIdx, topLeftCell: `B${firstDataRow}` }];
  sheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `${headerRowIdx}:${headerRowIdx}`,
    printArea: `A1:${lastCol}${Math.max(lastDataRow + 1, headerRowIdx)}`,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };
  sheet.headerFooter = { oddFooter: '&L&8' + title + '&R&8Page &P of &N' };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
}
