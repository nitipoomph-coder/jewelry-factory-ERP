# คู่มือความสัมพันธ์ของข้อมูลหลังบ้าน (ERP Data Mapping & Business Logic)

เอกสารนี้อธิบายที่มาของข้อมูล ฟิลด์ที่กรอกในระบบ ERP หลังบ้าน (Order Entry) และกฎการคำนวณทางธุรกิจ (Business Logic) ที่นำมาแสดงผลบน **Customer Dashboard**, **Matrix Report**, **Order Trends**, และ **Top Item Gallery**

---

## 1. แหล่งข้อมูลหลักในฐานข้อมูล (Database Source Tables)

ข้อมูลยอดขายและจำนวนชิ้นทั้งหมดถูกบันทึกและประมวลผลจาก 3 ตารางหลักในระบบ ERP:

```
┌────────────────────────┐      ┌────────────────────────┐
│         OrdHD          │ 1  N │         OrdDT          │
│     (Order Header)     ├──────┤     (Order Detail)     │
│  ข้อมูลการเปิดบิลสั่งผลิต  │      │   รายการสินค้าในแต่ละบิล │
└───────────┬────────────┘      └────────────────────────┘
            │ N
            │
            │ 1
┌───────────┴────────────┐
│         GMCust         │
│   (Customer Master)    │
│     ทะเบียนข้อมูลลูกค้า    │
└────────────────────────┘
```

---

## 2. ฟิลด์ที่กรอกใน ERP และความสัมพันธ์กับ Dashboard

### 2.1 ข้อมูลส่วนหัวบิล (ตาราง `dbo.OrdHD`)
บันทึกตอนพนักงานเปิดใบสั่งผลิตใหม่ (Order Entry):

| ชื่อคอลัมน์ใน DB | ฟิลด์ที่กรอกใน ERP | หน้าที่และการนำไปใช้งานบนระบบเว็บ |
| :--- | :--- | :--- |
| **`OrdID`** | รหัสอ้างอิงบิลภายใน | ใช้ Join ข้อมูลระหว่าง `OrdHD` กับ `OrdDT` |
| **`OrdNo`** | **เลขที่ใบสั่งผลิต** (เช่น `BBC2600123`) | ใช้ 3 ตัวแรก (Prefix) กรองแยกประเภทบิลสั่งผลิต Finished Goods ออกจากงานภายใน |
| **`OrdDate`** | **วันที่เปิดบิลสั่งผลิต** | ใช้ตัดรอบ **ปี (Year: `OrdYear`)** และ **เดือน (Month: `OrdMonth` 1-12)** |
| **`CustCode`** | **รหัสลูกค้า** (เช่น `N008`, `N044`, `U319`) | นำมาจัดกลุ่มเข้า **7 Customer Groups** |
| **`OrdStatus`** | **สถานะบิล** (`P`=Pending, `F`=Finish, `C`=Cancel) | ใช้กรอง **ตัดบิลที่ยกเลิก (`C`) ออกจากการคำนวณยอดขาย 100%** |
| **`CloseStatus`** | สถานะปิดบิล (`N`=Open, `Y`=Closed) | ใช้ระบุว่าออเดอร์ยังเปิดอยู่หรือปิดสมบูรณ์แล้ว |
| **`PONo` / `EXNo`** | เลขที่ PO ลูกค้า และ PO2 | ใช้แสดงในตารางรายละเอียดออเดอร์ (Drilldown) และค้นหาข้อมูล |
| **`DueDate` / `CustDueDate`** | วันที่กำหนดส่งมอบโรงงาน / วันที่ลูกค้าร้องขอ | ใช้วิเคราะห์แนวโน้มส่งมอบ (Due Outlook) และการแจ้งเตือน Overdue |
| **`CustMultiAddr`** | รหัสสาขา / ที่อยู่จัดส่ง (`ShipTo`) | ใช้ระบุสถานที่จัดส่งสินค้าของลูกค้า |
| **`OrdMaker` / `OrdStamp`** | ผู้เปิดบิล / ตราประทับสินค้า | บันทึกผู้ทำรายการและตราประทับชิ้นงาน |
| **`CurrCode` / `ExchRate`** | สกุลเงิน (USD, EUR) และอัตราแลกเปลี่ยน | ใช้อ้างอิงอัตราแลกเปลี่ยนของบิล |

