# ADR-0026: Metadata-Driven UI Architecture

**Status:** Accepted  
**Date:** 2026-05-17  
**Consolidates:** [ADR-0011](./0011-governed-surface-metadata-kernel.md) (schema kernel), [ADR-0021](./0021-components2-metadata-renderer-registry.md) (renderer registry), [ADR-0025](./0025-governed-renderer-placement-contract.md) (placement contract)

Historical ADRs remain for blame archaeology; **this document is the canonical architecture** for agents and `AGENTS.md`.

---

## Prime directive

```txt
Metadata declares intent. Runtime owns authority. Renderers compose primitives. Domain owns truth.
No runtime JSON-to-JSX. No tenant/session in client metadata. No low-code in production ERP paths.
```

Afenda is **not** a low-code platform. It is a **governed, server-first declarative UI** system: Zod-validated configuration envelopes, static 1:1 renderer dispatch, and pure server builders—semantically closest to **JSON Forms + react-admin** without a client interpreter or `dataProvider`.

---

## Four layers

| Layer | Location | Owns | Must not own |
| --- | --- | --- | --- |
| **Metadata** | `lib/features/governed-surface/schemas/` | Structure, semantics, `dataNature`, stability, action descriptors | Fetching, permissions, mutations |
| **Runtime** | `app/**/layout.tsx`, `page.tsx`, Server Actions | Session, org, locale, ERP RBAC, evidence, `RouteEnvelope` | Arbitrary layout in leaf components |
| **Renderer** | `components2/metadata/renderers/` | Presentation from `#components2/ui/*` | Domain queries, IAM decisions |
| **Domain** | `lib/features/<module>/` | Queries, mutations, audit, builders | React chrome, registry wiring |

**Handcrafted exclusions (permanent):**

- **Nexus Field — handcrafted:** orientation band, truth-map surface grid, Lynx summon chrome ([ADR-0038](./0038-nexus-field-governed-composition.md)).
- **Nexus Field — governed composition:** operational pressure, priority lanes, recent resolutions (`governed:list-surface` builders in `#features/nexus`).
- **Orbit — hybrid (ADR-0006):** governed **Pattern B** list tables for sessions, links, and signals-only surfaces; **handcrafted** card lists for queue/triage/today/timeline (batch selection, operational badges, focus links). Capture, detail panels, evidence graph, and timeline chrome remain handcrafted.
- **Fully handcrafted:** Lynx machine layer, specialized timeline grouping chrome.

---

## Schema kernel (`lib/features/governed-surface/`)

**Public doors:** `#features/governed-surface` (server RSC sections, builders) · `#features/governed-surface/client` (client islands, Zod, pure helpers — see [ADR-0030](./0030-module-client-server-barrel-boundary.md))

**Envelope** (`component.schema.ts`):

```ts
{ type: "governed:<variant>", serverType: string, configuration: <variantSchema> }
```

- `type` → `AFENDA_GOVERNED_COMPONENT_REGISTRY` → renderer id
- `serverType` → semantic intent for audit/telemetry
- `configuration` → per-variant Zod (`.strict()`, `SchemaStability` per schema)

**Authoring:** pure builders in `lib/features/<module>/.../data/*-surface-builders.server.ts` return `*ConfigurationInput`.

---

## Renderer kernel (`components2/metadata/`)

**Public doors:** `#components2` (narrow) · `#components2/metadata` (full) · `#components2/ui/*`

**Pipeline:** `GovernedComponentRenderer` → `GovernedComponentTree` → parse envelope → registry → `dataNature` pre-flight → `renderGovernedRendererById` → `*.renderer.tsx`.

**Import allowlist** (ESLint `afenda/components2-metadata-renderer-imports` on `renderers/**`): `#components2/ui/*`, `#features/governed-surface`, `#i18n/navigation`, `#lib/utils`, `react`, `lucide-react`.

**Forbidden:** `react-jsx-parser`, runtime JSON-to-JSX, `#app-shell`, feature barrels with `server-only`.

**Parity:** `pnpm lint:components2-renderers` · `pnpm lint:renderer-contracts` · `pnpm lint:renderer-container-queries` · `pnpm lint:renderer-skeleton-parity` · `pnpm lint:renderer-fixtures` · `pnpm lint:list-surface-table-imports`.

---

## Placement contract (ADR-0025 summary)

1. **Container queries** in `renderers/**` — `@container` + `@sm:`/`@md:`; no viewport `sm:`/`md:` for layout grids.
2. **`dataNature`** on every non-container configuration schema; mirrored in `AFENDA_GOVERNED_RENDERER_CONTRACTS`.
3. **Leaf tiles** use `#components2/ui/*`; variant maps typed as `Record<SchemaEnum, string>`.
4. **Display strings** on stat-card `value`/`delta` must be human-ready (no raw ISO dates or bare decimals in snapshot summaries).

