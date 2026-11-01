USE [dbGeneration]
GO
/****** Object:  StoredProcedure [dbo].[PC_Show_OrdTrack_Sum_All]    Script Date: 25/09/2026 16:40 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ========================================================================
-- Author : <PRAWAT>
-- Create Date : <01/02/2025>
-- Modify Date : <01/02/2025>
-- Description : <Show Order Tracker Summary All>
-- ========================================================================

ALTER PROCEDURE [dbo].[PC_Show_OrdTrack_Sum_All]
	
	@FromDate DateTime,
	@ToDate DateTime
	--@CustCode Varchar(10)
	--@SalesName Varchar(20)

AS

BEGIN

	SET NOCOUNT ON;

WITH OrdDT_Aggregate AS (
    SELECT 
        T2.PONo,
        T2.OrdKind,
        T2.OrdMat,
        COUNT(OrdDT.ItemNo) AS SumItem,
        SUM(OrdDT.ItemQty) AS SumQty,
        SUM(ISNULL(OrdDT.StoneQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS StonePenQty,
        SUM(ISNULL(OrdDT.FitQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS FitPenQty,
        SUM(ISNULL(OrdDT.WijQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS WijPenQty,
        SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(WstQty,0) - ISNULL(WijQty,0) ELSE ISNULL(WstQty,0) - ISNULL(ItemQty,0) END) AS WstPenQty,
        SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(CastQty,0) - ISNULL(WijQty,0) ELSE ISNULL(CastQty,0) - ISNULL(ItemQty,0) END) AS CastPenQty,
        SUM(ISNULL(OrdDT.ControlQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS ControlPenQty,
        SUM(CASE WHEN CastQty = ItemQty THEN ISNULL(GrindQty,0) - ISNULL(CastQty,0) ELSE ISNULL(GrindQty,0) - ISNULL(ItemQty,0) END) AS GrindPenQty,
        SUM(CASE WHEN GrindQty = ItemQty THEN ISNULL(PolishQty,0) - ISNULL(GrindQty,0) ELSE ISNULL(PolishQty,0) - ISNULL(ItemQty,0) END) AS PolishPenQty,
        SUM(CASE WHEN PolishQty = ItemQty THEN ISNULL(PlateQty,0) - ISNULL(PolishQty,0) ELSE ISNULL(PlateQty,0) - ISNULL(ItemQty,0) END) AS PlatePenQty,
		SUM(CASE WHEN PlateQty = ItemQty THEN ISNULL(QCQty,0) - ISNULL(PlateQty,0) ELSE ISNULL(QCQty,0) - ISNULL(ItemQty,0) END) AS QCPenQty,
		SUM(ISNULL(OrdDT.FinishQty,0) - ISNULL(OrdDT.ItemQty,0)) AS UnFinishQty,
		SUM(ISNULL(OrdDT.FinishQty,0)) AS FinishQty,
        SUM(OrdDT.ItemExchAmnt) AS SumAmnt,
		MAX(CAST(GMItemPhoto.ItemPhoto AS VARBINARY(MAX))) AS ItemPhoto
        --MAX(GMItemPhoto.ItemPhoto) AS ItemPhoto
    FROM OrdDT
    LEFT JOIN OrdHD T2 ON T2.OrdNo = OrdDT.OrdNo
    LEFT JOIN GMItemPhoto ON GMItemPhoto.ItemNo = OrdDT.ItemNo
	WHERE T2.OrdDate BETWEEN @FromDate AND @ToDate
	AND SUBSTRING(T2.OrdNo,1,3) IN ('BBC','BBQ','BBP','BBK','BBS','BBE','BBL','BBR','BBT')
    GROUP BY T2.PONo, T2.OrdKind, T2.OrdMat
)

SELECT  
ROW_NUMBER() OVER (ORDER BY OrdWeekPlanHD.PlanYear, OrdWeekPlanHD.PlanWeek,
OrdHD.CustCode, OrdHD.PONo, OrdHD.OrdKind, OrdHD.OrdMat) AS ListNo,
ISNULL(OrdWeekPlanHD.PlanYear, 0) AS OrdYear,
ISNULL(OrdWeekPlanHD.PlanWeek, 0) AS OrdWeek,
OrdHD.CustCode, OrdHD.PONo,
LTRIM(RTRIM(STUFF((SELECT DISTINCT '/ ' + T1.OrdNo 
FROM OrdHD T1 
WHERE OrdHD.PONo = T1.PONo
AND OrdHD.OrdKind = T1.OrdKind
AND OrdHD.OrdMat = T1.OrdMat
AND T1.OrdNo <> '' 
FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, ''))) AS OrdNo,
CASE WHEN OrdHD.OrdKind = 'NEW' THEN 'New' ELSE 'Replen' END AS OrdKind,
OrdHD.OrdMat, OrdHD.CustMultiAddr,
OrdDT_Aggregate.ItemPhoto,
OrdHD.OrdDate, OrdHD.DueDate,
OrdTrackDT.TrackTest, OrdTrackDT.OrdSGS,
OrdHD.CustQCDate, OrdHD.CustDueDate,
OrdTrackDT.OORDate,
OrdDT_Aggregate.SumItem,
OrdDT_Aggregate.SumQty,
OrdTrackDT.BookDate,
OrdTrackDT.QC1_Qty, OrdTrackDT.QC1_Date,
OrdTrackDT.QC1_Fail,
OrdTrackDT.QC2_Qty, OrdTrackDT.QC2_Date,
OrdTrackDT.QC2_Fail,
OrdTrackDT.QC3_Qty, OrdTrackDT.QC3_Date,
OrdDT_Aggregate.StonePenQty,
OrdDT_Aggregate.FitPenQty,
OrdDT_Aggregate.WijPenQty,
OrdDT_Aggregate.WstPenQty,
OrdDT_Aggregate.CastPenQty,
OrdDT_Aggregate.ControlPenQty,
OrdDT_Aggregate.GrindPenQty,
OrdDT_Aggregate.PolishPenQty,
OrdDT_Aggregate.PlatePenQty,
OrdDT_Aggregate.QCPenQty,
OrdDT_Aggregate.UnFinishQty,
OrdDT_Aggregate.FinishQty,
OrdTrackDT.ProdRiskIssue, OrdTrackDT.PQCPlanShip,
OrdTrackDT.PackCard, OrdTrackDT.TickOrd,
OrdTrackDT.TickRec, OrdTrackDT.TrackSam,
OrdTrackDT.TrackCT, OrdTrackDT.TrackMF,
OrdTrackDT.PackScanDo, OrdTrackDT.PackScanSen,
OrdTrackDT.PackScanAppv, OrdTrackDT.PackScanMF,
OrdTrackDT.PolyOrd, OrdTrackDT.PolyRec,
OrdTrackDT.TagRcyRec, OrdTrackDT.TrackRemark,
OrdDT_Aggregate.SumAmnt

FROM OrdHD
LEFT JOIN OrdWeekPlanHD ON OrdWeekPlanHD.PlanDate = OrdHD.DueDate
LEFT JOIN VPC_OrdSum_Detail ON OrdHD.OrdNo = VPC_OrdSum_Detail.OrdNo 
LEFT JOIN OrdTrackDT ON OrdTrackDT.CustCode = OrdHD.CustCode
AND OrdTrackDT.PONo = OrdHD.PONo
AND OrdTrackDT.OrdMat = OrdHD.OrdMat
AND OrdTrackDT.OrdKind = OrdHD.OrdKind
LEFT JOIN OrdDT_Aggregate ON OrdHD.PONo = OrdDT_Aggregate.PONo
AND OrdHD.OrdKind = OrdDT_Aggregate.OrdKind
AND OrdHD.OrdMat = OrdDT_Aggregate.OrdMat

WHERE OrdHD.OrdDate BETWEEN @FromDate AND @ToDate
AND SUBSTRING(OrdHD.OrdNo,1,3) IN ('BBC','BBQ','BBP','BBK','BBS','BBE','BBL','BBR','BBT')

--AND SUBSTRING(OrdHD.OrdNo,1,3) NOT IN ('BBD','BBI','BBF','LLC','LBC','LBS','LBR','LBT')
--AND VPC_OrdSum_Detail.ItemStatus <> 'C'
--AND (CloseRes <> 'Close Old Order From Old System' OR CloseRes IS NULL)
--AND OrdHD.CustCode LIKE @CustCode + '%'
--AND OrdHD.SalesName LIKE @SalesName + '%'


GROUP BY PlanYear, PlanWeek,
OrdHD.CustCode, OrdHD.PONo,
OrdHD.OrdKind, OrdHD.OrdMat,
OrdHD.CustMultiAddr,
OrdDT_Aggregate.ItemPhoto,
OrdHD.OrdDate, OrdHD.DueDate,
OrdTrackDT.TrackTest, OrdTrackDT.OrdSGS,
OrdHD.CustQCDate, OrdHD.CustDueDate,
OrdTrackDT.OORDate,
OrdDT_Aggregate.SumItem,
OrdDT_Aggregate.SumQty,
OrdTrackDT.BookDate,
OrdTrackDT.QC1_Qty, OrdTrackDT.QC1_Date,
OrdTrackDT.QC1_Fail,
OrdTrackDT.QC2_Qty, OrdTrackDT.QC2_Date,
OrdTrackDT.QC2_Fail,
OrdTrackDT.QC3_Qty, OrdTrackDT.QC3_Date,
OrdDT_Aggregate.StonePenQty,
OrdDT_Aggregate.FitPenQty,
OrdDT_Aggregate.WijPenQty,
OrdDT_Aggregate.WstPenQty,
OrdDT_Aggregate.CastPenQty,
OrdDT_Aggregate.ControlPenQty,
OrdDT_Aggregate.GrindPenQty,
OrdDT_Aggregate.PolishPenQty,
OrdDT_Aggregate.PlatePenQty,
OrdDT_Aggregate.QCPenQty,
OrdDT_Aggregate.UnFinishQty,
OrdDT_Aggregate.FinishQty,
OrdTrackDT.ProdRiskIssue, OrdTrackDT.PQCPlanShip,
OrdTrackDT.PackCard, OrdTrackDT.TickOrd,
OrdTrackDT.TickRec, OrdTrackDT.TrackSam,
OrdTrackDT.TrackCT, OrdTrackDT.TrackMF,
OrdTrackDT.PackScanDo, OrdTrackDT.PackScanSen,
OrdTrackDT.PackScanAppv, OrdTrackDT.PackScanMF,
OrdTrackDT.PolyOrd, OrdTrackDT.PolyRec,
OrdTrackDT.TagRcyRec, OrdTrackDT.TrackRemark,
OrdDT_Aggregate.SumAmnt

ORDER BY OrdYear,OrdWeek,ListNo


	
END