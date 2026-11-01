# บันทึกประวัติและตารางเปรียบเทียบขั้นตอนการผลิต (Production Stages Mapping Log)
## จากระบบดั้งเดิม (VB.net) สู่ระบบใหม่ (React Web App)

เอกสารนี้ทำขึ้นเพื่อบันทึกประวัติการจับคู่คอลัมน์และคำศัพท์ขั้นตอนการผลิต เพื่อใช้อ้างอิงการดึงข้อมูลจากตารางฐานข้อมูลจริง `OrdDT` และการ Mapping ตัวแปรในการพัฒนาเว็บแอปพลิเคชัน

---

## 1. ตารางจับคู่ขั้นตอนการผลิต (Comprehensive Mapping Table)

| ลำดับที่ | ชื่อย่อระบบเก่า (VB.net Grid Header) | ชื่อแสดงผลบนเว็บใหม่ (Web App Label) | ฟิลด์ข้อมูลในฐานข้อมูล (OrdDT Column) | คำอธิบายขั้นตอนการทำงาน (Thai Description) |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **PST** | **Stone** | `StoneQty` (Status: `FStoneStatus`) | แผนกเตรียมพลอย / ฝังพลอย |
| **2** | **Finding PC1** | **Finding** | `FitQty` (Status: `FFitStatus`) | แผนกเตรียมอะไหล่ / จับพลาส |
| **3** | **PWA** | **Wax** | `WijQty` (Status: `FWijStatus`) | แผนกฉีดเทียน / ทำบล็อกขี้ผึ้ง |
| **4** | **PAU** | **Wax Set** | `WstQty` (Status: `FWstStatus`) | แผนกฝังพลอยบนขี้ผึ้ง / ติดต้นเทียน |
| **5** | **PCA** | **Cast** | `CastQty` (Status: `FCastStatus`) | แผนกหล่อเครื่องประดับ |
| **6** | **PF1/2 Grind** | **Grind** | `GrindQty` (Status: `FGrindStatus`) | แผนกแต่งหล่อ / ขัดละเอียดขั้นตอนแรก |
| **7** | **PEP** | **Epoxy** | `EpoxQty` (Status: `FEpoxStatus`) | แผนกหยอดสีอีพ็อกซี่ (Epoxy) |
| **8** | **PF1/2 Solder**| **Solder** | `SolQty` / `SolderQty` (Status: `FSolStatus`) | แผนกเชื่อมประกอบ / แล่นชิ้นส่วนด้วยความร้อน |
| **9** | **PF1/2 Filing**| **Filing** | `FilQty` (Status: `FFilStatus`) | แผนกแต่งตะไบชิ้นส่วน |
| **10**| **PC2** | **Control** | `ControlQty` (Status: `FControlStatus`) | แผนกควบคุมคุณภาพระหว่างการผลิต / คุมงานแต่ง |
| **11**| **PL1/2/3 Set** | **Setting** | `SetQty` (Status: `FSetStatus`) | แผนกฝังพลอยหลังการหล่อ / ช่างฝังพลอย |
| **12**| **PL1/2/3 Polish**| **Polish** | `PolishQty` (Status: `FPolishStatus`) | แผนกขัดเงาตัวเรือน |
| **13**| **PQC** | **PQC** | `QPQty` (Status: `FQPStatus`) | แผนกตรวจสอบคุณภาพงานขัดก่อนการชุบ |
| **14**| **PPL** | **Plating** | `PlateQty` (Status: `FPlateStatus`) | แผนกชุบผิวเครื่องประดับ (Plating) |
| **15**| **PAS** | **Assemble** | `AssemQty` (Status: `FAssemStatus`) | แผนกประกอบชิ้นส่วนและตกแต่งขั้นตอนสุดท้าย |
| **16**| *(Off-Screen)* | **FQC** | `QCQty` (Status: `FQCStatus`) | แผนกตรวจสอบคุณภาพสินค้าสำเร็จรูป (Final QC) |
| **17**| *(Off-Screen)* | **Pack** | `PackQty` (Status: `FPackStatus`) | แผนกบรรจุหีบห่อและเตรียมนำส่ง |

---
> [!NOTE]
> **หมายเหตุสำหรับหน้า PO Tracker:** ในหน้าจอ PO Tracker ของระบบเก่า (VB.net) จะมีการใช้คำเต็ม (เช่น `Control`, `Polish`, `Plating`) ในป๊อปอัปเลือกคอลัมน์ และใช้ตัวย่อผสม (เช่น `PST`, `PC1`, `PWA`, `PCA`, `PC2`, `PF`, `PL`, `PPL`) บนหัวตาราง แทนที่จะใช้ชื่อย่อระบบหลักทั้งหมด

