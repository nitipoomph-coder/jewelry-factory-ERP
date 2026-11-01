# Production Stages Mapping Log & Technical Reference
## From Legacy Desktop System (VB.NET) to Modern Web Application (React)

This document records the historical column mapping, terminology alignment, and calculation logic connecting raw database columns in `OrdDT` to the state variables and UI labels used in the modern web application.

---

## 1. Comprehensive Production Stage Mapping Table

| # | Legacy Header (VB.NET Grid Header) | Web App Label (Modern UI) | Database Column (`OrdDT` Fields) | Departmental Role & Process Description |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **PST** | **Stone** | `StoneQty` (Status: `FStoneStatus`) | Gemstone preparation, sorting, and pre-setting |
| **2** | **Finding PC1** | **Finding** | `FitQty` (Status: `FFitStatus`) | Findings, clasp/accessory preparation, and initial fitment |
| **3** | **PWA** | **Wax** | `WijQty` (Status: `FWijStatus`) | Wax injection, mold extraction, and tree assembly |
| **4** | **PAU** | **Wax Set** | `WstQty` (Status: `FWstStatus`) | Stone setting directly into wax patterns |
| **5** | **PCA** | **Cast** | `CastQty` (Status: `FCastStatus`) | Investment casting and precious metal pouring |
| **6** | **PF1/2 Grind** | **Grind** | `GrindQty` (Status: `FGrindStatus`) | Tree cut-off, sprue grinding, and primary rough finishing |
| **7** | **PEP** | **Epoxy** | `EpoxQty` (Status: `FEpoxStatus`) | Enamel application and epoxy color resin curing |
| **8** | **PF1/2 Solder**| **Solder** | `SolQty` / `SolderQty` (Status: `FSolStatus`) | Torch and laser micro-soldering / component joining |
| **9** | **PF1/2 Filing**| **Filing** | `FilQty` (Status: `FFilStatus`) | Precision hand filing and bench contouring |
| **10**| **PC2** | **Control** | `ControlQty` (Status: `FControlStatus`) | In-line production quality control & bench inspection |
| **11**| **PL1/2/3 Set** | **Setting** | `SetQty` (Status: `FSetStatus`) | Post-cast gemstone setting by master setters |
| **12**| **PL1/2/3 Polish**| **Polish** | `PolishQty` (Status: `FPolishStatus`) | Multi-stage magnetic and high-luster buffing/polishing |
| **13**| **PQC** | **PQC** | `QPQty` (Status: `FQPStatus`) | Pre-plating quality check and ultrasonic cleaning |
| **14**| **PPL** | **Plating** | `PlateQty` (Status: `FPlateStatus`) | Electroplating (Rhodium, Gold, E-coating, etc.) |
| **15**| **PAS** | **Assemble** | `AssemQty` (Status: `FAssemStatus`) | Final mechanical assembly, jump rings, and chain attachments |
| **16**| *(Off-Screen)* | **FQC** | `QCQty` (Status: `FQCStatus`) | Final Quality Control inspection and dimension verification |
| **17**| *(Off-Screen)* | **Pack** | `PackQty` (Status: `FPackStatus`) | Protective packing, barcode tagging, and dispatch staging |

---
> [!NOTE]
> **PO Tracker Header Conventions:** In the legacy VB.NET PO Tracker, full names (e.g., `Control`, `Polish`, `Plating`) appeared in the column-selector popups, whereas abbreviated mixed codes (e.g., `PST`, `PC1`, `PWA`, `PCA`, `PC2`, `PF`, `PL`, `PPL`) were rendered on the grid headers.

---

## 2. Pending Quantity Calculation Logic

In the legacy architecture, if an operational stage is incomplete (represented by `NULL` or `0` in `OrdDT`), the system communicates active **backlog / work-in-progress (WIP)** as a **negative accumulated number** rather than displaying empty or blank cells. This is computed in the Express backend using the following business rules:

### Standard Departmental Formula:
$$\text{Pending Quantity} = \text{DepartmentQty} - \text{ItemQty}$$