---

## Composition patterns

### Section composition layering

```txt
GovernedSurface (page chrome)
  → GovernedSection (in-page heading block, no Card)
  → GovernedSurfaceSectionCard (Card shell + forbidden | invalid | empty | ready body)
  → GovernedPatternCListSection (Pattern C default — permission, parse, list, telemetry)
```

**Section composition score (Pattern C blocks):** [`docs/architecture/governed-section-composition-score.md`](../architecture/governed-section-composition-score.md).

**Dev fixtures:** `/[locale]/playground/pattern-c-section-gallery` — forbidden, invalid, empty, trailing-disabled.

| Pattern | When | Mechanism |
| --- | --- | --- |
| **A — Chrome only** | Bespoke forms, settings | `GovernedSurface` + `GovernedSection` + `ModulePageHeader` |
| **B — Full tree** | KPI grids, directories, audit (no trailing forms) | Builder + `GovernedComponentRenderer` inside manual section `Card` |
| **C — Trailing column** | List metadata + non-serializable row actions | `GovernedPatternCListSection` from `#features/governed-surface` |
| **K — Kanban** | Column workflow boards | Builder → `governed:kanban-board` + mode-specific client bridge (see below) |

Pattern C is the **only** approved bypass of `GovernedComponentRenderer` for list tables. Feature modules must not import `list-surface-table` from `components2/metadata/renderers/` (use `GovernedListSurfaceWithTrailingColumn` via the section primitive or the documented portal embedded helper).

### Pattern A recipe

1. Page: `ModulePageHeader` or `GovernedSurface` header from a server builder.
2. Compose bespoke forms and settings with `GovernedSection` (title + description + children).
3. Do not call `parseListSurfaceRendererConfiguration` in leaf components unless rendering a governed list.

### Pattern B recipe

Reference: [`lib/features/contacts/components/contacts-page.tsx`](../../lib/features/contacts/components/contacts-page.tsx).

1. Add `lib/features/<module>/data/*-surface-builders.server.ts` returning `ListSurfaceRendererConfigurationInput` with `requiresErpPermission` when the list is gated.
2. Page: `Promise.all` for session, translations, queries; `resolveGovernedErpPermissionAllowed` from `#features/governed-surface/server` when `requiresErpPermission` is set.
3. Wrap in `Card` + optional `CardAction` (header CTAs that are not row actions).
4. Render `GovernedComponentRenderer` with `surfaceKey`, `type: "governed:list-surface"`, and `configuration`.
5. On forbidden: `GovernedEmpty` with `variant: "forbidden"` — not a bare `<p>`.

**Deferred:** `GovernedPatternBListSection` (unified Card + permission + renderer). Until then, manual `Card` around Pattern B is correct.

### Pattern C recipe

Reference: [`lib/features/hrm/employee-management/employee-lifecycle-management/components/hrm-onboarding-section.tsx`](../../lib/features/hrm/employee-management/employee-lifecycle-management/components/hrm-onboarding-section.tsx).

1. Builder (`*-list-surface.server.ts`): `dataNature: "table"`, `requiresErpPermission`, `surface.empty`, per-row `trailingAction` via `resolveListSurfaceRowTrailingAction` when actions are permission- or policy-gated.
2. Thin RSC section: `GovernedPatternCListSection` with `listConfiguration`, `surfaceKey`, `title` / `description`.
3. `trailingColumn.render`: map `surfaceRow.id` → domain row; honor `surfaceRow.trailingAction` with `isListSurfaceTrailingActionRenderable`; wrap controls in `GovernedTrailingActionSlot` from `#features/governed-surface/client`.
4. Query failures: `loadError` prop (`EmptyState` variant `error`) — same shell as invalid/forbidden.
5. **Layouts:** `layout="card"` (default — section owns Card chrome) vs `layout="embedded"` (parent page already has `Card` + header — pass `title=""`).
6. **Test hooks:** `data-testid="governed-list-section:{surfaceKey}"` on the section wrapper.

**Portal employee surfaces:** use `GovernedPatternCListSection` with `layout="embedded"` and `title=""` when the parent `Card` already owns section chrome (see `employee-portal-claims-page.tsx`).

### Pattern K — Kanban recipe

Reference: [`recruitment-pipeline-kanban-section.tsx`](../../lib/features/hrm/talent-management/recruitment-onboarding/components/recruitment-pipeline-kanban-section.tsx).