## 2. สูตรและตรรกะการคำนวณงานค้าง (Pending Qty Logic)

ในระบบดั้งเดิม หากขั้นตอนการผลิตยังทำไม่เสร็จ (ยังเป็น `NULL` หรือ `0` ในฐานข้อมูล) ระบบจะแสดงค่าปริมาณงานที่ **ยังค้างคาอยู่** ในรูปแบบตัวเลขติดลบสะสมแทนการขึ้นช่องว่าง โดยคำนวณผ่านตรรกะฝั่ง Express Backend ดังนี้:

### สูตรการคำนวณระดับแผนกทั่วไป:
$$\text{Pending Quantity} = \text{DepartmentQty} - \text{ItemQty}$$

### สูตรการคำนวณแผนกแบบส่งต่อเชื่อมโยง (Cascade Stages):
* **Wax Set (ฝังเทียน):**
  $$\text{WstPen} = \begin{cases} \text{WstQty} - \text{WijQty} & \text{เมื่อ } \text{WijQty} = \text{ItemQty} \\ \text{WstQty} - \text{ItemQty} & \text{กรณีอื่น ๆ} \end{cases}$$
* **Cast (หล่อ):**
  $$\text{CastPen} = \begin{cases} \text{CastQty} - \text{WijQty} & \text{เมื่อ } \text{WijQty} = \text{ItemQty} \\ \text{CastQty} - \text{ItemQty} & \text{กรณีอื่น ๆ} \end{cases}$$
* **Grind (แต่งหล่อ):**
  $$\text{GrindPen} = \begin{cases} \text{GrindQty} - \text{CastQty} & \text{เมื่อ } \text{CastQty} = \text{ItemQty} \\ \text{GrindQty} - \text{ItemQty} & \text{กรณีอื่น ๆ} \end{cases}$$
* **Polish (ขัดเงา):**
  $$\text{PolishPen} = \begin{cases} \text{PolishQty} - \text{GrindQty} & \text{เมื่อ } \text{GrindQty} = \text{ItemQty} \\ \text{PolishQty} - \text{ItemQty} & \text{กรณีอื่น ๆ} \end{cases}$$
* **Plating (ชุบ):**
  $$\text{PlatePen} = \begin{cases} \text{PlateQty} - \text{PolishQty} & \text{เมื่อ } \text{PolishQty} = \text{ItemQty} \\ \text{PlateQty} - \text{ItemQty} & \text{กรณีอื่น ๆ} \end{cases}$$
* **FQC (Final QC):**
  $$\text{QCPen} = \begin{cases} \text{QCQty} - \text{PlateQty} & \text{เมื่อ } \text{PlateQty} = \text{ItemQty} \\ \text{QCQty} - \text{ItemQty} & \text{กรณีอื่น ๆ} \end{cases}$$

---

## 3. ตัวอย่างการไล่ค่าข้อมูลจริง (Trace Log - BBC2607804)

- **ข้อมูลอินพุตต้นทาง:** ออเดอร์หมายเลข `BBC2607804`, ลูกค้า `N032`, จำนวนสินค้าที่สั่งซื้อ (`ItemQty`) = `10`
- **ค่าในฐานข้อมูลดิบ (`OrdDT`):** แผนกหลักทั้งหมดมีสถานะเป็น `NULL`

### การคำนวณผลลัพธ์เพื่อนำเสนอผ่าน API:
1. `stonePen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Stone)
2. `fitPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Finding)
3. `wijPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Wax)
4. `wstPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Wax Set)
5. `castPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Cast)
6. `grindPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Grind)
7. `epoxPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Epoxy)
8. `solPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Solder)
9. `filPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Filing)
10. `controlPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Control)
11. `setPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Setting)
12. `polishPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Polish)
13. `pqcPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง PQC)
14. `platePen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Plating)
15. `assemPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Assemble)
16. `qcPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง FQC)
17. `packPen` = $0 - 10$ = **`-10`** (แสดงสีแดงกล่อง Pack)
18. `balPen` (ยอดค้างส่งรวม) = $0 - 10$ = **`-10`** (กล่องสรุป Balance เด่นที่ท้ายท่อ)

> [!NOTE]
> ระบบเว็บแอปพลิเคชันจะอัปเดตค่าข้างต้นแบบเรียลไทม์ทันทีเมื่อมีการเปลี่ยนแปลงตัวเลขในฐานข้อมูล ทำให้ควบคุมระบบการผลิตได้อย่างมีประสิทธิภาพ แม่นยำ และรวดเร็วกว่าระบบดั้งเดิม
