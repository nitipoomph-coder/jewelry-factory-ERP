---
name: Gemstone Lifecycle Management
description: Data-dense jewelry factory ERP for sales, production, dispatch, and customer reporting.
colors:
  brand-500: "oklch(0.68 0.14 245)"
  brand-600: "oklch(0.78 0.11 245)"
  accent-500: "oklch(0.72 0.14 200)"
  surface-0: "oklch(0.22 0.03 250)"
  surface-1: "oklch(0.18 0.03 250)"
  surface-2: "oklch(0.28 0.03 250)"
  surface-800: "oklch(0.12 0.02 250)"
  surface-900: "oklch(0.08 0.02 250)"
  text-primary: "oklch(0.95 0.01 250)"
  text-secondary: "oklch(0.80 0.02 250)"
  text-tertiary: "oklch(0.65 0.03 250)"
  text-inverse: "oklch(0.15 0.02 250)"
  border-light: "oklch(0.28 0.03 250)"
  border-default: "oklch(0.34 0.03 250)"
  border-strong: "oklch(0.42 0.03 250)"
  sidebar: "oklch(0.16 0.03 250)"
  sidebar-hover: "oklch(0.20 0.03 250)"
  sidebar-accent: "oklch(0.68 0.14 245)"
  table-header: "oklch(0.28 0.03 250)"
  table-row-alt: "color-mix(in srgb, var(--color-surface-1) 65%, var(--color-surface-0))"
  table-footer: "color-mix(in srgb, var(--color-brand-500) 6%, var(--color-surface-0))"
  success-500: "oklch(0.70 0.16 150)"
  warning-500: "oklch(0.75 0.16 80)"
  danger-500: "oklch(0.68 0.18 25)"
  info-500: "oklch(0.70 0.15 220)"
  chart-1: "oklch(0.62 0.17 255)"
  chart-2: "oklch(0.62 0.14 165)"
  chart-3: "oklch(0.70 0.15 80)"
  chart-4: "oklch(0.60 0.17 300)"
  chart-5: "oklch(0.60 0.18 20)"
  chart-6: "oklch(0.55 0.05 255)"
typography:
  display:
    fontFamily: "Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  headline:
    fontFamily: "Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  title:
    fontFamily: "Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-500}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface-0}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "36px"
  filter-chip:
    backgroundColor: "{colors.surface-0}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  panel:
    backgroundColor: "{colors.surface-0}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  table-header:
    backgroundColor: "{colors.table-header}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    padding: "10px 12px"
---

# Design System: Gemstone Lifecycle Management

## Overview

**Creative North Star: "The Precision Control Room"**

Gemstone Lifecycle Management is a premium factory control surface for jewelry operations. It must feel precise, authoritative, and efficient, with the confidence of a business intelligence tool and the specificity of a real production and sales floor system.

The interface is intentionally data-dense. Users are expert internal staff who need to find a customer, order, quantity, amount, shipment state, or production status in under 5 seconds. Density is useful here when hierarchy, spacing, alignment, and state are disciplined.

The system rejects Excel-like rigidity, playful consumer styling, generic SaaS hero dashboards, glassmorphism, decorative gradients, and charts that compete with the table. Sales screens should be filter-first and table-first. Charts may support decisions, but they must never become decoration.

Key Characteristics:
- Compact, readable, and operational.
- Same vocabulary across Sales, Production, PO, and Dispatch.
- Three themes, one product language: Modern Dark, Dark Gold, and Royal White.
- Status and filter state must be clearer than visual flair.

## Colors

The palette follows a system-wide 60-30-10 role model. The ratio is a visual hierarchy target for a screen, not a requirement to measure every pixel.

60-30-10 Roles:
- **60% Operational Canvas**: `--color-ui-canvas` for the app workspace and page background.
- **30% Working Surfaces**: `--color-ui-surface` and `--color-ui-raised` for tables, filters, panels, menus, and hover surfaces.
- **10% Interaction Accent**: `--color-ui-interactive`, `--color-ui-interactive-hover`, `--color-ui-selected`, and `--color-ui-focus-ring` for primary actions, selection, links, active navigation, and keyboard focus.

Implementation Rules:
- Components consume role tokens first. Theme classes own the underlying palette values.
- Brand is the only color for generic interaction. Never use success green, warning amber, chart colors, or customer-group colors merely to make a control look active.
- Status, severity, production stage, ranked data, and chart series are semantic exceptions. Use them only where the color communicates actual data, and always pair color with text, icon, value, or position.
- Neutral content should visually dominate every operational page. Repeated colorful cards, decorative category dots, gradients, glass effects, and color-coded filters are not allowed.

Primary:
- **Control Blue** (`oklch(0.68 0.14 245)`): primary buttons, active navigation, selected filters, focus states, and important linked identifiers such as Order No.
- **Action Blue Lift** (`oklch(0.78 0.11 245)`): hover and active emphasis for primary controls.

