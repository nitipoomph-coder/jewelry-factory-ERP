# Data Visualization and Document Page Standards

> Moved from `CLAUDE.md` on 2026-11-25. Rules that apply to most tasks stay in `CLAUDE.md`.

## Operational Data Visualization Standard (System-Wide)

This standard applies to every dashboard, report, KPI, chart, and infographic in the system. A visualization is an operational control, not decoration. It must help the user understand a situation, identify the cause, or continue to the records that require action. If a visual does none of these better than a number or table, do not add it.

### Information Architecture

- Arrange analytical pages in the order `Scope/Filters -> Summary -> Explanation -> Details/Action`.
- Show the easiest overview first, then let users switch or drill down to exact records without opening a duplicate menu page.
- Keep active filters, sort, selected measure, and drill-down context when moving between overview and detail.
- Before adding any local selector, audit the existing page-level filters. Reuse an existing control when its meaning and scope are the same; add a second control only when it intentionally controls an independent dataset and the distinction is visible.
- Display the active data scope, unit, period, comparison basis, and last refresh time where relevant.
- Search affects only the dataset explicitly labeled by that search field. It must not silently change unrelated KPIs or charts.

### Choosing The Right Display

- Use a KPI for one exact result that users must recognize quickly.
- Use a line or column chart for change over time.
- Use stacked columns/bars for total plus composition; use 100% stacked only when the question is share, not volume.
- Use sorted horizontal bars for rankings.
- Use small multiples with the same scale when comparing periods or groups would make one chart crowded.
- Use a table when users need exact rows, many attributes, reconciliation, export, or direct actions.
- Use a funnel only for a real sequential process where each stage shares the same population.
- Avoid pie/donut charts for trends or many categories, 3D charts, decorative gauges, gradients, illustrations, and animation that does not communicate state.
- Do not repeat a KPI as a chart unless the chart adds trend, composition, distribution, or comparison.

### KPI Requirements

- Every KPI must include a clear label, formatted value, unit, and active period.
- A delta or trend arrow is allowed only when its comparison period and calculation are explicit.
- Do not mix order count, item quantity, weight, and amount under an ambiguous label such as `Total`.
- When a KPI combines categories, provide a compact breakdown or a direct path to the contributing records.

### Interaction And Drill-Down

- Tooltips must show exact values, units, category, period, and denominator/percentage when applicable.
- Clicking, tapping, or keyboard-activating a meaningful data point must filter or open the corresponding detail records when those records exist.
- Show drill-down context as a title, breadcrumb, or removable filter chips, with a clear reset/back action.
- Keep chart legends and series names consistent with filters, tables, exports, and domain terminology.
- Hover-only information is insufficient. The same information and action must be available by keyboard and touch.

### Color And Accessibility

- Apply the 60-30-10 rule across the entire system: `--color-ui-canvas` (~60%) for app backdrop, `--color-ui-surface` / `--color-ui-raised` (~30%) for content workspaces, and `--color-ui-interactive` (~10%) for primary actions, selection, and focus states.
- These proportions represent visual visual hierarchy targets, not strict pixel counts; status indicators and chart series are purposeful analytical exceptions.
- Primary buttons, active links, selected tabs/filters, navigation indicators, and focus rings utilize the dedicated Brand role token exclusively. Never use success/warning/danger or customer group palette colors to represent generic interactive selection.
- Use color only for defined meaning: status, severity, selection, process stage, or data series.
- Keep the same meaning and series color consistent across the system. Do not assign decorative colors to categories with no analytical purpose.
- Color must never be the only identifier; use labels, icons, patterns, ordering, or text as a second cue.
- Provide visible keyboard focus, sufficient contrast in every theme, screen-reader names, and readable labels at all supported sizes.
- Never write raw hex, rgb, hsl, oklch, named colors, or hardcoded Tailwind colors into components; add design tokens in `src/index.css` and run `npm run lint:colors` (`npm run lint` enforces this automatically). The codebase currently passes `npm run lint` with 0 color violations and 0 ESLint errors — keep it that way.
- **Fixed palette (`--color-fixed-*`)**: theme-independent tokens (Tailwind v4 palette values + a few named chart/tooltip/trend values) used by screens intentionally designed with fixed colors: admin security console pages, CCTV report, Topbar workspace switcher, Top Analytics sparklines. Use them as normal utilities (`bg-fixed-slate-900/95`, `dark:text-fixed-indigo-300`). New UI must prefer role tokens (`--color-ui-*`, text, border, status); add a fixed token only when a design is deliberately theme-independent.

