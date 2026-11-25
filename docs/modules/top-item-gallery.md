# Top Item Gallery

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

### Key Feature: Top Item Gallery

Displays top-ranked products in an adaptive Gallery Card Grid with year-over-year comparison tools.

**Design Notes (TopOrdersGalleryPage.tsx / TopOrdersGalleryGrid.tsx / TopOrdersSkeleton.tsx):**
- **Summary Header**: Top bar displaying operational scope (Combined/Compare mode) + ranked item count + KPI cards for Volume & Value via `GallerySummaryKpi` component — supports both Combined mode (cumulative across years) and Compare mode (Base vs. Compare year head-to-head with % delta).
- **No average price per piece**: the page shows Volume (pcs) and Value only — no Avg Price KPI, card badge, or popup column (an average across sizes, colors, and customers was misleading).
- **Value currency = USD**: `VW_Web_SalesDashboard.ItemAmnt` is `ISNULL(OrdDT.ItemExchAmnt, OrdDT.ItemAmnt)`. `ItemExchAmnt` holds the USD amount (USD orders: same as `ItemAmnt`; EUR orders: converted with `OrdHD.ExchRate`), so `/top-gallery` and the yearly-summary queries (which use the same expression directly) report the same USD values.
- **Gallery Grid**: Responsive CSS Grid (`gallery-grid` class) using `repeat(auto-fill, minmax(clamp(260px, 16vw, 320px), 1fr))` displaying product cards with images served through the Photo Bridge.
- **Loading State — Skeleton (`TopOrdersSkeleton.tsx`)**: Two-part skeleton:
  1. **Summary Header Skeleton**: Mocks top KPI metrics (title + volume/value placeholders) to eliminate layout shift.
  2. **Gallery Grid Skeleton**: 15 card placeholders using the exact `gallery-grid` layout, featuring Header Row, capsule-shaped Image Area, and Footer Rows 1–2 with smooth shimmer animation (`linear-gradient 110deg, background-size 400%, 1.5s linear infinite`).
- **Filter Loading Overlay**: Filter adjustments trigger a semi-transparent overlay with a centered spinner, `backdrop-filter: blur(2px)`, and `pointer-events: all` to prevent race conditions during queries.
- **Perspective Modes**: Dual mode support — `combined` (all years aggregated) and `compare` (two years head-to-head), switchable from the Topbar.
