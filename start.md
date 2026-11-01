# Jewelry Factory System (ERP) - AI Onboarding Guide

## 1. Project Overview (ภาพรวมระบบ)
โปรเจกต์นี้คือการพัฒนาระบบ ERP สำหรับโรงงานผลิตเครื่องประดับเงินสเตอร์ลิงและทองเหลือง 
เป้าหมายหลักคือการยกระดับ (Modernize) ระบบจาก Windows Forms / Crystal Reports แบบเดิม ให้กลายเป็น **Modern Web Application** ที่มี Interactive Dashboard เพื่อให้ผู้บริหารตรวจสอบสถานะการผลิต, คำสั่งซื้อ (PO), และยอดขายได้แบบ Real-time

## 2. Tech Stack (เทคโนโลยีที่ใช้)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS (อยู่ในโฟลเดอร์ `Jewelry Factory System/frontend`)
- **Backend:** Node.js, Express (อยู่ในโฟลเดอร์ `Jewelry Factory System/backend`)
- **Database:** Microsoft SQL Server (MS SQL)
- **Start Project:** รัน `npm run dev` ที่โฟลเดอร์ `Jewelry Factory System` (ระบบใช้ concurrently เพื่อรันทั้งคู่พร้อมกัน)

## 🛑 กฎเหล็กฐานข้อมูล (CRITICAL — ห้ามละเมิด)
1. **Database เป็น READ-ONLY 100%** — ห้ามรัน `ALTER`, `CREATE`, `DROP`, `UPDATE`, `INSERT`, `DELETE`, `TRUNCATE` และห้ามแก้ SP / View / Table / Index ทั้ง Production (`<DB_HOST>`) และ Test DB
2. **ต้องเข้ากันได้กับระบบเดิม (VB.NET) 100%** — ฐานข้อมูลใช้ร่วมกับระบบเก่าอยู่ตลอดเวลา SP `PC_Show_OrdTrack_Sum_*` ต้องรับแค่ 2 params: `@FromDate`, `@ToDate` (ห้ามส่ง `@Status`)
3. **การกรอง/จัดกลุ่ม/คำนวณ ทำที่ Application Layer เท่านั้น** (Node.js หรือ React) ห้ามแก้ที่ Database
4. **ข้อยกเว้นที่อนุญาตให้เขียนได้:** ตาราง `system_users` (Auth), ช่อง Remark ใน `OrdDT` ผ่าน PO Tracker Remarks API, และฟิลด์ `BuyName`/`RefDocuNo` ผ่าน Procurement API เท่านั้น

**สถานะจริงบน DB ตอนนี้:**
- ✅ Index 22 ตัว (`backend/sql/indexes.sql`) + View `VW_Web_SalesDashboard` — สร้างแล้วและ**ใช้งานอยู่** (ห้ามลบหรือสร้างเพิ่ม)
- ❌ SP `PC_Show_OrdTrack_Sum_*` — เป็น**ตัวเดิม**ของระบบ VB.NET (เคยลองแก้แล้วระบบเก่าพัง จึงยกเลิก) ไฟล์ใน `backend/sql/stored-procedures/` คือแบบร่างที่ยกเลิก **ห้ามรัน**
- ถ้าเอกสารใดขัดกับหัวข้อนี้ ให้ **ยึดหัวข้อนี้เป็นหลัก** (บันทึกเก่าบางส่วนยังพูดถึงการแก้ SP / `@Status`)

> รายละเอียดเต็มอยู่ใน `claude.md` (ส่วนบนสุดของไฟล์)

## 3. Core Documentation (คู่มือสำหรับ AI)
**⚠️ AI Assistant ทุกตัว: กรุณาอ่านไฟล์เหล่านี้ก่อนเขียนโค้ด เพื่อความเข้าใจใน Business Logic และ Design System ของโปรเจกต์**

### 📍 คัมภีร์หลัก (ต้องรู้)
0. `claude.md`
   - **เนื้อหา:** Project Context ฉบับเต็ม (กฎ DB, Module ทั้งหมด, Tech Stack + เวอร์ชัน, Design System/Theme, Folder Structure, การจัดกลุ่มลูกค้า)
   - **สำคัญ:** ไฟล์ใหญ่ (~100KB) ให้อ่านส่วนบน (กฎ + Overview + Tech Stack) ก่อนเสมอ ส่วนที่เหลืออ่านเฉพาะหัวข้อที่เกี่ยวกับงาน

1. `PRODUCT.md` 
   - **เนื้อหา:** กฎเหล็กด้าน UI/UX และแนวคิดของ Product
   - **สำคัญ:** โปรเจกต์นี้เน้นการแสดงข้อมูลความหนาแน่นสูง (Data Dense) ห้ามออกแบบหน้าจอให้ดูโบราณเหมือน Excel และต้องใช้สีสื่อความหมายให้ผู้บริหารเข้าใจง่าย (เช่น แดง = Overdue)

