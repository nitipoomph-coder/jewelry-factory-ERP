# Backend Data Mapping & Business Logic Reference (ERP)

This document details data lineage, field-level data entry origins from the back-office ERP (Order Entry), and business calculation rules reflected across the **Customer Dashboard**, **Matrix Report**, **Order Trends**, and **Top Item Gallery**.

---

## 1. Database Source Tables

All sales revenue and production piece counts are stored, aggregated, and processed from three primary ERP tables:

```
┌────────────────────────┐      ┌────────────────────────┐
│         OrdHD          │ 1  N │         OrdDT          │
│     (Order Header)     ├──────┤     (Order Detail)     │
│  Production Order Head │      │   Line Items per Order │
└───────────┬────────────┘      └────────────────────────┘
            │ N
            │
            │ 1
┌───────────┴────────────┐
│         GMCust         │
│   (Customer Master)    │
│  Customer Registry DB  │
└────────────────────────┘
```

---

## 2. ERP Data Entry Fields & Dashboard Mapping

### 2.1 Order Header Information (`dbo.OrdHD`)
Recorded when staff create a new production order (Order Entry):

| Database Column | ERP Field Label | Role & Application Layer Usage |
| :--- | :--- | :--- |
| **`OrdID`** | Internal Order Reference | Foreign Key join between `OrdHD` and `OrdDT` |
| **`OrdNo`** | **Production Order Number** (e.g. `BBC2600123`) | First 3 characters (Prefix) distinguish Finished Goods from internal work |
| **`OrdDate`** | **Order Entry Date** | Establishes reporting period **Year (`OrdYear`)** and **Month (`OrdMonth` 1–12)** |
| **`CustCode`** | **Customer Code** (e.g. `N008`, `N044`, `U319`) | Segmented into **7 Standard Customer Groups** |
| **`OrdStatus`** | **Order Status** (`P`=Pending, `F`=Finish, `C`=Cancel) | Filter condition: **excludes canceled orders (`C`) 100%** |
| **`CloseStatus`** | Order Close Flag (`N`=Open, `Y`=Closed) | Indicates whether an order is active or closed |
| **`PONo` / `EXNo`** | Customer PO Number & Secondary PO (PO2) | Displayed in order drill-down tables and search interfaces |
| **`DueDate` / `CustDueDate`** | Factory Due Date / Customer Due Date | Used in Delivery Outlook, risk stratification, and Overdue tracking |
| **`CustMultiAddr`** | Shipping Branch / Destination (`ShipTo`) | Designates customer shipping address destination |
| **`OrdMaker` / `OrdStamp`** | Order Creator / Hallmark Stamp | Identifies order creator and jewelry hallmark specifications |
| **`CurrCode` / `ExchRate`** | Currency (USD, EUR, etc.) & Exchange Rate | Transaction currency and exchange rate multiplier |

---

### 2.2 Order Line Items (`dbo.OrdDT`)
Recorded when line items are added to a production order:

| Database Column | ERP Field Label | Role & Application Layer Usage |
| :--- | :--- | :--- |
| **`OrdLineNo`** | Order Line Number (Line 1, 2, 3...) | Line item index within an order |
| **`ItemNo`** | **Item Number / SKU** (e.g. `BBS02853B`) | First 3 characters determine **Product Type** (`BBS`, `BES`, `BNS`, `BRS`, `Others`) and photo fetching |
| **`ItemCust`** | Customer Item Reference (`[Cust Item]`) | Customer catalog reference number |
| **`ItemQty`** | **Ordered Quantity (Pieces/PCS)** | Aggregated as **Total Quantity** on charts/matrices and ranks **Top Items** |
| **`ItemPrice`** | Unit Selling Price ($ USD) | Unit price displayed in order detail tables |
| **`ItemAmnt`** | Line Total Amount (`ItemQty × ItemPrice`) | Line total in original transaction currency |
| **`ItemExchAmnt`** | **Line Total Converted to USD** | **Primary metric for Total Sales ($ USD)** across all KPI cards and reports |
| **`ExportQty`** | Shipped / Exported Quantity (Pieces) | Analyzed for shipped versus remaining backlog (`OpenQty = ItemQty - ExportQty`) |
| **`ExportAmnt`** | Shipped Value ($ USD) | Total value of goods exported and delivered |
| **`ItemMat` / `ItemSize`** | Metal Specification / Ring or Chain Size | Bill-of-Materials specifications |
| **`ItemStone` / `ItemPlate`** | Gemstone Type / Plating Finish | Gemstone and surface treatment specifications |

