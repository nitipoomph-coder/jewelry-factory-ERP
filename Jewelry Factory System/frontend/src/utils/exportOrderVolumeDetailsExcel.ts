import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { SalesOrderRow } from '../services/orderVolumeSummaryAPI';
import { formatDmY } from '../hooks/useOrderVolumeSummaryData';

/**
 * Generates and downloads a styled Excel (.xlsx) file matching the 18 columns of Order Details.
 * Styled with professional ERP design standards (headers, alignments, number formats, auto-filters, summary row).
 */
export async function exportOrderVolumeDetailsExcel(
  rows: SalesOrderRow[],
  fileNamePrefix: string = 'Order_Details'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jewelry Factory Management System';
  workbook.lastModifiedBy = 'ERP Export';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Order Details', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  // 1. Column Definitions (18 Columns matching Order Details Table)
  worksheet.columns = [
    { header: 'No.', key: 'no', width: 8 },
    { header: 'Week', key: 'week', width: 10 },
    { header: 'Cust', key: 'cust', width: 12 },
    { header: 'PO No.', key: 'poNo', width: 22 },
    { header: 'PO 2', key: 'po2', width: 18 },
    { header: 'New/Replen', key: 'ordKind', width: 14 },
    { header: 'Metal', key: 'metal', width: 10 },
    { header: 'Item No.', key: 'itemNo', width: 18 },
    { header: 'Ship To', key: 'shipTo', width: 14 },
    { header: 'Order Date', key: 'ordDate', width: 14 },
    { header: 'Due Date', key: 'dueDate', width: 14 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Factory Stage', key: 'factoryStage', width: 16 },
    { header: 'Ordered Qty', key: 'orderQty', width: 14 },
    { header: 'Total Value ($)', key: 'totalValue', width: 18 },
    { header: 'Shipped Qty', key: 'shippedQty', width: 14 },
    { header: 'Backlog Qty', key: 'backlogQty', width: 14 },
    { header: 'Backlog Value ($)', key: 'backlogValue', width: 18 },
    { header: 'Days +/-', key: 'days', width: 12 }
  ];

  // 2. Style Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Dark Slate Navy header
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  // 3. Populate Data Rows
  let totalOrderQty = 0;
  let totalOrderValue = 0;
  let totalShippedQty = 0;
  let totalBacklogQty = 0;
  let totalBacklogValue = 0;

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    const weekLabel = row.ordWeek ? `W${String(row.ordWeek).padStart(2, '0')}` : '-';
    const totalValue = row.itemAmnt || ((row.itemPrice || 0) * (row.orderQty || 0));
    const backlogQty = Math.max(0, (row.orderQty || 0) - (row.shippedQty || 0));
    const backlogValue = (row.itemPrice || 0) * backlogQty;

    totalOrderQty += row.orderQty || 0;
    totalOrderValue += totalValue;
    totalShippedQty += row.shippedQty || 0;
    totalBacklogQty += backlogQty;
    totalBacklogValue += backlogValue;

    const dataRow = worksheet.addRow({
      no: rowNum,
      week: weekLabel,
      cust: row.customerCode || '-',
      poNo: row.poNo || '-',
      po2: row.po2 || '-',
      ordKind: row.ordKind || '-',
      metal: row.metal || '-',
      itemNo: row.itemNo || '-',
      shipTo: row.shipTo || '-',
      ordDate: formatDmY(row.ordDate),
      dueDate: formatDmY(row.custDate || row.dueDate),
      status: row.dueRiskBucket || 'Scheduled',
      factoryStage: row.currentDepartment || 'Wax / Prep',
      orderQty: row.orderQty || 0,
      totalValue: totalValue,
      shippedQty: row.shippedQty || 0,
      backlogQty: backlogQty,
      backlogValue: backlogValue,
      days: row.daysToCustDue !== undefined && row.daysToCustDue !== null ? row.daysToCustDue : '-'
    });

    dataRow.height = 20;

    // Apply specific cell formatting & alignments
    dataRow.getCell('no').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('week').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('cust').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('poNo').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('po2').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('ordKind').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('metal').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('itemNo').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('shipTo').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('ordDate').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('dueDate').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell('factoryStage').alignment = { horizontal: 'center', vertical: 'middle' };

    // Numbers
    const cOrderQty = dataRow.getCell('orderQty');
    cOrderQty.alignment = { horizontal: 'right', vertical: 'middle' };
    cOrderQty.numFmt = '#,##0';

    const cTotalVal = dataRow.getCell('totalValue');
    cTotalVal.alignment = { horizontal: 'right', vertical: 'middle' };
    cTotalVal.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

    const cShippedQty = dataRow.getCell('shippedQty');
    cShippedQty.alignment = { horizontal: 'right', vertical: 'middle' };
    cShippedQty.numFmt = '#,##0';

    const cBacklogQty = dataRow.getCell('backlogQty');
    cBacklogQty.alignment = { horizontal: 'right', vertical: 'middle' };
    cBacklogQty.numFmt = '#,##0';

    const cBacklogVal = dataRow.getCell('backlogValue');
    cBacklogVal.alignment = { horizontal: 'right', vertical: 'middle' };
    cBacklogVal.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

    const cDays = dataRow.getCell('days');
    cDays.alignment = { horizontal: 'right', vertical: 'middle' };

    // Zebra striping
    const isEven = rowNum % 2 === 0;
    dataRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
    });

    // Overdue highlight in red text
    if (row.dueRiskBucket === 'Overdue') {
      dataRow.getCell('status').font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
      dataRow.getCell('dueDate').font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
      cDays.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
    }
  });

  // 4. Summary / Total Row
  if (rows.length > 0) {
    const summaryRow = worksheet.addRow({
      no: '',
      week: '',
      cust: 'TOTAL',
      poNo: '',
      po2: '',
      ordKind: '',
      metal: '',
      itemNo: '',
      shipTo: '',
      ordDate: '',
      dueDate: '',
      status: '',
      factoryStage: `${rows.length} lines`,
      orderQty: totalOrderQty,
      totalValue: totalOrderValue,
      shippedQty: totalShippedQty,
      backlogQty: totalBacklogQty,
      backlogValue: totalBacklogValue,
      days: ''
    });

    summaryRow.height = 24;
    summaryRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      cell.border = {
        top: { style: 'double', color: { argb: 'FF64748B' } },
        bottom: { style: 'double', color: { argb: 'FF64748B' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    summaryRow.getCell('cust').alignment = { horizontal: 'center', vertical: 'middle' };
    summaryRow.getCell('factoryStage').alignment = { horizontal: 'center', vertical: 'middle' };

    const sumOrderQty = summaryRow.getCell('orderQty');
    sumOrderQty.alignment = { horizontal: 'right', vertical: 'middle' };
    sumOrderQty.numFmt = '#,##0';

    const sumTotalVal = summaryRow.getCell('totalValue');
    sumTotalVal.alignment = { horizontal: 'right', vertical: 'middle' };
    sumTotalVal.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

    const sumShippedQty = summaryRow.getCell('shippedQty');
    sumShippedQty.alignment = { horizontal: 'right', vertical: 'middle' };
    sumShippedQty.numFmt = '#,##0';

    const sumBacklogQty = summaryRow.getCell('backlogQty');
    sumBacklogQty.alignment = { horizontal: 'right', vertical: 'middle' };
    sumBacklogQty.numFmt = '#,##0';

    const sumBacklogVal = summaryRow.getCell('backlogValue');
    sumBacklogVal.alignment = { horizontal: 'right', vertical: 'middle' };
    sumBacklogVal.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
  }

  // 5. Enable AutoFilter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: rows.length + 1, column: 19 }
  };

  // 6. Generate Buffer & Save File
  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const finalFileName = `${fileNamePrefix}_${dateStr}.xlsx`;
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFileName);
}