Accent:
- **Analytic Cyan** (`oklch(0.72 0.14 200)`): reserved for data visualization or an explicitly defined informational meaning; it is not a second interaction color.

Neutral:
- **Operational Canvas** (`oklch(0.18 0.03 250)`): default dark workspace background.
- **Panel Surface** (`oklch(0.22 0.03 250)`): cards, toolbars, filter panels, and table containers.
- **Raised Surface** (`oklch(0.28 0.03 250)`): hover rows, selected secondary controls, dropdown surfaces.
- **Primary Text** (`oklch(0.95 0.01 250)`): core labels and high-priority numbers.
- **Secondary Text** (`oklch(0.80 0.02 250)`): metadata, sublabels, customer codes, dates, and helper text.
- **Strong Border** (`oklch(0.42 0.03 250)`): table separation, active panels, and structural boundaries.

Status:
- **Success Green** (`oklch(0.70 0.16 150)`): shipped, completed, healthy, and confirmed states.
- **Warning Gold** (`oklch(0.75 0.16 80)`): partial, pending attention, and approaching due states.
- **Danger Red** (`oklch(0.68 0.18 25)`): late, overdue, error, and blocked states.
- **Info Blue** (`oklch(0.70 0.15 220)`): open, processing, and neutral informational state.

Named Rules:
**The Meaning Before Color Rule.** A color must map to a known domain meaning: action, selection, status, process, rank, or series. Do not introduce a new color for decoration.

**The One Interaction Color Rule.** Buttons, links, focus, selected filters, and active navigation use the brand role tokens in every theme. Semantic colors never stand in for selection.

**The Sales Restraint Rule.** Sales dashboards use customer, order, amount, quantity, shipment, and item language. Do not use production-stage colors or labels in Sales unless the user explicitly enters a production detail view.

## Typography

**Display Font:** Roboto, sans-serif
**Body Font:** Roboto, sans-serif
**Logo Font:** Cinzel, serif

Character: typography should feel crisp, compact, and managerial. It should support scanning across dense rows rather than marketing impact.

Hierarchy:
- **Display** (700, 1.5rem, 1.2): page titles, dashboard names, and high-level report labels.
- **Headline** (700, 1.125rem, 1.3): panel titles and major table/report sections.
- **Title** (600, 1rem, 1.35): card headings, filter group names, and modal titles.
- **Body** (400, 0.875rem, 1.5): table cells, descriptions, normal UI labels, and dense operational content.
- **Label** (700, 0.75rem, 0.08em): table headers, compact badges, column labels, and uppercase metadata.

Named Rules:
**The No Hero Type Rule.** Use large type only for true page titles. Dashboards, tables, filters, and analytics panels should stay compact so more operational data remains visible.

**The Numeric Clarity Rule.** Quantities, percentages, and amounts must align consistently. Right-align numeric table cells and keep currency/quantity formats stable across screens.

## Responsive Layout And Density

The interface uses responsive reflow, stable type, and local overflow. It does not scale the entire application to imitate another monitor size.

- The shell fills `100dvh`. Sidebar and topbar remain usable while the content outlet owns page scrolling.
- Shared content frames use the available width with controlled limits: 1860px for standard dashboards, 2400px for wide analytics, and full width for document/table workspaces.
- Container breakpoints respond to usable content width at 1200px, 1120px, and 620px. Below 820px viewport width, the expanded sidebar is an overlay with a dismissible scrim.
- Typography uses the fixed compact ERP tokens from `src/index.css`; font size never scales with viewport width and letter spacing remains zero.
- Large displays add columns, chart width, or comparison panels. Small displays stack sections, wrap commands, and provide local scrolling for wide tables or toolbars.
- CSS `zoom`, transformed whole-page scaling, and document-level horizontal overflow are prohibited.
- Loading skeletons match the final data footprint and replace only the content outlet. Sidebar, topbar, navigation state, and theme controls remain available.
- Responsive verification covers 390x844, 1440x900, and 2560x1440 in Royal White, Dark Gold, and Modern Dark.

## Elevation

The system is layered more by tone, border, and state than by heavy shadows. Panels sit on surface color changes; dropdowns, popovers, menus, modals, and floating pagination may use shadows to clarify stacking. Resting dashboards should not feel floaty.

Shadow Vocabulary:
- **Panel Ambient**: `--shadow-panel` for the few repeated items that need low elevation.
- **Dropdown Layer**: `--shadow-dropdown` or `--shadow-floating` for menus, date pickers, and popovers.
- **Modal Layer**: `--shadow-modal` for dialogs and blocking workflows.

Named Rules:
**The Flat By Default Rule.** A dense business screen should look stable at rest. Use borders and surface contrast first; add shadow only when an element must sit above the work surface.

## Components