### Cascading Stage Formulas (Dependent Handoffs):
* **Wax Set:**
  $$\text{WstPen} = \begin{cases} \text{WstQty} - \text{WijQty} & \text{when } \text{WijQty} = \text{ItemQty} \\ \text{WstQty} - \text{ItemQty} & \text{otherwise} \end{cases}$$

* **Cast:**
  $$\text{CastPen} = \begin{cases} \text{CastQty} - \text{WijQty} & \text{when } \text{WijQty} = \text{ItemQty} \\ \text{CastQty} - \text{ItemQty} & \text{otherwise} \end{cases}$$

* **Grind:**
  $$\text{GrindPen} = \begin{cases} \text{GrindQty} - \text{CastQty} & \text{when } \text{CastQty} = \text{ItemQty} \\ \text{GrindQty} - \text{ItemQty} & \text{otherwise} \end{cases}$$

* **Polish:**
  $$\text{PolishPen} = \begin{cases} \text{PolishQty} - \text{GrindQty} & \text{when } \text{GrindQty} = \text{ItemQty} \\ \text{PolishQty} - \text{ItemQty} & \text{otherwise} \end{cases}$$

* **Plating:**
  $$\text{PlatePen} = \begin{cases} \text{PlateQty} - \text{PolishQty} & \text{when } \text{PolishQty} = \text{ItemQty} \\ \text{PlateQty} - \text{ItemQty} & \text{otherwise} \end{cases}$$

* **Final QC (FQC):**
  $$\text{QCPen} = \begin{cases} \text{QCQty} - \text{PlateQty} & \text{when } \text{PlateQty} = \text{ItemQty} \\ \text{QCQty} - \text{ItemQty} & \text{otherwise} \end{cases}$$

---

## 3. Sample Execution Trace Log (Example: `BBC2607804`)

- **Input Parameters:** Order Number `BBC2607804`, Customer Code `N032`, Ordered Quantity (`ItemQty`) = `10`
- **Raw Database Record (`OrdDT`):** All departmental quantities are unrecorded (`NULL`)

### Evaluated API Output:
1. `stonePen` = $0 - 10$ = **`-10`** (Highlighted in red: Stone deficit)
2. `fitPen` = $0 - 10$ = **`-10`** (Highlighted in red: Finding deficit)
3. `wijPen` = $0 - 10$ = **`-10`** (Highlighted in red: Wax deficit)
4. `wstPen` = $0 - 10$ = **`-10`** (Highlighted in red: Wax Set deficit)
5. `castPen` = $0 - 10$ = **`-10`** (Highlighted in red: Cast deficit)
6. `grindPen` = $0 - 10$ = **`-10`** (Highlighted in red: Grind deficit)
7. `epoxPen` = $0 - 10$ = **`-10`** (Highlighted in red: Epoxy deficit)
8. `solPen` = $0 - 10$ = **`-10`** (Highlighted in red: Solder deficit)
9. `filPen` = $0 - 10$ = **`-10`** (Highlighted in red: Filing deficit)
10. `controlPen` = $0 - 10$ = **`-10`** (Highlighted in red: Control deficit)
11. `setPen` = $0 - 10$ = **`-10`** (Highlighted in red: Setting deficit)
12. `polishPen` = $0 - 10$ = **`-10`** (Highlighted in red: Polish deficit)
13. `pqcPen` = $0 - 10$ = **`-10`** (Highlighted in red: PQC deficit)
14. `platePen` = $0 - 10$ = **`-10`** (Highlighted in red: Plating deficit)
15. `assemPen` = $0 - 10$ = **`-10`** (Highlighted in red: Assemble deficit)
16. `qcPen` = $0 - 10$ = **`-10`** (Highlighted in red: FQC deficit)
17. `packPen` = $0 - 10$ = **`-10`** (Highlighted in red: Pack deficit)
18. `balPen` (Total Remaining Balance) = $0 - 10$ = **`-10`** (Highlighted in red: Pipeline Balance indicator)

> [!NOTE]
> The modern web application recalculates these values dynamically in real-time as database updates occur, delivering higher operational precision, faster bottleneck identification, and cleaner user experience than legacy desktop grids.