---

### 2.3 Customer Master (`dbo.GMCust`)
Core customer profiles registered in the system:

| Database Column | ERP Field Label | Role & Application Layer Usage |
| :--- | :--- | :--- |
| **`CustCode`** | Customer Code | Primary Key joining with `OrdHD.CustCode` |
| **`CustName`** | Company / Trade Name | Displayed on customer summary cards and matrix reports |
| **`CustStatus`** | **Customer Status** (`Y`=Active, `N`=Inactive) | Filter condition: **Active customers (`Y`) only** |
| **`SalesName`** | Account Sales Representative | Sales representative assigned to customer accounts |

---

## 3. Business Filtering Rules

Centralized views **`dbo.VW_Web_SalesDashboard`** and **`dbo.VW_Web_OrderTrends`** extract data adhering strictly to factory Stored Procedure standards (`dbo.PC_Show_OrdTrack_Sum_OrdDate`):

```sql
WHERE 
    -- 1. Exclude canceled orders 100%
    (ISNULL(HD.OrdStatus, '') <> 'C') 
    
    -- 2. Include active customers only
    AND (ISNULL(CUST.CustStatus, 'Y') = 'Y') 
    
    -- 3. Filter for standard production prefixes only (Exclude BBI Samples, BBQ Quotes, BBX)
    AND (SUBSTRING(HD.OrdNo, 1, 3) IN ('BBC', 'BBS', 'BBE', 'BBL', 'BBR', 'BBT', 'BBP'))
    
    -- 4. Exclude test samples, R&D trials, and internal buffer stock (TOP, Test, Testing, Stock, Empty POs)
    AND (LTRIM(RTRIM(ISNULL(HD.PONo, ''))) NOT IN ('', 'TOP', 'Test', 'Testing', 'Stock', 'STOCK'));
```

### 💡 Why `ISNULL(DT.ItemExchAmnt, DT.ItemAmnt)`?
For overseas clients invoiced in foreign currencies (e.g. EUR, GBP), `ItemExchAmnt` holds the converted **USD** amount based on transaction-date exchange rates. This normalizes all customer revenue into a single standardized currency ($ USD), aligning 100% with corporate financial statements.

---

## 4. Product Type Classification

Jewelry categories are categorized using the first 3 characters of the item SKU (`ItemNo`):

| Type Code | Product Category | Example Item SKUs |
| :---: | :--- | :--- |
| **`BBS`** | **Bracelet / Bangle** | `BBS02853B`, `BBS03322A` |
| **`BES`** | **Earring** | `BES36684A`, `BES36342A` |
| **`BNS`** | **Necklace / Pendant** | `BNS18339A`, `BNS19027A` |
| **`BRS`** | **Ring** | `BRS04512A` |
| **`Others`** | **Other Categories (Brooches, charms, components, etc.)** | SKUs not matching the 4 primary prefixes |

---

## 5. Customer Group Mapping

Customers are classified into **7 Standard Customer Groups** based on `CustCode` prefixes:

