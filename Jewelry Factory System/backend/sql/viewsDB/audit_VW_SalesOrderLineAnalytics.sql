/*
  Read-only audit for dbo.VW_SalesOrderLineAnalytics.
  TEST DATABASE ONLY. Results must not be treated as production results.
  SQL Server 2012 compatible. This script does not modify data.
*/

SET NOCOUNT ON;

DECLARE @FromYear int = 2025;
DECLARE @ToYear int = 2026;

-- 1. Compare the current OrdNo-only join with the intended order-version join.
SELECT
  (SELECT COUNT_BIG(*)
   FROM dbo.VW_SalesOrderLineAnalytics) AS CurrentViewRows,
  (SELECT COUNT_BIG(*)
   FROM dbo.OrdHD h
   INNER JOIN dbo.OrdDT d
     ON d.OrdID = h.OrdID
    AND d.OrdNo = h.OrdNo
   WHERE d.ItemNo IS NOT NULL) AS CorrectPairRows;

-- 2. Header versions that share an order number.
WITH DuplicateOrderNumbers AS (
  SELECT OrdNo
  FROM dbo.OrdHD
  GROUP BY OrdNo
  HAVING COUNT(*) > 1
)
SELECT
  h.OrdID,
  h.OrdNo,
  h.OrdDate,
  h.DueDate,
  h.CreateDate,
  h.OrdStatus,
  h.CloseStatus,
  h.CustCode,
  h.PONo
FROM DuplicateOrderNumbers x
INNER JOIN dbo.OrdHD h ON h.OrdNo = x.OrdNo
ORDER BY h.OrdNo, h.OrdID;

-- 3. Rows created by matching the correct and incorrect OrdID versions.
WITH DuplicateOrderNumbers AS (
  SELECT OrdNo
  FROM dbo.OrdHD
  GROUP BY OrdNo
  HAVING COUNT(*) > 1
)
SELECT
  h.OrdNo,
  h.OrdID AS HeaderOrdID,
  d.OrdID AS DetailOrdID,
  d.OrdLineNo,
  d.ItemNo,
  d.ItemQty,
  d.ExportQty,
  COALESCE(d.ItemExchAmnt, d.ItemAmnt, 0) AS OrderAmount,
  CASE WHEN h.OrdID = d.OrdID THEN 'MATCH' ELSE 'CROSS_MATCH' END AS JoinResult
FROM DuplicateOrderNumbers x
INNER JOIN dbo.OrdHD h ON h.OrdNo = x.OrdNo
INNER JOIN dbo.OrdDT d ON d.OrdNo = h.OrdNo
ORDER BY h.OrdNo, h.OrdID, d.OrdID, d.OrdLineNo;

-- 4. Source relationship gaps.
SELECT
  SUM(CASE WHEN h.OrdID IS NULL THEN 1 ELSE 0 END) AS DetailRowsWithoutHeader,
  COUNT_BIG(*) AS TotalDetailRows
FROM dbo.OrdDT d
LEFT JOIN dbo.OrdHD h
  ON h.OrdID = d.OrdID
 AND h.OrdNo = d.OrdNo;

SELECT
  SUM(CASE WHEN d.OrdID IS NULL THEN 1 ELSE 0 END) AS HeadersWithoutDetail,
  COUNT_BIG(*) AS TotalHeaderRows
FROM dbo.OrdHD h
LEFT JOIN (
  SELECT DISTINCT OrdID, OrdNo
  FROM dbo.OrdDT
) d
  ON d.OrdID = h.OrdID
 AND d.OrdNo = h.OrdNo;

-- 5. Repeated line numbers. Multiple items on one line are listed, not deleted.
WITH RepeatedLines AS (
  SELECT
    d.OrdID,
    d.OrdNo,
    d.OrdLineNo,
    COUNT(*) AS DetailRows,
    COUNT(DISTINCT ISNULL(d.ItemNo, '<NULL>')) AS DistinctItems
  FROM dbo.OrdDT d
  GROUP BY d.OrdID, d.OrdNo, d.OrdLineNo
  HAVING COUNT(*) > 1
)
SELECT
  YEAR(h.OrdDate) AS OrderYear,
  r.OrdID,
  r.OrdNo,
  r.OrdLineNo,
  r.DetailRows,
  r.DistinctItems
FROM RepeatedLines r
LEFT JOIN dbo.OrdHD h
  ON h.OrdID = r.OrdID
 AND h.OrdNo = r.OrdNo
ORDER BY OrderYear DESC, r.OrdNo, r.OrdLineNo;

-- 6. Repeated sales values even when production-tracking columns differ.
SELECT
  h.OrdDate,
  d.OrdID,
  d.OrdNo,
  d.OrdLineNo,
  d.ItemNo,
  d.ItemQty,
  d.ExportQty,
  COALESCE(d.ItemExchAmnt, d.ItemAmnt, 0) AS OrderAmount,
  COUNT(*) AS RepeatedRows
FROM dbo.OrdDT d
LEFT JOIN dbo.OrdHD h
  ON h.OrdID = d.OrdID
 AND h.OrdNo = d.OrdNo
GROUP BY
  h.OrdDate,
  d.OrdID,
  d.OrdNo,
  d.OrdLineNo,
  d.ItemNo,
  d.GoodCode,
  d.ItemQty,
  d.ExportQty,
  d.ItemPrice,
  d.ItemAmnt,
  d.ItemExchAmnt,
  d.ExportAmnt
HAVING COUNT(*) > 1
ORDER BY h.OrdDate DESC, d.OrdNo, d.OrdLineNo;

-- 7. Repeated lines inside the current Customer Trends scope.
WITH CurrentSalesScope AS (
  SELECT
    h.OrdID,
    h.OrdNo,
    h.OrdDate,
    d.OrdLineNo,
    d.ItemNo
  FROM dbo.OrdHD h
  INNER JOIN dbo.OrdDT d
    ON d.OrdID = h.OrdID
   AND d.OrdNo = h.OrdNo
  LEFT JOIN dbo.GMCust c ON c.CustCode = h.CustCode
  WHERE YEAR(h.OrdDate) BETWEEN @FromYear AND @ToYear
    AND SUBSTRING(h.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')
    AND (h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%')
    AND ISNULL(c.CustStatus, 'Y') = 'Y'
    AND d.ItemNo IS NOT NULL
)
SELECT
  OrdID,
  OrdNo,
  OrdLineNo,
  COUNT(*) AS DetailRows,
  COUNT(DISTINCT ItemNo) AS DistinctItems
FROM CurrentSalesScope
GROUP BY OrdID, OrdNo, OrdLineNo
HAVING COUNT(*) > 1
ORDER BY OrdNo, OrdLineNo;
