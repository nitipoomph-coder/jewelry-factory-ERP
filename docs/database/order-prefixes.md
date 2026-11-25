# Order Number Prefixes

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## Order Prefixes Analysis (As of May 25, 2026)

Based on latest order activity analysis (latest `OrdDate`) across the complete `OrdHD` table, order prefixes are categorized into active and obsolete groups:

**Prefix meanings** (legacy PCC menu `FrmMain.Designer.vb`, matched against live data 2026-11-19): BBC customer order · BBQ QA / TOP / testing samples · BBP pre-production order (season POs such as `HO26`, mostly no price, not exported) · BBK stock order · BBS showroom order · BBE external outsource · BBL location split export order (splits the quantity of an existing BBC order per ship-to — counting both double-counts) · BBR repair order · BBT returns from customer · BBF finish order resell · BBX extra qty order · BBD development samples to ship · BBI development samples, incomplete item cost. Sales views (`VW_Web_SalesDashboard`) leave out BBP, BBK, BBS, BBL, BBT, BBD like the legacy sales reports.

### ✅ Active Orders (Active with transactions in 2025–2026)
| Prefix | Total Order Count | Latest Activity | Operational Notes |
|--------|-------------------|-----------------|-------------------|
| **BBC** | 118,809 | 2026-05-25 | Mapped to legacy system button |
| **BBQ** | 14,221 | 2026-05-25 | Mapped to legacy system button |
| **BBD** | 5,206 | 2026-05-25 | ⚠️ No legacy button, but actively used |
| **BBI** | 818 | 2026-05-22 | ⚠️ No legacy button, but actively used |
| **BBF** | 62 | 2026-05-21 | Mapped to legacy system button |
| **BBP** | 1,461 | 2026-05-19 | Mapped to legacy system button |
| **BBT** | 1,126 | 2026-05-15 | Mapped to legacy system button |
| **BBX** | 189 | 2026-05-08 | ⚠️ No legacy button, but actively used |
| **BBK** | 353 | 2026-04-30 | Mapped to legacy system button |
| **BBR** | 1,610 | 2026-04-09 | Mapped to legacy system button |
| **BBL** | 4,909 | 2026-04-09 | Mapped to legacy system button |
| **BBS** | 762 | 2026-04-06 | Mapped to legacy system button |
| **BBE** | 38 | 2025-04-29 | Mapped to legacy system button |

### ❌ Inactive/Dead/Sample Orders (Obsolete historical records excluded from analytics)
*These prefixes have had no transactions for multiple years and are excluded from Dashboard metrics to protect statistical accuracy:*

- **BTC** (5,231) — Latest 2022-10-14
- **BBA** (3,354) — Latest 2022-10-13
- **BOC** (1,378) — Latest 2022-10-12
- **BPC** (1,263) — Latest 2022-09-30
- **LBC** (608) — Latest 2020-11-26
- **LBS** (104) — Latest 2020-05-13 *(Sample prototypes)*
- **LBT** (17) — Latest 2020-02-28
- **BTS** (1) — Latest 2020-01-08
- **LLC** (239) — Latest 2016-07-29
- **GBT** (296) — Latest 2016-03-02
- **IBT** (37) — Latest 2016-02-18
- **SBC** (6,005) — Latest 2016-02-08
- **SBT** (3,151) — Latest 2015-12-23
- **CBT** (146) — Latest 2015-10-23
- **SPC** (337) — Latest 2015-09-11
- **SPT** (143) — Latest 2015-08-21
- **KBT** (586) — Latest 2015-08-19
- **KPT** (87) — Latest 2015-08-19
- **BRC** (11) — Latest 2015-07-17
- **GGT** (1) — Latest 2015-06-25
- **CPT** (13) — Latest 2015-03-23
- **CBC** (379) — Latest 2015-02-02
- **BLC** (5) — Latest 2014-10-27
- **BPT** (256) — Latest 2013-03-26
- **GPT** (4) — Latest 2013-03-23
- **BTT** (20) — Latest 2013-01-11
- **CPC** (3) — Latest 2012-06-22
- **GBC** (2) — Latest 2011-09-02
- **GTT** (4) — Latest 2011-08-31