| Customer Group (Group ID) | Included Customer Code Prefixes | Default Visibility State |
| :--- | :--- | :---: |
| **`N008 Group`** | `N008, N048, N065, N066, N067, N068, N069, N070, N071, N072, N073, N074, N075` | Active (Selected) |
| **`N044 Group`** | `N044` | Active (Selected) |
| **`N098 Group`** | `N098` | Active (Selected) |
| **`N051 Group`** | `N051` | Active (Selected) |
| **`N083 Group`** | `N083, N086, N087, N088, N089` | Inactive (Historical) |
| **`MLT Group`** | `U411, U412, U413, U414, U415, U416, U417, U418, U419, U420, U421, U422, U423, U424, U425, U426` | Optional Active |
| **`General`** | All other registered customer accounts | Optional Active |

---

## 6. Summary of Metrics by Application Screen

1. **Customer Dashboard (`/dashboard/customer`):**
   - **Sales ($):** `SUM(ItemAmnt)` from analytical view
   - **Qty (PCS):** `SUM(ItemQty)` from analytical view
   - **YoY Growth (%):** `((Current Year Value - Prior Year Value) ÷ Prior Year Value) × 100`

2. **Customer Matrix Report (`/dashboard/customer/matrix`):**
   - 12-month calendar matrix and annual totals broken down by individual accounts and customer groups.

3. **Order Trends & Delivery Outlook (`/dashboard/customer/trends`):**
   - **Overview Tab:**
     - **6 KPI Metric Strip:** `Total Overdue`, `Due in 15 Days`, `Total WIP (Factory)`, `Top Bottleneck`, `On-Time Completion Rate (%)`, `Overdue Rate (%)`
     - **Order Volume Trend Chart:** Monthly volume comparison against prior year (YoY Comparison).
     - **Delivery Risk by Customer Group:** Grouped bar chart comparing on-time orders versus overdue backlog.
     - **Active Production by Department:** Bottleneck table for 9 manufacturing departments showing value, volume, and percentage share.
     - **Pending Orders by Customer Group:** Delivery backlog breakdown for tier-1 customer groups.
   - **Order Details Tab (Production Order Drill-Down):**
      - 19-column formal operational table (`No.`, `Week`, `Cust`, `PO No.`, `PO 2`, `New/Replen`, `Metal`, `Item No.`, `Ship To`, `Order Date`, `Due Date`, `Status`, `Factory Stage`, `Ordered Qty`, `Total Value ($)`, `Shipped Qty`, `Backlog Qty`, `Backlog Value ($)`, `Days +/-`).
     - **Interactive Custom Filters:** Filter by `Dept`, `Status` (Risk level), `Group` (Customer group), quick search, and filter reset.
     - **Direct & Drill-down Navigation:** Deep linking directly from department bottleneck rows into filtered order rows.

4. **Top Item Gallery (`/dashboard/top-orders`):**
   - Identifies items with the highest **`SUM(ItemQty)`** for each customer account in the selected year, streaming imagery dynamically from the Photo Server bridge (`/api/photos/ps/:itemNo`).

---

## 7. Database View Schema: `dbo.VW_Web_OrderTrends`

Central view for Order Trends and Order Details ensuring 100% alignment with operational factory logic:

```sql
-- Key Columns in dbo.VW_Web_OrderTrends
- OrdNo             : Production order number (Filtered for BBC, BBS, BBE, BBL, BBR, BBT, BBP)
- PONo              : Customer PO number (Excludes TOP, Test, Testing, Stock, and blank POs)
- CustDueDate       : Customer due date (ISNULL(HD.CustDueDate, HD.DueDate))
- DaysToCustDue     : Calendar days remaining until due date (DATEDIFF against GETDATE())
- DueRiskBucket     : Risk tier ('Overdue', 'Due in 15 Days', 'Due in 16-30 Days', 'Future Due', 'Shipped')
- CurrentDepartment : Current manufacturing department ('Wax / Preparation', 'Casting', 'Grinding', 'Filing', 'Setting', 'Polishing', 'Plating', 'QC', 'Packing')
- OpenQty           : Net undelivered backlog (ItemQty - ExportQty)
- CustCode          : Customer account code (Confidential client identifier)
```