---

### 2.2 ข้อมูลส่วนรายการสินค้า (ตาราง `dbo.OrdDT`)
บันทึกตอนพนักงานคีย์รายการสินค้าแต่ละแถวในใบสั่งผลิต:

| ชื่อคอลัมน์ใน DB | ฟิลด์ที่กรอกใน ERP | หน้าที่และการนำไปใช้งานบนระบบเว็บ |
| :--- | :--- | :--- |
| **`OrdLineNo`** | ลำดับแถวในบิล (Line 1, 2, 3...) | ใช้เรียงลำดับรายการสินค้าในบิล |
| **`ItemNo`** | **รหัสสินค้า / รหัสชิ้นงาน** (เช่น `BBS02853B`) | ใช้ 3 ตัวแรกจำแนก **Product Type** (`BBS`, `BES`, `BNS`, `BRS`, `Others`) และดึงรูปภาพสินค้า |
| **`ItemCust`** | รหัสสินค้าของลูกค้า (`[Cust Item]`) | รหัสสินค้าตามแคตตาล็อกของลูกค้า |
| **`ItemQty`** | **จำนวนชิ้นที่สั่งผลิต (PCS)** | คำนวณเป็นยอด **Total Quantity** บนกราฟ/Matrix และใช้จัดอันดับ **Top Item** |
| **`ItemPrice`** | ราคาขายต่อหน่วย ($ USD) | แสดงราคาต่อชิ้นในตารางรายละเอียด |
| **`ItemAmnt`** | ยอดเงินรวมต้นทาง (`ItemQty × ItemPrice`) | ยอดรวมเงินตามสกุลเงินของบิล |
| **`ItemExchAmnt`** | **ยอดเงินรวมแปลงเป็น USD แล้ว** | **ตัวเลขหลักที่ใช้รวมเป็น Total Sales ($ USD)** บนกราฟ KPI และรายงานทั้งหมด |
| **`ExportQty`** | จำนวนที่ส่งออก/ส่งมอบแล้ว (PCS) | ใช้วิเคราะห์ยอดที่ส่งมอบแล้ว (Shipped) VS ยอดค้างส่ง (`OpenQty = ItemQty - ExportQty`) |
| **`ExportAmnt`** | มูลค่าสินค้าที่ส่งออกแล้ว ($ USD) | มูลค่ารวมของสินค้าที่ส่งมอบเรียบร้อยแล้ว |
| **`ItemMat` / `ItemSize`** | เนื้อโลหะ / ขนาดไซส์ | รายละเอียดสเปกสินค้า |
| **`ItemStone` / `ItemPlate`** | ประเภทพลอย / ประเภทการชุบ | รายละเอียดการประดับพลอยและการชุบผิว |

---

### 2.3 ข้อมูลทะเบียนลูกค้า (ตาราง `dbo.GMCust`)
ข้อมูลหลักของลูกค้าที่ลงทะเบียนไว้ในระบบ:

| ชื่อคอลัมน์ใน DB | ฟิลด์ที่กรอกใน ERP | หน้าที่และการนำไปใช้งานบนระบบเว็บ |
| :--- | :--- | :--- |
| **`CustCode`** | รหัสลูกค้า | Primary Key ใช้เชื่อมโยงกับ `OrdHD.CustCode` |
| **`CustName`** | ชื่อบริษัท/ชื่อทางการค้าของลูกค้า | แสดงชื่อลูกค้าบนการ์ดและรายงาน |
| **`CustStatus`** | **สถานะลูกค้า** (`Y`=Active, `N`=Inactive) | กรองเอาเฉพาะ **ลูกค้าที่ Active (`Y`)** เท่านั้น |
| **`SalesName`** | พนักงานขายผู้ดูแลลูกค้า | แสดงชื่อเซลส์ผู้รับผิดชอบบนรายงาน Matrix |

---

## 3. กฎเกณฑ์ทางธุรกิจและการกรองข้อมูล (Business Filtering Rules)

ระบบจะดึงข้อมูลผ่าน View กลาง **`dbo.VW_Web_SalesDashboard`** และ **`dbo.VW_Web_OrderTrends`** โดยใช้กฎมาตรฐานที่สอดคล้องกับ Stored Procedure โรงงาน (`dbo.PC_Show_OrdTrack_Sum_OrdDate`) 100%:

```sql
WHERE 
    -- 1. ตัดบิลที่ยกเลิกออกจากการคำนวณ 100%
    (ISNULL(HD.OrdStatus, '') <> 'C') 
    
    -- 2. ดึงเฉพาะลูกค้าที่มีสถานะ Active
    AND (ISNULL(CUST.CustStatus, 'Y') = 'Y')
    
    -- 3. รับเฉพาะรหัสบิลผลิตหลักมาตรฐาน (ตัด BBI Sample, BBQ Quote, BBX ออก)
    AND (SUBSTRING(HD.OrdNo, 1, 3) IN ('BBC', 'BBS', 'BBE', 'BBL', 'BBR', 'BBT', 'BBP'))
    
    -- 4. ตัดงานทดสอบ งานเทสตัวอย่าง และงานสต็อกภายใน (TOP, Test, Testing, Stock, PONo ว่าง)
    AND (LTRIM(RTRIM(ISNULL(HD.PONo, ''))) NOT IN ('', 'TOP', 'Test', 'Testing', 'Stock', 'STOCK'));
```

### 💡 ทำไมต้องใช้ `ISNULL(DT.ItemExchAmnt, DT.ItemAmnt)`?
สำหรับลูกค้าต่างประเทศที่เปิดบิลเป็นสกุลเงินอื่น (เช่น EUR, GBP) ฟิลด์ `ItemExchAmnt` ในฐานข้อมูลจะเก็บยอดเงินที่แปลงเป็น **USD** เรียบร้อยแล้ว ทำให้ยอดขายของลูกค้าทุกรายถูกแปลงเป็นสกุลเงินมาตรฐานเดียวกัน ($ USD) ตรงกับรายงานทางการเงินของบริษัท 100%

---

## 4. การจำแนกประเภทสินค้า (Product Type Logic)

ระบบจำแนกประเภทเครื่องประดับจาก 3 ตัวอักษรแรกของรหัสสินค้า (`ItemNo`):

| รหัสประเภท | ชื่อประเภทสินค้า | ตัวอย่างรหัสสินค้า |
| :---: | :--- | :--- |
| **`BBS`** | **Bracelet / Bangle (สร้อยข้อมือ / กำไล)** | `BBS02853B`, `BBS03322A` |
| **`BES`** | **Earring (ต่างหู)** | `BES36684A`, `BES36342A` |
| **`BNS`** | **Necklace (สร้อยคอ / จี้)** | `BNS18339A`, `BNS19027A` |
| **`BRS`** | **Ring (แหวน)** | `BRS04512A` |
| **`Others`** | **สินค้าประเภทอื่นๆ (เข็มกลัด, อะไหล่ ฯลฯ)** | รหัสที่ไม่ได้ขึ้นต้นด้วย 4 ประเภทข้างต้น |

---

## 5. การจัดกลุ่มลูกค้า (Customer Group Mapping)

ระบบจัดกลุ่มลูกค้าเป็น **7 กลุ่มมาตรฐาน** ตาม Prefix ของรหัสลูกค้า (`CustCode`):

| กลุ่มลูกค้า (Group ID) | รายชื่อรหัสลูกค้าในกลุ่ม (Prefixes) | สถานะเริ่มต้น (Default) |
| :--- | :--- | :---: |
| **`N008 Group`** | `N008, N048, N065, N066, N067, N068, N069, N070, N071, N072, N073, N074, N075` | Active (Selected) |
| **`N044 Group`** | `N044` | Active (Selected) |
| **`N098 Group`** | `N098` | Active (Selected) |
| **`N051 Group`** | `N051` | Active (Selected) |
| **`N083 Group`** | `N083, N086, N087, N088, N089` | Inactive (ตามยอดปี) |
| **`MLT Group`** | `U411, U412, U413, U414, U415, U416, U417, U418, U419, U420, U421, U422, U423, U424, U425, U426` | Option Active |
| **`General`** | รหัสลูกค้าอื่นๆ ทั้งหมดที่ไม่ตรงกับ 6 กลุ่มด้านบน | Option Active |

---

## 6. สรุปที่มาของตัวเลขในแต่ละหน้าจอ

1. **Customer Dashboard (`/dashboard/customer`):**
   - **Sales ($):** `SUM(ItemAmnt)` จาก View
   - **Qty (PCS):** `SUM(ItemQty)` จาก View
   - **YoY Growth (%):** `((ยอดปีปัจจุบัน - ยอดปีก่อนหน้า) ÷ ยอดปีก่อนหน้า) × 100`

