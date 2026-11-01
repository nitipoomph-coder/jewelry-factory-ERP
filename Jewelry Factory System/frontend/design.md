# Jewelry Factory System Design Standard

This file is the frontend implementation contract. The canonical product guidance is in the repository root `DESIGN.md`; color tokens live in `src/index.css`.

## 1. Product Character

Build a compact, data-dense operational ERP. Prioritize scanning, comparison, exact values, clear state, and repeatable work. Avoid marketing layouts, decorative color, gradients, glass effects, oversized metrics, nested cards, and continuous animation.

## 2. Themes

The same component roles must work in all three themes:

- `modern-dark`
- `dark-gold`
- `royal-white` (default)

Components never branch on theme to choose ordinary UI colors. Theme classes override palette tokens; components consume role tokens.

## 3. System-Wide 60-30-10 Color Roles

The ratio is a visual hierarchy target for each screen, not literal pixel accounting.

- **60% Canvas:** `--color-ui-canvas` for the workspace and page background.
- **30% Surfaces:** `--color-ui-surface` for panels, tables, filters, and forms; `--color-ui-raised` for menus, hover, and raised areas.
- **10% Interaction:** `--color-ui-interactive` and related role tokens for primary actions, links, active navigation, selected controls, and keyboard focus.

Brand is the only generic interaction color. Do not use green for selected, amber for active, or chart/customer-group colors for controls.

### Allowed Exceptions

- Status and severity: success, warning, danger, and info only when they report actual state.
- Production stages: only where the stage itself is data.
- Chart series and customer groups: only inside a visualization or matching legend.
- Ranked data: `--color-rank-*` only for rank meaning.
- Product photography: `--color-product-canvas` gives images a stable inspection background.
- Print output: fixed black and white are allowed in print-only files or `@media print`.

Every exception must include a second cue such as text, icon, value, ordering, or shape.

## 4. Component Rules

- Use 8px or less border radius for operational panels, cards, buttons, inputs, and dialogs.
- Separate resting sections with surface contrast and a 1px border. Use shadows only for actual elevation.
- Use `--shadow-panel`, `--shadow-dropdown`, `--shadow-floating`, or `--shadow-modal`; do not hardcode shadow colors.
- Selected tabs, filters, and chips use brand border/text with `--color-ui-selected` or `--color-ui-interactive-soft`.
- Focus uses `--color-ui-focus-ring` and must remain visible in every theme.
- Tables remain compact, align numbers right, and use sticky headers when useful. Analytics tables follow the wide frame, fixed column sizing, single-value deduplication, and rank token rules defined in DESIGN.md.
- View switchers live in the filter toolbar and navigate with router state; do not repeat page titles in hero headers or add duplicate refresh buttons.
- Loading skeletons must match the final content footprint and cover only the content outlet, not the app shell.
- Use Lucide icons for commands; pair unfamiliar icons with tooltips.

## 5. Responsive Layout And Loading

- The app shell uses `100dvh`; the sidebar and topbar remain available while only the page outlet scrolls.
- Use the shared `app-content-frame` variants. Dashboard content may stop at 1860px, wide analytics at 2400px, and document/table workspaces may use the full available width.
- Container breakpoints are based on usable content width: 1200px for medium layouts, 1120px for constrained layouts, and 620px for mobile stacking. The sidebar becomes an overlay below 820px viewport width.
- Never use CSS `zoom` or viewport-based font scaling to make a page fit. Reflow grids, wrap controls, or add local table/toolbar scrolling instead.
- Keep the compact ERP type scale fixed. Larger screens gain columns and working area, not oversized text; smaller screens stack content without shrinking labels below the defined tokens.
- Tables may scroll horizontally inside their own region. The document itself must not overflow horizontally.
- Loading keeps the real sidebar and topbar visible and replaces only data-dependent content with footprint-matched skeletons for initial loads. For data refetching (Refresh), use a unified Dim Effect (`opacity-50 pointer-events-none` for ~450ms) on the target container instead of rendering full spinners or skeletons, keeping the UI stable. Theme changes never show a loading screen.
- Verify representative screens at 390x844, 1440x900, and 2560x1440 in all three themes.

## 6. Data Visualization

Use charts only when they answer a specific business question. Use `--color-chart-1` through `--color-chart-6` consistently and keep legends, filters, tooltips, and tables synchronized. Customer group colors do not appear in filter chips unless those chips are acting as a chart legend.

## 7. Enforcement

- Never hardcode hex, RGB, HSL, OKLCH, named colors, or Tailwind palette classes in `src` components.
- Add or change colors only in `src/index.css`.
- Run `npm run lint:colors` after color work.
- `npm run lint` includes the color-token check and must pass before merge.
- A print-only file may opt out with `color-lint-ignore-file` and a reason on the first line.

## 8. Print

Print styles use a high-contrast black-and-white A4 layout, hide interactive controls, avoid splitting table rows, and prioritize ink-safe legibility.
