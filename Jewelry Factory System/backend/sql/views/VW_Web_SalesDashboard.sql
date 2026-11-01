-- =========================================================================
-- View: dbo.VW_Web_SalesDashboard
-- Database: dbGeneration (SQL Server 2012+)
-- Description: Central SSOT View for Customer Dashboard, Matrix Report, and Order Trends
-- Business Logic: 100% Aligned with Production "Yearly Sales Summary By Customer"
-- =========================================================================

CREATE VIEW dbo.VW_Web_SalesDashboard
AS
SELECT        
    HD.OrdID, 
    HD.OrdNo, 
    HD.OrdDate, 
    YEAR(HD.OrdDate) AS OrdYear, 
    MONTH(HD.OrdDate) AS OrdMonth, 
    DATEPART(isowk, HD.OrdDate) AS OrdWeek,
    HD.DueDate,
    ISNULL(HD.CustDueDate, HD.DueDate) AS CustDueDate,
    
    -- Customer Information
    HD.CustCode, 
    CUST.CustName, 
    CUST.CustStatus, 
    
    -- Sales Information
    ISNULL(CUST.SalesName, HD.SalesName) AS SalesName, 
    EMP.EmpType,      -- [อิงตามระบบเก่า] เพื่อใช้แยกสิทธิ์ว่าเป็น 'SLA', 'SLC', ฯลฯ
    EMP.SalesLV,      -- [อิงตามระบบเก่า] เพื่อใช้เรียงลำดับใน Dropdown
    
    HD.PONo,
    HD.EXNo AS PO2,
    HD.CustMultiAddr AS ShipTo,
    HD.OrdMaker,
    HD.OrdStamp,

    -- Item Information
    DT.OrdLineNo,
    DT.ItemNo, 
    LEFT(DT.ItemNo, 8) AS [Item SKU],
    DT.ItemCust AS [Cust Item],

    HD.OrdType AS ProductType,

    DT.ItemType,
    DT.ItemMat,
    DT.ItemSize,
    DT.ItemStone,
    DT.ItemDesc,
    DT.ItemPlate,
    DT.SetType,
    HD.CurrCode AS Currency,
    ISNULL(DT.ItemWeight, 0) AS ItemWeight,

    -- Quantities
    ISNULL(DT.ItemQty, 0) AS ItemQty, 
    ISNULL(DT.ExportQty, 0) AS ExportQty,
    CASE 
        WHEN ISNULL(DT.ItemQty, 0) > ISNULL(DT.ExportQty, 0) 
            THEN ISNULL(DT.ItemQty, 0) - ISNULL(DT.ExportQty, 0) 
        ELSE 0 
    END AS OpenQty,

    -- Financial Amounts
    ISNULL(DT.ItemPrice, 0) AS ItemPrice,
    ISNULL(DT.ItemExchAmnt, DT.ItemAmnt) AS ItemAmnt, 
    ISNULL(DT.ExportAmnt, 0) AS ExportAmnt,
    ISNULL(HD.SumOrdExchAmnt, 0.0) AS SumOrdExchAmnt, -- [อิงตามระบบเก่า] เป็น Field ยอดรวมที่ใช้คิดในหน้ารายปี

    -- Order Status
    ISNULL(HD.OrdStatus, 'P') AS OrdStatus,
    ISNULL(HD.CloseStatus, 'N') AS CloseStatus

FROM dbo.OrdHD AS HD WITH (NOLOCK)
INNER JOIN dbo.OrdDT AS DT WITH (NOLOCK)
    ON HD.OrdID = DT.OrdID AND HD.OrdNo = DT.OrdNo 
LEFT OUTER JOIN dbo.GMCust AS CUST WITH (NOLOCK)
    ON HD.CustCode = CUST.CustCode
LEFT OUTER JOIN dbo.GMEmp AS EMP WITH (NOLOCK)
    ON ISNULL(CUST.SalesName, HD.SalesName) = EMP.SalesName
WHERE 
    -- 1. Exclude cancelled orders
    (ISNULL(HD.OrdStatus, N'') <> 'C') 
    
    -- 2. Include active customers only (อิงระบบเก่า: GMCust.CustStatus = 'Y')
    AND (ISNULL(CUST.CustStatus, N'Y') = 'Y')
    
    -- 3. Exclude non-sales orders (อิงระบบเก่า 100%: SUBSTRING(a.OrdNo,1,3) NOT IN ('BBP','BBK',...))
    AND (SUBSTRING(HD.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD'))

    -- 4. Exclude test, stock and blank POs
    AND (LTRIM(RTRIM(ISNULL(HD.PONo, ''))) NOT IN ('', 'TOP', 'Test', 'Testing', 'Stock', 'STOCK'));
GO