Buttons:
- **Shape:** compact rounded rectangle, usually 8px radius.
- **Primary:** Control Blue background, inverse text, 36px height, icon plus label when the command benefits from recognition.
- **Secondary:** surface background, border, primary text, same height as primary.
- **Ghost:** transparent background, text-secondary at rest, surface hover.
- **Focus:** visible brand outline or ring. Focus must be keyboard-visible across all themes.

Filters and Selectors:
- **Style:** filters live in a compact toolbar or panel above the table/report.
- **Months:** use drilldown or multi-select dropdown patterns when the list is long; avoid large select-all controls that dominate the layout.
- **Years:** treat year as a deliberate report context. If a year is fixed by the page/query, show it as selected state rather than a noisy clickable chip.
- **Customer Groups:** show group name and included customer codes clearly. A selected group must be visually stronger than unselected groups.

Chips:
- **Style:** small radius, neutral surface, border, and text label. Do not add category-colored dots unless color is required to match a visible data series.
- **State:** active chips use brand tint and stronger border; inactive chips stay quiet.
- **Use:** customer groups, market, status, type, and saved filters.

Cards / Containers:
- **Corner Style:** 8px maximum for operational cards and panels.
- **Background:** `--color-ui-surface` for panels and `--color-ui-raised` for hovered or raised subareas.
- **Border:** one-pixel border-light or border-default. Use border-strong only for active/selected structures.
- **Internal Padding:** 12px to 24px. Dashboards can be dense; avoid oversized decorative cards.

Inputs / Fields:
- **Style:** surface-1 background, border-default outline, 8px radius, body text.
- **Focus:** brand border or ring; do not rely on color alone.
- **Disabled:** reduce opacity and keep text readable enough to explain state.
- **Error:** danger color plus clear message or state label.

Navigation:
- **Sidebar:** accordion hierarchy, active accent, compact row height, and consistent icons from lucide-react.
- **Route Names:** menu labels must describe the business task, not the internal implementation. Example: Customer Sales Analysis, Top Order Lines, Customer Report Matrix.
- **Active State:** preserve active sidebar state when moving from overview to detail pages.
- **Page Titles & View Switchers:** Do not repeat the page title in a page hero when the Topbar breadcrumb already shows it. Place view switchers in the filter toolbar row.
- **View Switcher Navigation:** View switchers must navigate with router state/search params (`navigate()`), never `<a href>`, so filters are preserved.

Tables:
- **Structure:** sticky header where practical, clear column alignment, right-aligned numbers, compact rows, and visible pagination.
- **Sales Detail:** Order No, Item No, Ord Date, Cust Due, Customer, Brand, Type, Ord Qty, Shipped, Amount, Status, Market, Actions.
- **Status:** Sales uses Open, Partial, Shipped, Late. Do not show Casting, Polish, QC, or production-stage status in Sales tables.
- **Links:** Order No and Item No can be action links, but must look like operational identifiers rather than marketing links.
- **Analytics Frame:** Analytics pages use the shared `app-content-frame--dashboard-wide` frame (24px gutter, max 2400px). Never invent page-specific max-width values.
- **Column Sizing:** Fixed-purpose columns (progress bars, numeric years, totals) have fixed widths; only descriptive columns (item description, customer) absorb extra width on wide screens.
- **Derived Columns:** Hide derived columns that duplicate a single visible value (e.g. Total/Avg when only one year is shown).
- **Rank Highlights:** Rank highlights use `--color-rank-1/2/3` with the rank number as the second cue.

## Do's and Don'ts

Do:
- Use existing tokens from `Jewelry Factory System/frontend/src/index.css`.
- Run `npm run lint:colors` after UI changes; `npm run lint` includes this guard automatically.
- Keep Sales pages focused on customer groups, orders, amounts, quantities, shipped quantities, item type, and item lines.
- Keep filters compact, visible, and close to the table they control.
- Use table-first layouts when users need exact order-level data.
- Use charts only when they answer a specific business question better than a table.
- Keep typography, button sizing, spacing, and border radius consistent across all dashboards.
- Support Thai labels and mixed Thai/English operational data without breaking layout.

Don't:
- Do not copy the Production Dashboard structure into Sales.
- Do not use production-stage labels or colors in Sales overview pages.
- Do not create hero sections, glass panels, gradient text, or oversized metric cards for operational dashboards.
- Do not hardcode one-off chart colors when tokenized chart/status colors already exist.
- Do not use a semantic or chart color for a normal button, selected tab, focus ring, or decorative card.
- Do not hide exact Order No or Item No behind summary-only views.
- Do not make filters so large that they push the table or key report below the fold.
- Do not introduce a new font unless the whole system is intentionally migrating.
- Do not use thick colored borders on one side of a card (`borderLeft: 4px solid...`). This is a recognizable tell of AI-generated UIs. Use subtler accents or remove them entirely.
- Do not add redundant or duplicate page-level Refresh buttons in the page header. The application shell already provides the standard Global Topbar Refresh button (which pages hook into using `useTopbarActions`).