### Data Integrity

- KPI, chart, table, and export totals must use the same filter scope and calculation definitions.
- Clearly distinguish zero, missing, unavailable, and not-applicable values. Never silently remove them.
- Comparison charts must use compatible units and scales. Side-by-side period comparisons use the same axis scale unless a difference is clearly disclosed.
- Currency, quantity, weight, percentage, date, and timezone formats must be consistent with the domain and locale.
- Production screens use production-stage language and status semantics. Sales screens use customer, order, item, shipment, quantity, and amount semantics. Do not mix the domains without an explicit cross-domain view.

### States, Responsive Behavior, And Performance

- Provide loading skeleton, empty, error, partial-data, stale-data, and permission-denied states.
- Empty states must identify the active scope and offer a useful recovery action such as clearing filters.
- On smaller screens, reduce simultaneous comparisons, allow purposeful scrolling, or switch views. Never overlap, clip, or shrink labels until unreadable.
- Reuse fetched data when only changing presentation. Memoize expensive derived datasets and avoid unnecessary API requests.
- Keep motion between 150-250 ms and use it only to explain selection, transition, loading, or drill-down.

### Domain Examples

- Customer Trends: monthly order type mix -> filtered order lines.
- Production: delayed work by stage -> affected jobs or orders.
- Procurement: overdue or pending purchase orders -> matching PO records.
- Dispatch: shipment volume/status by period -> matching shipment rows.

### Definition Of Done

- Every visual has a named business question and a user action or decision it supports.
- Filters update all in-scope KPIs, charts, details, and exports consistently.
- Drill-down returns the correct records and can be cleared without losing the page context.
- Displayed totals reconcile with the API and detail records for the same scope.
- The workflow is tested on desktop and mobile with mouse, keyboard, and touch where applicable.
- Loading, empty, error, zero, partial-data, and long-label cases are verified.

## Document Page Design Standard

- **Unified Layout**: All document forms (Procurement, Requisition, Sample Room) share the unified structure of `DocumentLayout.tsx` to eliminate code duplication.
- **Flat & Enterprise UI**: Avoid decorative gradients (`bg-gradient-*`); employ solid, high-contrast, professional styling aligned with enterprise ERP paradigms.
- **Visual Distinctness**: Use borders and `bg-[var(--color-surface-*)]` tokens to partition content clearly across Headers, Details, and Item Lines.
- **Data Configuration**: All form and table definitions are centralized in `formConfigs.ts` for ease of maintenance.

## Bar Chart Standard (2026-10-01)

All bar charts across the system have been standardized with consistent styling rules:

- **Square Edges**: All bar charts use `radius={[0, 0, 0, 0]}` — no rounded corners on any bar.
- **Zero Bar Gap**: All grouped bar charts use `barGap={0}` — bars within the same category group are flush against each other with no spacing.
- **No Max Bar Size**: Removed `maxBarSize` constraints from all `<Bar>` components to allow bars to fill available space naturally without gaps.
- **Unused `Cell` imports removed**: Cleaned up unused `Cell` imports from `ProductionForecastChart.tsx`.

**Affected Chart Files:**

| File | Chart Type | Changes |
|------|-----------|---------|
| `ProductionSummaryChart.tsx` | `ComposedChart` | `barGap={0}`, removed `maxBarSize={38}`, `radius=[0,0,0,0]` |
| `ProductionForecastChart.tsx` | `ComposedChart` | `barGap={0}`, `radius=[0,0,0,0]`, removed unused `Cell` import |
| `CustomerSalesChart.tsx` | `ComposedChart` | `barGap={0}`, removed `maxBarSize={calculatedMaxBar}`, `radius=[0,0,0,0]` |
| `FactoryOutputTrendChart.tsx` | Custom HTML bars | `borderRadius: 0` (was `4px 4px 1px 1px`) |
