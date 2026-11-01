import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Define the interface based on the 46 columns expected in the PO Tracker
export interface POTrackerExportData {
  OrdWeek: number | string;
  CustCode: string;
  PONo: string;
  OrdNo: string;
  OrdKind: string;
  OrdMat: string;
  OrdMaker: string;
  CustMultiAddr: string;
  OrdDate: Date | string;
  DueDate: Date | string;
  TrackTest: string;
  OrdSGS: string;
  CustQCDate: Date | string;
  CustDueDate: Date | string;
  OORDate: Date | string;
  SumItem: number;
  SumQty: number;
  BookDate: Date | string;
  QC1_Qty: number;
  QC1_Date: Date | string;
  QC1_Fail: number;
  QC2_Qty: number;
  QC2_Date: Date | string;
  QC2_Fail: number;
  StonePenQty: number | null;
  FitPenQty: number | null;
  WijPenQty: number | null;
  WstPenQty: number | null;
  CastPenQty: number | null;
  GrindPenQty: number | null;
  ControlPenQty: number | null;
  PolishPenQty: number | null;
  PlatePenQty: number | null;
  QCPenQty: number | null;
  ExportQty: number | null;
  BalQty: number | null;
  ExpPct: number; // Value between 0 - 100
  ProdRiskIssue: string;
  PQCPlanShip: string;
  PackCard: string;
  TickOrd: string;
  TickRec: string;
  PolyOrd: string;
  PolyRec: string;
  PackScanAppv: string;
  TrackRemark: string;
  SumAmnt: number;
}

/**
 * Generate and download the PO Tracker Excel file matching the old VB format.
 * @param data Array of PO Tracker data rows
 * @param fileNamePrefix Optional prefix, usually based on search criteria
 */