1. Builder: `build*KanbanConfiguration` in `*-surface-builders.server.ts` → `GovernedKanbanBoardConfigurationInput` with `dataNature: "kanban"`, `interactionMode`, `workflow`, `copy`, columns/cards.
2. RSC section: `GovernedKanbanFooterSection` (alias `GovernedKanbanDragSection` for drag) with `surfaceKey`, `layout` (`titled` | `embedded`), optional `sectionTestId` (Pattern C parity: `governed-list-section:{surfaceKey}` when reusing list E2E hooks).
3. Client bridge by `interactionMode`:
   - `read-only` — `GovernedComponentRenderer` (`governed:kanban-board`) or gallery; transition hints from `availableTransitions`.
   - `footer-actions` — `GovernedKanbanFooterBoard` + `renderCardFooter` (Server Action forms); **do not** route footer boards through `KanbanBoardRenderer`.
   - `drag-reorder` — `GovernedKanbanDragBoard` + `onCardMove`; domain owns mutations.
4. Invalid config: bridges render `GovernedEmpty` (`variant: "error"`); operator diagnostics via `showOperatorDiagnostics` in dev.

**Gallery:** `/[locale]/playground/metadata-renderer-gallery` — `kanban-recruitment`, `kanban-recruitment-drag`, `kanban-recruitment-footer`.

### Trailing actions (Wave C3)

Domain builders attach `trailingAction` on each `ListSurfaceRow` (`hidden` | `disabled` | `ready`, optional `disabledReason`, optional `ActionDescriptor`). RSC sections render non-serializable forms in `trailingColumn.render` but must honor metadata via `GovernedTrailingActionSlot` (`#features/governed-surface/client`). Cells expose `data-trailing-action-state` and `data-action-descriptor-id`.

### Forbidden (section composition)

```txt
parseListSurfaceRendererConfiguration + hand-rolled Card + GovernedListSurfaceWithTrailingColumn in feature modules (use GovernedPatternCListSection)
Early return with a duplicate empty Card when rows.length === 0 (let section + surface.empty handle empty)
GovernedComponentRenderer fork for empty rows inside Pattern C sections (unified ListSurfaceTable empty path)
Deep import of list-surface-table from lib/features/**
```

---

## Design-reserve renderers

Types in `governedComponentTypeSchema` without a shipped renderer (`multi-step-form`, `scorecard-form`) are **design-reserve**. **`governed:chart`**, **`governed:approval-timeline`**, and **`governed:kanban-board`** are shipped (see `components2/metadata/renderers/`). `footer-actions` and `drag-reorder` kanban modes use domain client bridges, not `KanbanBoardRenderer` alone. Builders must not emit reserve types until a renderer ships (`pnpm lint:renderer-contracts` enforces registry ↔ type parity).

---

## Low-code and playground (deferred)

**Production ERP:** no stored app JSON, visual canvas, or runtime layout editor.

**Governed Playground (dev only):** extends `/[locale]/playground/metadata-renderer-gallery` — fixtures, width presets, `diagnostics: "operator"`. Same kernels; no persistence. Optional Zod 4 `z.toJSONSchema()` export for docs tooling only.

---

## Generator

`pnpm gen governed-renderer` scaffolds schema + renderer + test. Run `pnpm exec node scripts/wire-governed-renderer.mjs --id <kebab>` to patch registry, dispatch, skeleton, and contract files, then `pnpm lint:renderer-*`.

---

## P2 backlog (not blocking mass Pattern B/C rollout)

- Ship **multi-step-form**, **scorecard-form** renderers (or remove from schema); extend kanban production adoption beyond recruitment pipeline
- Rules layer on form configs (`rule.effect` — JSON Forms–style, server-evaluated)
- `__schemaVersion` on envelopes
- Column-level / envelope permission keys (react-admin–style granularity beyond list `requiresErpPermission`)
- Draft inferencer → server `*-surface-builders.server.ts` drafts (not Refine client inferencer)
- `GovernedPatternBListSection` (unified Card + permission + renderer)
- Figma Code Connect per renderer
- Full playground editor with persistence (dev only — production low-code remains refused)

---

## Maturity score

Current re-score: [`docs/architecture/metadata-maturity-score.md`](../architecture/metadata-maturity-score.md) (**91/100** — mature platform; mass default **Go**). Pattern C section rubric: [`governed-section-composition-score.md`](../architecture/governed-section-composition-score.md).

## References

- Handbook: `docs/governance/governed-surface-zod-schema-contract.md`
- Cursor: `.cursor/rules/governed-surface-schema-contract.mdc`, `.cursor/rules/governed-renderer-contract.mdc`
- Maturity plan: `.cursor/plans/metadata_ui_maturity_audit_d18acb49.plan.md`
