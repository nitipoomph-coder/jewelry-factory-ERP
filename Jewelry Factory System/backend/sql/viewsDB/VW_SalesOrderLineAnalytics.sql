/*
  Reviewed definition for dbo.VW_SalesOrderLineAnalytics.
  TEST DATABASE ONLY. This has not been approved for production.
  Run manually against the test database after review.
  This file is not executed by the application.
*/

ALTER VIEW dbo.VW_SalesOrderLineAnalytics
AS
SELECT
  -- Stable order-version identity
  h.OrdID AS OrderID,
  h.OrdNo AS OrderNo,
  d.OrdLineNo AS OrderLineNo,

  -- Dates
  h.OrdDate AS OrderDate,
  h.DueDate AS FactoryDueDate,
  h.CustDueDate AS CustomerDueDate,
  h.ExportDate AS ShipDate,
  h.CreateDate AS OrderCreateDate,

  -- Month dimensions
  DATEADD(MONTH, DATEDIFF(MONTH, 0, h.OrdDate), 0) AS OrderMonth,
  DATEADD(MONTH, DATEDIFF(MONTH, 0, h.DueDate), 0) AS FactoryDueMonth,
  DATEADD(MONTH, DATEDIFF(MONTH, 0, h.CustDueDate), 0) AS CustomerDueMonth,
  DATEADD(MONTH, DATEDIFF(MONTH, 0, h.ExportDate), 0) AS ShipMonth,
  YEAR(h.OrdDate) AS OrderYear,
  MONTH(h.OrdDate) AS OrderMonthNo,
  YEAR(h.CustDueDate) AS CustomerDueYear,
  MONTH(h.CustDueDate) AS CustomerDueMonthNo,

  -- Customer and order
  h.CustCode AS CustomerCode,
  c.CustName AS CustomerName,
  c.CustStatus AS CustomerStatus,
  c.Country AS Market,
  COALESCE(
    NULLIF(h.SalesName, N''),
    NULLIF(c.SalesName, N''),
    N'Unassigned'
  ) AS SalesName,
  h.SoldTo AS Brand,
  h.PONo AS PONo,
  h.EXNo AS PO2,
  h.ShipTo AS ShipTo,
  h.OrdStamp AS OrderStamp,
  h.OrdMaker AS OrderMaker,

  -- Item
  d.ItemNo AS ItemNo,
  COALESCE(
    NULLIF(LTRIM(RTRIM(d.GoodCode)), N''),
    d.ItemNo
  ) AS ItemSKU,
  d.ItemType AS ItemType,
  CASE
    WHEN UPPER(LEFT(ISNULL(d.ItemNo, N''), 3)) IN (N'BBS', N'BES', N'BNS', N'BRS')
      THEN UPPER(LEFT(d.ItemNo, 3))
    WHEN LEFT(UPPER(ISNULL(d.ItemType, N'')), 1) IN (N'B', N'T')
      THEN N'BBS'
    WHEN LEFT(UPPER(ISNULL(d.ItemType, N'')), 1) = N'E'
      THEN N'BES'
    WHEN LEFT(UPPER(ISNULL(d.ItemType, N'')), 1) = N'N'
      THEN N'BNS'
    WHEN LEFT(UPPER(ISNULL(d.ItemType, N'')), 1) = N'R'
      THEN N'BRS'
    ELSE N'OTHERS'
  END AS ProductType,
  d.ItemCust AS CustomerItem,
  d.ItemMat AS ItemMaterial,
  d.ItemSize AS ItemSize,
  d.ItemStone AS ItemStone,
  d.ItemDesc AS ItemDescription,
  d.ItemPlate AS ItemPlate,
  d.SetType AS SetType,

  -- Amount and quantity
  h.CurrCode AS Currency,
  ISNULL(d.ItemWeight, 0) AS ItemWeight,
  ISNULL(d.ItemQty, 0) AS OrderQty,
  ISNULL(d.ExportQty, 0) AS ShippedQty,
  CASE
    WHEN ISNULL(d.ItemQty, 0) > ISNULL(d.ExportQty, 0)
      THEN ISNULL(d.ItemQty, 0) - ISNULL(d.ExportQty, 0)
    ELSE 0
  END AS OpenQty,
  ISNULL(d.ItemPrice, 0) AS ItemPrice,
  COALESCE(d.ItemExchAmnt, d.ItemAmnt, 0) AS OrderAmount,
  ISNULL(d.ExportAmnt, 0) AS ShippedAmount,
  CASE
    WHEN COALESCE(d.ItemExchAmnt, d.ItemAmnt, 0) > ISNULL(d.ExportAmnt, 0)
      THEN COALESCE(d.ItemExchAmnt, d.ItemAmnt, 0) - ISNULL(d.ExportAmnt, 0)
    ELSE 0
  END AS OpenAmount,

  -- Source statuses for filtering and duplicate-version review
  h.OrdStatus AS OrderStatus,
  h.CloseStatus AS CloseStatus
FROM dbo.OrdHD AS h
INNER JOIN dbo.OrdDT AS d
  ON d.OrdID = h.OrdID
 AND d.OrdNo = h.OrdNo
LEFT JOIN dbo.GMCust AS c
  ON c.CustCode = h.CustCode
WHERE d.ItemNo IS NOT NULL;