2. **Customer Matrix Report (`/dashboard/customer/matrix`):**
   - แสดงตารางแจกแจงรายเดือน 1-12 และยอดรวมทั้งปี แยกตามลูกค้ารายตัวและกลุ่มลูกค้า

3. **Order Trends & Delivery Outlook (`/dashboard/customer/trends`):**
   - **Overview Tab:**
     - **6 KPI Metric Strip:** `Total Overdue`, `Due in 15 Days`, `Total WIP (Factory)`, `Top Bottleneck`, `On-Time Completion Rate (%)`, `Overdue Rate (%)`
     - **Order Volume Trend Chart:** กราฟเส้นเปรียบเทียบยอดคำสั่งซื้อรายเดือนเทียบปีก่อนหน้า (YoY Comparison)
     - **Delivery Risk by Customer Group:** กราฟแท่งเปรียบเทียบสถานะงานตามกำหนด vs งานเลยกำหนดส่ง
     - **Active Production by Department:** ตารางจุดคอขวด 9 แผนก พร้อมยอดเงิน/ชิ้น และสัดส่วน % Share ของทั้งโรงงาน
     - **Pending Orders by Customer Group:** ตารางสรุปภาพรวมยอดงานค้างส่งของกลุ่มลูกค้ารายใหญ่
   - **Order Details Tab (เจาะลึกรายใบสั่งผลิต):**
      - ตารางทางการ 19 คอลัมน์ (`No.`, `Week`, `Cust`, `PO No.`, `PO 2`, `New/Replen`, `Metal`, `Item No.`, `Ship To`, `Order Date`, `Due Date`, `Status`, `Factory Stage`, `Ordered Qty`, `Total Value ($)`, `Shipped Qty`, `Backlog Qty`, `Backlog Value ($)`, `Days +/-`)
     - **Interactive Custom Filters:** เลือกกรองตาม `Dept` (แผนก), `Status` (ความเสี่ยง), `Group` (กลุ่มลูกค้า), ช่องค้นหาด่วน (`Search Box`), และปุ่ม `Reset`
     - **Direct & Drill-down Navigation:** รองรับทั้งการคลิกเจาะจงมาจากแผนกในหน้า Overview หรือกดเข้ามาเลือกฟิลเตอร์ดูเองโดยตรง

4. **Top Item Gallery (`/dashboard/top-orders`):**
   - ดึงรหัสสินค้าที่มียอดรวม **`SUM(ItemQty)` สูงสุดเป็นอันดับ 1** ของลูกค้านั้นๆ ในปีที่เลือก พร้อมดึงรูปภาพจาก Photo Server (`/api/photos/ps/:itemNo`) มาแสดงผล

---

## 7. โครงสร้าง Database View: `dbo.VW_Web_OrderTrends`

View กลางสำหรับ Order Trends และ Order Details ที่เชื่อมโยงข้อมูล 100% กับมาตรฐานโรงงาน:

```sql
-- คอลัมน์สำคัญใน dbo.VW_Web_OrderTrends
- OrdNo             : เลขที่ใบสั่งผลิต (กรองเฉพาะ BBC, BBS, BBE, BBL, BBR, BBT, BBP)
- PONo              : เลขที่ PO ลูกค้า (ตัดงาน TOP, Test, Testing, Stock, PONo ว่าง)
- CustDueDate       : วันที่กำหนดส่งลูกค้า (ISNULL(HD.CustDueDate, HD.DueDate))
- DaysToCustDue     : จำนวนวันที่เหลือจนถึงกำหนดส่ง (DATEDIFF กับ GETDATE())
- DueRiskBucket     : จำแนกความเสี่ยง ('Overdue', 'Due in 15 Days', 'Due in 16-30 Days', 'Future Due', 'Shipped')
- CurrentDepartment : แผนกที่งานอยู่ ('Wax / Preparation', 'Casting', 'Grinding', 'Filing', 'Setting', 'Polishing', 'Plating', 'QC', 'Packing')
- OpenQty           : ยอดค้างส่งจริง (ItemQty - ExportQty)
- CustCode          : รหัสลูกค้า (รักษาความลับ ไม่เปิดเผย CustName)
```

