# Production Summary

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

### 2. Production Summary Table Improvements (`ProductionSummaryTable.tsx`)
- **Increased row height**: From `22px`/`24px` to `30px` for all rows (data, total, avg) to match Forecast table density.
- **Increased padding**: Cell padding raised from `2px` to `4px`/`6px`/`8px` across all cells for better readability.
- **Font size increase**: Cell font size raised from `10px`/`10.5px`/`11px` to `11px`/`12px`/`13px`.
- **First column width increase**: From `58px`/`75px` to `75px`/`95px` to accommodate label text.
- **Avg row label**: Changed from `Avg.(Day/Pcs)` (with forced `fontSize: 9.5px`) to `Avg / Day` (using standard font size).
- **Zero value display**: Fixed `renderCell` logic — zero values now display `-` consistently (previously avg rows showed `0`).