export const exportPOTrackerExcel = async (
  data: POTrackerExportData[],
  fileNamePrefix: string = 'POTracker'
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('POTracker');

  // 1. Define Columns matching the 46 columns (A -> AT)
  worksheet.columns = [
    { header: 'OrdWeek', key: 'OrdWeek', width: 10 },        // A
    { header: 'CustCode', key: 'CustCode', width: 12 },      // B
    { header: 'PONo', key: 'PONo', width: 15 },              // C
    { header: 'OrdNo', key: 'OrdNo', width: 15 },            // D
    { header: 'OrdKind', key: 'OrdKind', width: 10 },        // E
    { header: 'OrdMat', key: 'OrdMat', width: 10 },          // F
    { header: 'Group', key: 'OrdMaker', width: 12 },         // F-2
    { header: 'CustMultiAddr', key: 'CustMultiAddr', width: 15 }, // G
    { header: 'OrdDate', key: 'OrdDate', width: 15 },        // H
    { header: 'DueDate', key: 'DueDate', width: 15 },        // I
    { header: 'BBQ/Top', key: 'TrackTest', width: 10 },    // J
    { header: 'OrdSGS', key: 'OrdSGS', width: 10 },          // K
    { header: 'CustQCDate', key: 'CustQCDate', width: 15 },  // L
    { header: 'CustDueDate', key: 'CustDueDate', width: 15 },// M
    { header: 'OORDate', key: 'OORDate', width: 15 },        // N
    { header: 'SumItem', key: 'SumItem', width: 10 },        // O
    { header: 'SumQty', key: 'SumQty', width: 10 },          // P
    { header: 'BookDate', key: 'BookDate', width: 15 },      // Q
    { header: 'QC1_Qty', key: 'QC1_Qty', width: 10 },        // R
    { header: 'QC1_Date', key: 'QC1_Date', width: 15 },      // S
    { header: 'QC1_Fail', key: 'QC1_Fail', width: 10 },      // T
    { header: 'QC2_Qty', key: 'QC2_Qty', width: 10 },        // U
    { header: 'QC2_Date', key: 'QC2_Date', width: 15 },      // V
    { header: 'QC2_Fail', key: 'QC2_Fail', width: 10 },      // W
    { header: 'PST', key: 'StonePenQty', width: 10 },// X
    { header: 'PC1', key: 'FitPenQty', width: 10 },    // Y
    { header: 'PWA', key: 'WijPenQty', width: 10 },    // Z
    { header: 'WaxSet', key: 'WstPenQty', width: 10 },    // AA
    { header: 'PCA', key: 'CastPenQty', width: 10 },  // AB
    { header: 'PF', key: 'GrindPenQty', width: 10 },// AC
    { header: 'PC2', key: 'ControlPenQty', width: 10 },// AD
    { header: 'PL', key: 'PolishPenQty', width: 10 },// AE
    { header: 'PPL', key: 'PlatePenQty', width: 10 },// AF
    { header: 'QCPenQty', key: 'QCPenQty', width: 10 },      // AG
    { header: 'ExportQty', key: 'ExportQty', width: 10 },    // AH
    { header: 'BalQty', key: 'BalQty', width: 10 },          // AI
    { header: 'ExpPct', key: 'ExpPct', width: 10 },          // AJ
    { header: 'ProdRiskIssue', key: 'ProdRiskIssue', width: 15 },// AK
    { header: 'PQCPlanShip', key: 'PQCPlanShip', width: 15 },// AL
    { header: '3. Order/Issue Box', key: 'PackCard', width: 15 },      // AM
    { header: '2. Order Card', key: 'TickOrd', width: 15 },        // AN
    { header: '2. Issue/Prep Card', key: 'TickRec', width: 15 },        // AO
    { header: 'PolyOrd', key: 'PolyOrd', width: 10 },        // AP
    { header: 'PolyRec', key: 'PolyRec', width: 10 },        // AQ
    { header: 'PackScanAppv', key: 'PackScanAppv', width: 15 },// AR
    { header: 'TrackRemark', key: 'TrackRemark', width: 20 },// AS
    { header: 'SumAmnt', key: 'SumAmnt', width: 15 },        // AT
  ];

  // 2. Set Row 1 (Header) Style
  const headerRow = worksheet.getRow(1);
  headerRow.height = 36;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // 3. Add Data Rows
  data.forEach((row) => {
    // Note: To match VB formatting exactly, empty qty should be shown as blank, not 0
    // The data mapping here should handle transforming 0 to null/blank if desired
    // For ExpPct, if it is passed as 0-100, we convert it to 0-1 for excel percentage format

    worksheet.addRow({
      ...row,
      ExpPct: row.ExpPct / 100,
      StonePenQty: row.StonePenQty === 0 ? '' : row.StonePenQty,
      FitPenQty: row.FitPenQty === 0 ? '' : row.FitPenQty,
      WijPenQty: row.WijPenQty === 0 ? '' : row.WijPenQty,
      WstPenQty: row.WstPenQty === 0 ? '' : row.WstPenQty,
      CastPenQty: row.CastPenQty === 0 ? '' : row.CastPenQty,
      GrindPenQty: row.GrindPenQty === 0 ? '' : row.GrindPenQty,
      ControlPenQty: row.ControlPenQty === 0 ? '' : row.ControlPenQty,
      PolishPenQty: row.PolishPenQty === 0 ? '' : row.PolishPenQty,
      PlatePenQty: row.PlatePenQty === 0 ? '' : row.PlatePenQty,
      QCPenQty: row.QCPenQty === 0 ? '' : row.QCPenQty,
      ExportQty: row.ExportQty === 0 ? '' : row.ExportQty,
      BalQty: row.BalQty === 0 ? '' : row.BalQty,
    });
  });

  // 4. Formatting and Conditional Styling
  worksheet.eachRow((row, rowNumber) => {
    // Skip header row
    if (rowNumber === 1) return;

    row.height = 15;

    // Default Font and Alignment for all cells in the row
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Number formatting based on VB code
      if (colNumber === 3 || colNumber === 4) cell.numFmt = '@'; // C:D PONo, OrdNo
      if (colNumber === 8 || colNumber === 9) cell.numFmt = 'dd/mm/yyyy'; // H:I
      if (colNumber === 10 || colNumber === 11) cell.numFmt = '@'; // J:K
      if (colNumber === 12 || colNumber === 13) cell.numFmt = 'dd/mm/yyyy'; // L:M
      if (colNumber === 14) cell.numFmt = '@'; // N
      if (colNumber === 15 || colNumber === 16) cell.numFmt = '#,##0'; // O:P SumItem, SumQty
      if (colNumber >= 17 && colNumber <= 23) cell.numFmt = '@'; // Q:W
      if (colNumber >= 24 && colNumber <= 35) cell.numFmt = '#,##0'; // X:AI (PenQty + BalQty)
      if (colNumber >= 37 && colNumber <= 45) cell.numFmt = '@'; // AK:AS
      if (colNumber === 46) cell.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)'; // AT SumAmnt
    });

    // Handle Conditional Formatting for BalQty (AI) and ExpPct (AJ)
    const expPctCell = row.getCell('AJ');
    const balQtyCell = row.getCell('AI');
    const rawExpPct = (expPctCell.value as number) * 100; // Multiply by 100 to get actual percentage value

    expPctCell.numFmt = '0%';

    // VB Logic: < 60 Red, > 79 Green, else Yellow
    if (rawExpPct === 0 || rawExpPct < 60) {
      // Red
      const dangerFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, color: { argb: 'FFC00000' }, bold: true };
      // Note: exceljs fill color uses ARGB format.
      // RGB 192, 0, 0 -> ARGB FFC00000
      // RGB 255, 232, 235 -> ARGB FFFFE8EB

      balQtyCell.font = dangerFont;
      balQtyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE8EB' } };
      expPctCell.font = dangerFont;
      expPctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE8EB' } };

    } else if (rawExpPct > 79) {
      // Green
      // RGB 70, 112, 20 -> ARGB FF467014
      // RGB 204, 233, 146 -> ARGB FFCCE992
      balQtyCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF467014' }, bold: true };
      balQtyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCE992' } };
      expPctCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF467014' }, bold: true };
      expPctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCE992' } };

    } else {
      // Yellow
      // RGB 149, 124, 28 -> ARGB FF957C1C
      // RGB 255, 255, 170 -> ARGB FFFFFFAA
      balQtyCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF957C1C' }, bold: true };
      balQtyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFAA' } };
      expPctCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF957C1C' }, bold: true };
      expPctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFAA' } };
    }
  });

  // 4.5 Auto-fit columns based on content length
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      let cellValue = cell.value ? cell.value.toString() : '';

      // If it's a date, it might toString() to a long string, but Excel formats it to dd/mm/yyyy (10 chars)
      if (cell.type === ExcelJS.ValueType.Date) {
        cellValue = '12/34/5678';
      } else if (cell.type === ExcelJS.ValueType.Number && cell.numFmt === '0%') {
        cellValue = '100%';
      } else if (cell.numFmt && cell.numFmt.includes('#,##0.00')) {
        cellValue = '123,456.00'; // rough estimation for currency
      }

      const columnLength = cellValue.length;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    // Set width with a minimum of 10 and max of 60 to avoid ridiculously wide columns, plus padding
    column.width = Math.min(Math.max(maxLength + 2, 10), 60);
  });

  // 5. Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const today = new Date();
  const dateStr = today.getFullYear().toString() +
                 (today.getMonth() + 1).toString().padStart(2, '0') +
                 today.getDate().toString().padStart(2, '0');

  // Format matching: POTracker_20260625.xlsx
  // If specific week/ship format is passed to fileNamePrefix, it will use that.
  const finalFileName = `${fileNamePrefix}_${dateStr}.xlsx`;

  saveAs(new Blob([buffer]), finalFileName);
};
