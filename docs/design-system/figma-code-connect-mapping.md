# Afenda Figma Code Connect Mapping

This document defines the canonical mapping between Figma variables/components and Afenda ERP code primitives.

**Doctrine:** Code (`app/globals.css`, `lib/design-system.ts`, `components/ui`) is truth. Figma mirrors this document **after** code and local stability (`lint`, `typecheck`, `build`); do not start Figma integration until that bar is green. Do not invent Figma-only variant names ahead of code.

**Prerequisite:** Repo design-system docs and tokens are **finalized for the current slice** — see [`governance.md`](governance.md).

## Canonical Figma file

- **URL:** _(add your `https://www.figma.com/design/<fileKey>/...` when the library file exists)_
- **Library / collection name:** `afenda/semantic`
- Use the `fileKey` from the URL for MCP tools (`search_design_system`, `get_variable_defs`, `get_code_connect_map`).

## Token parity

- Figma variable collection: `afenda/semantic`
- Code token source: `app/globals.css` (`:root` / `.dark` for values; `@theme inline` for Tailwind utility names only)
- Tailwind usage: semantic utilities (`bg-primary`, `text-muted-foreground`, `border-border`, `p-surface-lg`, …)

### Semantic color mapping (primitives + theme)

| Figma variable (suggested)    | CSS variable                   | Example utility                      |
| ----------------------------- | ------------------------------ | ------------------------------------ |
| `color.background.default`    | `--background`                 | `bg-background`                      |
| `color.text.default`          | `--foreground`                 | `text-foreground`                    |
| `color.surface.card`          | `--card`                       | `bg-card`                            |
| `color.text.card`             | `--card-foreground`            | `text-card-foreground`               |
| `color.surface.popover`       | `--popover`                    | `bg-popover`                         |
| `color.text.popover`          | `--popover-foreground`         | `text-popover-foreground`            |
| `color.action.primary`        | `--primary`                    | `bg-primary`                         |
| `color.text.onPrimary`        | `--primary-foreground`         | `text-primary-foreground`            |
| `color.action.primaryHover`   | `--primary-hover`              | `bg-primary-hover`                   |
| `color.surface.secondary`     | `--secondary`                  | `bg-secondary`                       |
| `color.text.secondary`        | `--secondary-foreground`       | `text-secondary-foreground`          |
| `color.action.secondaryHover` | `--secondary-hover`            | `bg-secondary-hover`                 |
| `color.surface.muted`         | `--muted`                      | `bg-muted`                           |
| `color.text.muted`            | `--muted-foreground`           | `text-muted-foreground`              |
| `color.surface.accent`        | `--accent`                     | `bg-accent`                          |
| `color.text.accent`           | `--accent-foreground`          | `text-accent-foreground`             |
| `color.status.destructive`    | `--destructive`                | `bg-destructive`, `text-destructive` |
| `color.status.success`        | `--success`                    | `bg-success`                         |
| `color.text.success`          | `--success-foreground`         | `text-success-foreground`            |
| `color.status.warning`        | `--warning`                    | `bg-warning`                         |
| `color.text.warning`          | `--warning-foreground`         | `text-warning-foreground`            |
| `color.status.info`           | `--info`                       | `bg-info`                            |
| `color.text.info`             | `--info-foreground`            | `text-info-foreground`               |
| `color.status.critical`       | `--critical`                   | `bg-critical`                        |
| `color.text.critical`         | `--critical-foreground`        | `text-critical-foreground`           |
| `color.data.positive`         | `--data-positive`              | `text-data-positive`                 |
| `color.data.negative`         | `--data-negative`              | `text-data-negative`                 |
| `color.data.neutral`          | `--data-neutral`               | `text-data-neutral`                  |
| `color.border.default`        | `--border`                     | `border-border`                      |
| `color.border.input`          | `--input`                      | `border-input`, `bg-input`           |
| `color.focus.ring`            | `--ring`                       | `ring-ring`                          |
| `color.sidebar.bg`            | `--sidebar`                    | `bg-sidebar`                         |
| `color.sidebar.fg`            | `--sidebar-foreground`         | `text-sidebar-foreground`            |
| `color.sidebar.primary`       | `--sidebar-primary`            | `bg-sidebar-primary`                 |
| `color.sidebar.primaryFg`     | `--sidebar-primary-foreground` | `text-sidebar-primary-foreground`    |
| `color.sidebar.accent`        | `--sidebar-accent`             | `bg-sidebar-accent`                  |
| `color.sidebar.accentFg`      | `--sidebar-accent-foreground`  | `text-sidebar-accent-foreground`     |
| `color.sidebar.border`        | `--sidebar-border`             | `border-sidebar-border`              |
| `color.sidebar.ring`          | `--sidebar-ring`               | `ring-sidebar-ring`                  |

### Chart tokens

| Figma variable (suggested) | CSS variable | Example utility              |
| -------------------------- | ------------ | ---------------------------- |
| `color.chart.1`            | `--chart-1`  | `text-chart-1`, `bg-chart-1` |
| `color.chart.2`            | `--chart-2`  | `text-chart-2`               |
| `color.chart.3`            | `--chart-3`  | `text-chart-3`               |
| `color.chart.4`            | `--chart-4`  | `text-chart-4`               |
| `color.chart.5`            | `--chart-5`  | `text-chart-5`               |

### Spacing — surface inset + density

