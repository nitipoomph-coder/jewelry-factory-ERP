USE [dbGeneration];
GO

-- ==========================================
-- 1. OrdHD(OrdDate, CustCode)
-- ==========================================
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_OrdDate_CustCode' AND object_id = OBJECT_ID('dbo.OrdHD'))
BEGIN
    DROP INDEX IX_OrdHD_OrdDate_CustCode ON dbo.OrdHD;
    PRINT 'Dropped IX_OrdHD_OrdDate_CustCode';
END
GO
CREATE NONCLUSTERED INDEX IX_OrdHD_OrdDate_CustCode 
ON dbo.OrdHD (OrdDate, CustCode) 
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
PRINT 'Created IX_OrdHD_OrdDate_CustCode';
GO

-- ==========================================
-- 2. OrdHD(CustDueDate, CustCode)
-- ==========================================
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_CustDueDate_CustCode' AND object_id = OBJECT_ID('dbo.OrdHD'))
BEGIN
    DROP INDEX IX_OrdHD_CustDueDate_CustCode ON dbo.OrdHD;
    PRINT 'Dropped IX_OrdHD_CustDueDate_CustCode';
END
GO
CREATE NONCLUSTERED INDEX IX_OrdHD_CustDueDate_CustCode 
ON dbo.OrdHD (CustDueDate, CustCode) 
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
PRINT 'Created IX_OrdHD_CustDueDate_CustCode';
GO

-- ==========================================
-- 3. OrdDT(OrdID, OrdNo) สำหรับ View Join
-- ==========================================
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdDT_OrdID_OrdNo' AND object_id = OBJECT_ID('dbo.OrdDT'))
BEGIN
    DROP INDEX IX_OrdDT_OrdID_OrdNo ON dbo.OrdDT;
    PRINT 'Dropped IX_OrdDT_OrdID_OrdNo';
END
GO
CREATE NONCLUSTERED INDEX IX_OrdDT_OrdID_OrdNo 
ON dbo.OrdDT (OrdID, OrdNo) 
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
PRINT 'Created IX_OrdDT_OrdID_OrdNo';
GO

-- ==========================================
-- 4. GMCust(CustCode)
-- ==========================================
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GMCust_CustCode_SalesAnalytics' AND object_id = OBJECT_ID('dbo.GMCust'))
BEGIN
    DROP INDEX IX_GMCust_CustCode_SalesAnalytics ON dbo.GMCust;
    PRINT 'Dropped IX_GMCust_CustCode_SalesAnalytics';
END
GO
CREATE NONCLUSTERED INDEX IX_GMCust_CustCode_SalesAnalytics 
ON dbo.GMCust (CustCode) 
INCLUDE (CustName, SalesName, CustStatus, Country)
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
PRINT 'Created IX_GMCust_CustCode_SalesAnalytics';
GO

-- ==========================================
-- 5. GMGoodType(GoodTypeCode)
-- ==========================================
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GMGoodType_GoodTypeCode_SalesAnalytics' AND object_id = OBJECT_ID('dbo.GMGoodType'))
BEGIN
    DROP INDEX IX_GMGoodType_GoodTypeCode_SalesAnalytics ON dbo.GMGoodType;
    PRINT 'Dropped IX_GMGoodType_GoodTypeCode_SalesAnalytics';
END
GO
CREATE NONCLUSTERED INDEX IX_GMGoodType_GoodTypeCode_SalesAnalytics 
ON dbo.GMGoodType (GoodTypeCode) 
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
PRINT 'Created IX_GMGoodType_GoodTypeCode_SalesAnalytics';
GO