2. `LEGACY_PCC_SYSTEM_ARCHITECTURE.md`
   - **เนื้อหา:** สถาปัตยกรรมข้อมูลเดิม และความต่างของโรงงาน
   - **สำคัญ:** อธิบายโครงสร้าง Database เก่า, ความต่างระหว่างสายการผลิต FBE และ CLL, และสูตรการคำนวณ Stage Delta (WIP / Bottleneck)

3. `DESIGN.md` (root) + `Jewelry Factory System/frontend/design.md` + `frontend/src/index.css`
   - **เนื้อหา:** กฎ UI/UX ขั้นละเอียด, ระบบสี 60-30-10, การรองรับ 3 ธีม, ความหนาแน่นของ component และ CSS token ที่ใช้ได้
   - **สำคัญ:** อ่านก่อนแก้หน้าจอทุกครั้ง ห้าม hardcode สี ให้ใช้ token จาก `index.css` (ตรวจด้วย `npm run lint:colors` ใน frontend)

4. `Jewelry Factory System/backend/sql/ERP_DATA_MAPPING_AND_LOGIC.md` + `backend/sql/README.md`
   - **เนื้อหา:** ความหมายของฟิลด์ใน ERP, Business Logic การคำนวณ, รายการ Index/View ที่มีบน DB

### 📍 คัมภีร์เฉพาะระบบ (อ่านเมื่อต้องทำฟีเจอร์นั้นๆ)
5. `PO_TRACKER_REVAMP_PLAN.md` & `LEGACY_PO_TRACKER_ARCHITECTURE.md`
   - **เนื้อหา:** โครงสร้างและที่มาของข้อมูลหน้า PO Tracker และ Order Detail Line Items (อิงสถาปัตยกรรมระบบเก่า VB.NET 100%)
   - **สำคัญ:** ควรอ่านเมื่อต้องทำหน้ารายงาน PO และหน้า Detail มีรายละเอียดการ Map ฟิลด์จาก Stored Procedure (`PC_Show_OrdTrack_Sum_*`), ตาราง `OrdTrackDT`, ตาราง `OrdTrack`, กฎ 5-Axis/6-Axis, และการเปลี่ยนชื่อคอลัมน์ของกลุ่ม N044/KSP

6. `production_stages_mapping_log.md`
   - **เนื้อหา:** ลำดับขั้นตอนการผลิตของ FBE
   - **สำคัญ:** โลจิกของ Timeline 17 ขั้นตอน (Grind, Tumbling, Assemble, ฯลฯ) ที่ใช้ในหน้า FBE Order Tracker

7. `sales-db-views.md` & `sales-menu.md` & `DATA_FETCHING_NOTES.txt`
   - **เนื้อหา:** ข้อมูลเกี่ยวกับยอดขาย, การจัดกลุ่มลูกค้า และลำดับการเรียก API ของหน้า Top Orders / Customer Sales
   - **สำคัญ:** ควรอ่านเมื่อต้องทำระบบ Sales Analytics, Customer Report Matrix หรือ Top Item Gallery

8. `dashboard.md`
   - **เนื้อหา:** บริบทของหน้า Dashboard หลัก และหน้ารายงานกลุ่ม Customer Dashboard (แยกออกมาจาก `claude.md`)

9. `debug-history.md`
   - **เนื้อหา:** บันทึกบั๊กที่เคยเกิด + สาเหตุ + บทเรียน (เช่น SP ช้าเพราะ Index หาย, `@Status` drift, z-index ชนกัน, คอลัมน์ Group = `OrdMaker`)
   - **สำคัญ:** อ่านก่อนแก้บั๊กหรือแตะ SP / PO Tracker เพื่อไม่ทำผิดซ้ำ — และเมื่อแก้บั๊กสำคัญเสร็จ ให้บันทึกเพิ่มในไฟล์นี้

10. `Jewelry Factory System/implementation_plan-admin.md`
    - **เนื้อหา:** แผนงานระบบ Admin User Management & Session Tracking (**ยังไม่ได้ทำ** มีคำถามที่รอ user ตัดสินใจ)

11. `GIT_WORKFLOW_GUIDE.md` — ขั้นตอนการใช้ Git ของโปรเจกต์

---
**🤖 คำสั่งปฏิบัติงานสำหรับ AI (Agent Instructions):**
1. ห้ามเดาโครงสร้าง Database เอง ให้ยึดจากไฟล์ .md เป็นหลัก
2. รักษาความสะอาดของ Root Directory เสมอ ห้ามทิ้งไฟล์ Log / ไฟล์ชั่วคราว / แผนงานที่เสร็จแล้วไว้ที่ root
3. ก่อนเพิ่มฟีเจอร์ใหม่ ให้เช็กเสมอว่า Design ไปขัดกับ `PRODUCT.md` หรือไม่
