# FBE Order Tracker

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## 2026-09-03 FBE Order Tracker Module (FBE Production Order Status Tracking System)

### 1. Module Overview & File Architecture
- **Route**: `/production/fbe-order-track`
- **Frontend Page**: `src/pages/FBEOrderTrackPage.tsx`
- **Stepper Component**: `src/components/dashboard/orderTracking/OrderTrackStepper.tsx`
- **Frontend Service**: `src/services/orderTrackingAPI.ts` -> `getOrderTracking(ordNo, ordLineNo)`
- **Backend Route**: `backend/routes/orderTracking.js` (`GET /api/order-tracking/track?ordNo=...&ordLineNo=...`)
- **Photo Bridge Endpoints**:
  - Primary: `/api/photos/ps/:itemNo` (Real product photo from Photo Server)
  - Fallback: `/api/photos/cad/:itemNo` (Rendered CAD mold preview)
  - Helper: `src/utils/photoUrl.ts` (`psPhotoUrl`, `attachPhotoFallback`)

### 2. Data Sources & Schema Mapping
1. **Order Header & Detail Specs**:
   - Table `OrdHD`: Fetches `CustCode`, `OrdDate`, `DueDate`, `PONo`
   - Table `OrdDT`: Fetches `ItemNo`, `ItemMat`, `ItemCust`, `ItemDesc`, `ItemStone`, `ItemPlate`, `ItemSize`, `ItemQty`, `OrdLineNo`
   - SQL Query Condition: `OrdHD.OrdNo = @ordNo AND OrdDT.OrdLineNo = @ordLineNo`
2. **FBE 17-Step Production Pipeline**:
   - Pipeline Sequence:
     1. Grind (Grinding - `GR`)
     2. Tumbling 1 (Tumbling 1 - `TB`, Dept: `TB1`)
     3. Assemble 1 (Assembly 1 - `AS`, Dept: `AS1`)
     4. Laser 1 (Laser 1 - `LS`, Dept: `LS1`)
     5. Filing 1 (Filing/Sandpaper 1 - `FL`, Dept: `FL1`)
     6. Tumbling 2 (Tumbling 2 - `TB`, Dept: `TB2`)
     7. Epoxy (Enamel/Coloring - `EP`)
     8. Filing 2 (Filing/Sandpaper 2 - `FL`, Dept: `FL2`)
     9. Lapping (Faceting/Lapping - `LP`)
     10. Copper (Copper Plating - `CP`)
     11. Polish 1 (Polishing 1 - `PL`, Dept: `PL1`)
     12. Assemble 2 (Assembly 2 - `AS`, Dept: `AS2`)
     13. Laser 2 (Laser 2 - `LS`, Dept: `LS2`)
     14. Filing 3 (Filing/Sandpaper 3 - `FL`, Dept: `FL3`)
     15. Polish 2 (Polishing 2 - `PL`, Dept: `PL2`)
     16. IQC (Quality Inspection - `IQ`)
     17. Plating (Final Plating - `PT`)
3. **Tracking Quantities (Send vs. Receive)**:
   - Outgoing (Send): Table `${prefix}SenHD` (DocuDate, DocuStatus, DocuNo) INNER JOIN `${prefix}SenDT` (SenQty) WHERE `ProFac = 'FBE' AND OrdNo = @ordNo AND OrdLineNo = @ordLineNo`
   - Incoming (Receive): Table `${prefix}RecHD` (DocuDate, DocuNo) INNER JOIN `${prefix}RecDT` (RecQty) WHERE `ProFac = 'FBE' AND OrdNo = @ordNo AND OrdLineNo = @ordLineNo`
   - Work In Progress Balance per step: `Balance = RecQty - SenQty`
4. **Step Status Evaluation Logic**:
   - `status = 2` (**Done / Completed**): Document exists and `balance === 0` (all processed quantities passed onward).
   - `status = 1` (**In-Progress / WIP**): Received into stage and `balance > 0`.
   - `status = 0` (**Pending / Waiting**): No intake document recorded for this stage yet.
5. **Concurrency Guards (2026-11-09, `/track`)**: NOLOCK reads, deadlock retry (503), step loop skips only missing tables (error 208), numeric `ordLineNo` (400) — full text in `docs/database/baseline-and-indexes.md` → "Concurrency Guards and Query Policy".

### 3. Design Standards & Strict Guardrails
1. **Module Encapsulation & Folder Hierarchy**:
   - **Strict Rule**: When building new features or modules, encapsulate dedicated components inside a dedicated directory under `src/components/...`. Never scatter loose components into generic root folders.
   - Decompose complex views into modular sub-components (e.g., separating tables, charts, and filter bars from page containers).
2. **Strict No Hardcoded Colors**:
   - Every UI element must reference CSS Design Tokens from `src/index.css` (100% compliance).
   - Validated via `npm run lint:colors` (0 violations required).
   - Contrast must adhere to WCAG 2.1 Level AA (body text >= 4.5:1, borders and timeline links >= 3.0:1).
3. **Single-Screen Fit 2-Column Layout (Zero Whole-Page Scrolling)**:
   - **Left Column (~75%)**:
     - *Order Information*: 3-column metadata grid, with 12.5px–13.5px typography for crisp projector visibility.
     - *Active Step Highlight Banner*: Warm accent banner identifying the active manufacturing phase and completed count.
     - *Production Progress*: Connected 17-step continuous horizontal timeline.
     - *Step History Table*: Intake/handover audit ledger with internal scroll bounds.
   - **Right Column (~25%)**:
     - *Item Photo*: 375px compact frame with centered alignment, clean borders, and no redundant captions.
     - *Summary Dashboard*: Circular Donut Gauge accompanied by 4 prominent borderless KPI metric cards.
4. **Search Bar & Empty Standby**:
   - Initial values for `ordNo` and `ordLineNo` default to empty strings (`''`) without placeholders, bypassing auto-queries on mount.
   - Standby state: Metrics and attributes display subtle placeholder dashes (`-`).
5. **17-Step Production Stepper**:
   - Numeric quantities removed from timeline nodes to maintain clean visual scan paths.
   - Date / State row:
     - Completed stages: Displays completion date (`DD/MM`).
     - In-progress stage: Displays animated **`In Progress`** badge with smooth 2.4s pulsing cadence (`.step-current-blink`, `.text-current-blink`).
     - Upcoming stages: Displays **`Pending`** label.
6. **Step History Table**:
   - Status column: Bold (**800**) typography colored by state without borders/background chips (`Done (Y)` green, `In Progress (O)` amber).
   - Table background matches card surface (`var(--color-ui-surface)`) without zebra striping.
7. **Summary Progress Card**:
   - Donut Gauge: Executive aesthetic featuring smooth cubic-bezier loading rotation with "Processing..." label.
   - Active render: Bold 24px completion percentage with "Overall Progress" caption.
   - 4-Quadrant Metric Block: Clean 26px typography (Total=Blue, Completed=Green, In-Progress=Amber, Balance=Slate/Navy).
