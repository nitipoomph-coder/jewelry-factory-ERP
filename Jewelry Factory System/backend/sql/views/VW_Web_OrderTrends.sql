-- =========================================================================
-- View: dbo.VW_Web_OrderTrends
-- Database: dbGeneration (SQL Server 2012+)
-- Description: Central View for Order Trends, Delivery Outlook, and Department Bottlenecks
-- Privacy: Uses CustCode as primary identifier (No confidential CustName)
-- =========================================================================

CREATE VIEW dbo.VW_Web_OrderTrends
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
    HD.CustCode,
    CUST.CustStatus,
    HD.PONo,
    HD.EXNo AS PO2,
    CASE WHEN UPPER(ISNULL(HD.OrdKind, '')) = 'NEW' THEN 'New' ELSE 'Replen' END AS OrdKind,
    ISNULL(DT.ItemMat, ISNULL(HD.OrdMat, '')) AS Metal,
    HD.CustMultiAddr AS ShipTo,
    
    -- Item Information
    DT.OrdLineNo,
    DT.ItemNo,
    LEFT(DT.ItemNo, 8) AS [Item SKU],
    DT.ItemCust AS [Cust Item],

    -- Product Type Logic
    CASE 
        WHEN UPPER(LEFT(ISNULL(DT.ItemNo, ''), 3)) IN ('BBS', 'BES', 'BNS', 'BRS') 
            THEN UPPER(LEFT(ISNULL(DT.ItemNo, ''), 3)) 
        WHEN UPPER(ISNULL(DT.ItemType, '')) IN ('BBS', 'BES', 'BNS', 'BRS') 
            THEN UPPER(DT.ItemType) 
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) IN ('B', 'T') 
            THEN 'BBS' 
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) = 'E' 
            THEN 'BES' 
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) = 'N' 
            THEN 'BNS' 
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) = 'R' 
            THEN 'BRS' 
        ELSE 'Others' 
    END AS ProductType,

    DT.ItemType,
    DT.ItemMat,
    DT.ItemSize,
    DT.ItemStone,
    DT.ItemPlate,
    
    -- Quantities
    ISNULL(DT.ItemQty, 0) AS ItemQty,
    ISNULL(DT.ExportQty, 0) AS ExportQty,
    CASE 
        WHEN ISNULL(DT.ItemQty, 0) > ISNULL(DT.ExportQty, 0) 
            THEN ISNULL(DT.ItemQty, 0) - ISNULL(DT.ExportQty, 0) 
        ELSE 0 
    END AS OpenQty,

    -- Financial Amounts ($ USD)
    ISNULL(DT.ItemPrice, 0) AS ItemPrice,
    ISNULL(DT.ItemExchAmnt, DT.ItemAmnt) AS ItemAmnt,
    ISNULL(DT.ExportAmnt, 0) AS ExportAmnt,

    -- Process Quantities in Factory
    ISNULL(DT.CastQty, 0) AS CastQty,
    ISNULL(DT.GrindQty, 0) AS GrindQty,
    ISNULL(DT.FilQty, 0) AS FilQty,
    ISNULL(DT.SolQty, 0) AS SolQty,
    ISNULL(DT.SetQty, 0) AS SetQty,
    ISNULL(DT.PolishQty, 0) AS PolishQty,
    ISNULL(DT.PlateQty, 0) AS PlateQty,
    ISNULL(DT.QCQty, 0) AS QCQty,
    ISNULL(DT.PackQty, 0) AS PackQty,

    -- 1. Days to Customer Due Date
    DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(ISNULL(HD.CustDueDate, HD.DueDate) AS DATE)) AS DaysToCustDue,

    -- 2. Delivery Risk Bucket (Based on CustDueDate)
    CASE 
        WHEN ISNULL(DT.ExportQty, 0) >= ISNULL(DT.ItemQty, 0) AND ISNULL(DT.ItemQty, 0) > 0 THEN 'Shipped'
        WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(ISNULL(HD.CustDueDate, HD.DueDate) AS DATE)) < 0 THEN 'Overdue'
        WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(ISNULL(HD.CustDueDate, HD.DueDate) AS DATE)) BETWEEN 0 AND 15 THEN 'Due in 15 Days'
        WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(ISNULL(HD.CustDueDate, HD.DueDate) AS DATE)) BETWEEN 16 AND 30 THEN 'Due in 16-30 Days'
        ELSE 'Future Due'
    END AS DueRiskBucket,

    -- 3. Current Department where work is located in factory
    CASE 
        WHEN ISNULL(DT.ExportQty, 0) >= ISNULL(DT.ItemQty, 0) AND ISNULL(DT.ItemQty, 0) > 0 THEN 'Shipped'
        WHEN ISNULL(DT.PackQty, 0) > 0 THEN 'Packing'
        WHEN ISNULL(DT.QCQty, 0) > 0 THEN 'QC'
        WHEN ISNULL(DT.PlateQty, 0) > 0 THEN 'Plating'
        WHEN ISNULL(DT.PolishQty, 0) > 0 THEN 'Polishing'
        WHEN ISNULL(DT.SetQty, 0) > 0 THEN 'Setting'
        WHEN (ISNULL(DT.FilQty, 0) > 0 OR ISNULL(DT.SolQty, 0) > 0) THEN 'Filing'
        WHEN ISNULL(DT.GrindQty, 0) > 0 THEN 'Grinding'
        WHEN ISNULL(DT.CastQty, 0) > 0 THEN 'Casting'
        ELSE 'Wax / Preparation'
    END AS CurrentDepartment,

    -- Order Status
    ISNULL(HD.OrdStatus, 'P') AS OrdStatus,
    ISNULL(HD.CloseStatus, 'N') AS CloseStatus

FROM dbo.OrdHD AS HD WITH (NOLOCK)
INNER JOIN dbo.OrdDT AS DT WITH (NOLOCK)
    ON HD.OrdID = DT.OrdID AND HD.OrdNo = DT.OrdNo
LEFT OUTER JOIN dbo.GMCust AS CUST WITH (NOLOCK)
    ON HD.CustCode = CUST.CustCode
WHERE 
    (ISNULL(HD.OrdStatus, '') <> 'C')
    AND (ISNULL(CUST.CustStatus, 'Y') = 'Y')
    AND (SUBSTRING(HD.OrdNo, 1, 3) IN ('BBC', 'BBS', 'BBE', 'BBL', 'BBR', 'BBT', 'BBP'))
    AND (LTRIM(RTRIM(ISNULL(HD.PONo, ''))) NOT IN ('', 'TOP', 'Test', 'Testing', 'Stock', 'STOCK'));
GO