| Figma variable (suggested)  | CSS variable            | Tailwind utility (examples)      | `lib/design-system.ts`        |
| --------------------------- | ----------------------- | -------------------------------- | ----------------------------- |
| `space.surface.xs`          | `--space-surface-xs`    | `p-surface-xs`, `gap-surface-xs` | `uiSurfaceInset.xs`, key `xs` |
| `space.surface.sm`          | `--space-surface-sm`    | `p-surface-sm`, `px-surface-sm`  | `sm`                          |
| `space.surface.md`          | `--space-surface-md`    | `p-surface-md`                   | `md`                          |
| `space.surface.lg`          | `--space-surface-lg`    | `p-surface-lg`, `py-surface-lg`  | `lg`                          |
| `space.surface.xl`          | `--space-surface-xl`    | `p-surface-xl`                   | `xl`                          |
| `space.surface.2xl`         | `--space-surface-2xl`   | `p-surface-2xl`                  | `2xl`                         |
| `density.stack.comfortable` | `--density-comfortable` | `gap-density-comfortable`        | `uiDensity.comfortable`       |
| `density.stack.compact`     | `--density-compact`     | `gap-density-compact`            | `uiDensity.compact`           |

### Elevation + motion

| Kind         | CSS variables                     | Tailwind / code                                                    |
| ------------ | --------------------------------- | ------------------------------------------------------------------ |
| Shadow L1–L3 | `--elevation-1` … `--elevation-3` | `shadow-elevation-1` … `shadow-elevation-3` → `uiSurfaceElevation` |
| Duration     | `--motion-duration-fast` …        | `duration-*` / animation tokens from `@theme`                      |
| Easing       | `--motion-ease-standard` …        | easing tokens from `@theme`                                        |

### Radius + typography

| Kind           | Source                                | Notes                                                                |
| -------------- | ------------------------------------- | -------------------------------------------------------------------- |
| Radius scale   | `--radius` + `@theme` `--radius-sm` … | Map to Figma corner radii; code uses `uiRadius.*` class literals     |
| Heading / body | `@layer base` in `app/globals.css`    | `h1–h4` clamps + `p` line-height; Figma **text styles** should match |
| `font-heading` | `@theme` `--font-heading`             | Card/dialog titles: `uiTitle.sm`                                     |

### Platform

| Concern              | Code                                                              |
| -------------------- | ----------------------------------------------------------------- |
| Light/dark native UI | `color-scheme: light` on `:root`, `color-scheme: dark` on `.dark` |
| Class-based dark     | `@custom-variant dark (&:where(.dark, .dark *))`                  |

### Radius mapping (full `uiRadius`)

| Figma variable (suggested)  | Tailwind / code                     | `lib/design-system.ts`        |
| --------------------------- | ----------------------------------- | ----------------------------- |
| `radius.control`            | `rounded-lg`                        | `uiRadius.control`            |
| `radius.chip`               | `rounded-md`                        | `uiRadius.chip`               |
| `radius.surface`            | `rounded-2xl`                       | `uiRadius.surface`            |
| `radius.surfaceTop`         | `rounded-t-2xl`                     | `uiRadius.surfaceTop`         |
| `radius.surfaceBottom`      | `rounded-b-2xl`                     | `uiRadius.surfaceBottom`      |
| `radius.surfaceMediaTop`    | `*:[img:first-child]:rounded-t-2xl` | `uiRadius.surfaceMediaTop`    |
| `radius.surfaceMediaBottom` | `*:[img:last-child]:rounded-b-2xl`  | `uiRadius.surfaceMediaBottom` |
| `radius.section`            | `rounded-xl`                        | `uiRadius.section`            |

### Elevation mapping (`uiSurfaceElevation`)

| Figma effect (suggested) | Tailwind             | Code                          |
| ------------------------ | -------------------- | ----------------------------- |
| `elevation.default`      | `shadow-elevation-1` | `uiSurfaceElevation.default`  |
| `elevation.raised`       | `shadow-elevation-2` | `uiSurfaceElevation.raised`   |
| `elevation.floating`     | `shadow-elevation-3` | `uiSurfaceElevation.floating` |

**Card:** Root card uses `uiSurfaceElevation.default` plus `ring-1 ring-foreground/5` (see `components/ui/card.tsx`).

## Component naming parity

Use this format in Figma component names. Strings must match **exactly** what code and `lib/design-system.ts` export.

- `Button/variant={default|outline|secondary|ghost|destructive|link}/size={default|xs|sm|lg|icon|icon-xs|icon-sm|icon-lg}`
- `Card/size={default|sm}` — see `cardSizeKeys` / `cardSizeSchema`
- `Badge/variant={default|secondary|success|warning|info|critical|destructive|outline|ghost|link}` — see `badgeVariantKeys` / `badgeVariantSchema`
- `Input/state={default|invalid|disabled}` (invalid/disabled are behavioral; reflect in Figma for specs)

## Slot parity

Figma layer names should mirror `data-slot` values.

Examples:

- `button` → `data-slot="button"`
- `badge` → `data-slot="badge"`
- `card` → `data-slot="card"`
- `dialog-content` → `data-slot="dialog-content"`
- `table-head` → `data-slot="table-head"`
- `sidebar-menu-button` → `data-slot="sidebar-menu-button"`

## MCP workflow

1. Discover existing component first: `search_design_system`
2. Implement or adapt component in code (source of truth)
3. Extract design context when needed: `get_design_context`
4. Create/update map: `add_code_connect_map`
5. Publish mapping set: `send_code_connect_mappings`

## Rule

Do not introduce new variant names in Figma without updating code primitives and `lib/design-system.ts` in the same change.
