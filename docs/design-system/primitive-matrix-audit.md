# Primitive Matrix Audit

**Snapshot:** Synchronized with `app/globals.css`, `lib/design-system.ts`, and `docs/design-system/governance.md` for the **pre–Figma / Code Connect** slice.

Audit target from upgrade plan:

- button
- input
- select
- textarea
- badge
- card
- dialog
- table
- sidebar
- tooltip

## Matrix criteria

- variant contract consistency
- size contract consistency
- slot naming via `data-slot`
- focus/invalid state consistency
- semantic color token usage
- spacing tokens (`surface-*`, `density-*`) where primitives implement inset or stack rhythm

## Current audit snapshot

| Primitive | Variant/Size | Slots | Focus/Invalid | Semantic tokens | Notes                                                                                          |
| --------- | ------------ | ----- | ------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| button    | pass         | pass  | pass          | pass            | `uiRadius`, `uiTracking`, `primary-hover` / `secondary-hover`                                  |
| input     | pass         | pass  | pass          | pass            | Inset uses `px-surface-sm` / `py-2.5`; consistent invalid states                               |
| select    | pass         | pass  | pass          | pass            | Semantic background/foreground tokens                                                          |
| textarea  | pass         | pass  | pass          | pass            | Matches input focus/invalid behavior                                                           |
| badge     | pass         | pass  | pass          | pass            | Status variants (`success`, `warning`, `info`, `critical`); link hover uses hover tokens       |
| card      | pass         | pass  | pass          | pass            | Preferred `ui.radius.card`, `uiTitle.sm`, `ui.elevation.card`, `p-surface-*` / `gap-surface-*` |
| dialog    | pass         | pass  | pass          | pass            | Overlay/content follow token contract                                                          |
| table     | pass         | pass  | pass          | pass            | `density` prop (`comfortable` / `compact`); row/cell padding via group selectors               |
| sidebar   | pass         | pass  | pass          | pass            | Slot model + sidebar semantic tokens                                                           |
| tooltip   | pass         | pass  | pass          | pass            | Shared radius/tracking                                                                         |

## Design-system.ts alignment

- **`ui`** — preferred familiar aliases for radius, padding, gap, elevation, tone, and priority; maps to existing token-backed utilities.
- **`uiPrimitiveKeys` / `uiPrimitiveSchema`** — governed primitive names (`button`, `input`, `badge`, `card`, `panel`, `dialog`, `popover`, `sheet`, `toolbar`, `table`).
- **`uiDensity` / `uiDensityKeys`** — `gap-density-comfortable` / `gap-density-compact` (token-backed; matches `--density-*` in `app/globals.css`).
- **`uiSurfaceSpaceKeys` / `uiSurfaceInset` / `parseUiSurfaceSpaceKey`** — mirror `--space-surface-*` for CMS/API validation and composition.

## Remaining plan-related blocker

- **Figma:** Empty file → `afenda/semantic` variables (light/dark) + primitive components; paste **Figma file URL** into `figma-code-connect-mapping.md`.
- **Code Connect:** Deferred until Figma library is stable and publish access is available.

## Enforcement note

- ERP UI under `lib/features/` is included in `scripts/check-design-contract.mjs` (same radius/shadow/arbitrary-rounded rules as `app/`).
