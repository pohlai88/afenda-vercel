# ADR-0025: Governed Renderer Placement Contract

> **Canonical architecture:** [ADR-0026](./0026-metadata-driven-ui-architecture.md). Placement rules are summarized in ADR-0026 §Placement contract.

**Status:** Accepted  
**Date:** 2026-05-17  
**Extends:** ADR-0011 (schema kernel), ADR-0021 (renderer registry)

## Context

ADR-0021 established the renderer registry and the import allowlist for renderer files.
It did not govern three things that produce layout drift:

1. **Placement geometry** — renderers hard-code viewport breakpoints (`sm:grid-cols-4`).
   When a builder places such a renderer in a narrow container the breakpoint fires on the viewport,
   not the container, and the layout overflows.

2. **Data nature** — the registry maps a governed component type to a renderer id.
   It does not record what kind of data the renderer can meaningfully display.
   A builder can wire a document-breakdown to a KPI grid; the schema accepts it; the renderer renders
   broken output.

3. **Primitive bypass** — renderers authoring raw `<div>` elements with ad-hoc Tailwind classes
   detach tile geometry from the design system. Future token changes do not propagate; each renderer
   reinvents the same geometry with small divergences.

The session that produced this ADR observed `governed:stat-card` rendered inside a 320 px aside
column using `sm:grid-cols-4`. The viewport was wide; the container was not.
Payslip document-summary figures were provided to a KPI renderer; the schema accepted them.

## Decision

### 1. Container queries replace viewport breakpoints in all renderer geometry

Every renderer that lays out its children in a grid or flex sequence must wrap itself in
`@container` and use `@sm:` / `@md:` / `@lg:` / `@xl:` / `@2xl:` container breakpoints,
not `sm:` / `md:` / `lg:` viewport ones.

Viewport breakpoints remain valid for:
- Media-query-only shell chrome (`components2/app-shell/`)
- Print or reduced-motion variants

They are **forbidden** for any element inside `components2/metadata/renderers/**`.

### 2. Every configuration schema declares `dataNature`

Every renderer configuration schema that is not a pure container (`section`, `stack`) must export:

```ts
export const <name>DataNatureSchema = z.enum([...])
export type <Name>DataNature = z.infer<typeof <name>DataNatureSchema>
```

And include `dataNature: <name>DataNatureSchema` as a required field in the configuration schema.
The Zod default mechanism may assign a backwards-compatible default for schemas that predate
this ADR (`stat-card` defaults to `"kpi"`).

Builders that produce a dataNature other than the default must set it explicitly.
The renderer registry contract map validates pairings at runtime (see §3).

**Defined data natures by renderer:**

| Renderer | Accepted dataNatures | Meaning |
|---|---|---|
| `stat-card` | `kpi`, `snapshot-summary` | KPI = aggregated operational metric with optional trend delta; snapshot-summary = document figure without trend delta |
| `list-surface` | `table`, `document-lines` | table = general tabular data; document-lines = ordered rows of a structured document |
| `section` | _(unconstrained)_ | Container only |
| `stack` | _(unconstrained)_ | Container only |
| `action-bar` | `actions` | Named action group |
| `audit-panel` | `audit-trail` | IAM audit event history |
| `detail-tabs` | `tabbed-detail` | Tabbed detail layout |

New renderer ids added to the registry must add a row to this table and update the contract map.

### 3. Registry carries a contract map alongside the id map

`components2/metadata/registry.ts` exports two objects:

- `AFENDA_GOVERNED_COMPONENT_REGISTRY` — existing id map (unchanged shape)
- `AFENDA_GOVERNED_RENDERER_CONTRACTS` — `Record<AfendaGovernedRendererId, RendererContractEntry>`

`RendererContractEntry`:

```ts
type RendererContractEntry = {
  /** Data natures this renderer is designed to display. */
  acceptedNatures: readonly string[]
  /**
   * Minimum container width in px at which the renderer's default layout
   * is legible. Informational — used by the dispatcher for operator diagnostics.
   */
  minContainerPx: number
}
```

`GovernedComponentTree` extracts the raw `dataNature` field from `data.configuration` before
dispatching and rejects mismatches with a `GovernedEmpty` error visible to the `operator`
diagnostics audience.

### 4. Renderers compose shadcn primitives; no raw `<div>` at the tile level

Every leaf UI element in a renderer (tile, row, badge, cell) must be built from a
primitive exported by `#components2/ui/*`. Structural wrapper elements (`<section>`,
`<ul>`, `<li>`, `<nav>`) are exempt.

Variant tables (`DELTA_TONE_CLASS`, layout grids, density spacing) are declared as
`const` maps keyed on schema enum values. Each map is exhaustive — TypeScript's
`Record<SchemaEnum, string>` makes every new enum value a compile error in the renderer.

ESLint rule `afenda/renderer-no-raw-div` enforces this on `components2/metadata/renderers/**`.

### 5. Governance document updated in the same PR

`docs/governance/governed-surface-zod-schema-contract.md` gains:
- Checklist row 11: `dataNature` field required (see §2)
- Checklist row 12: no viewport breakpoints in renderer geometry (see §1)
- Checklist row 13: no raw `<div>` at tile/leaf level (see §4)

`.cursor/rules/governed-renderer-contract.mdc` enforces all three at authoring time.

## Consequences

- `stat-card.schema.ts` gains `dataNature` (default `"kpi"`) — backwards compatible.
- `registry.ts` gains `AFENDA_GOVERNED_RENDERER_CONTRACTS` and `RendererContractEntry`.
- `governed-component-tree.tsx` gains a dataNature pre-flight check.
- `eslint.config.mjs` gains `afenda/renderer-no-raw-div` rule scoped to `components2/metadata/renderers/**`.
- All new renderers authored after this ADR must satisfy all four rules at PR time.
  Existing renderers are migrated on a module-by-module basis; each migration resets the lint baseline.
- The placement bug that prompted this ADR (`stat-card` in a 320 px aside) cannot recur:
  the renderer uses container queries; the schema declares `dataNature: "snapshot-summary"`;
  the registry rejects a `stat-card` carrying `dataNature: "table"` at dispatch time.
