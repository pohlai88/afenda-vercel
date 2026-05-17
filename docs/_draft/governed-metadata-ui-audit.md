# Governed metadata UI — external benchmark and anti-drift audit

**Date:** 2026-05-17  
**Scope:** Audit only — no ADR commitments, no code changes in this document.  
**Lens:** Consistency · anti-drift · automation-enforced · lesser customization surface.

**Sources:** In-repo inspection (ADR-0011, ADR-0021, ADR-0025, governed-surface kernel,
`components2/metadata/`), plus public documentation for JSON Forms, Retool, react-admin,
Refine, and Plasmic (Context7 / vendor docs, May 2026).

---

## 1. Executive summary

Afenda's metadata-driven UI is a **two-kernel** system: a **schema kernel** in
`lib/features/governed-surface/` (Zod configuration contracts, stability tiers, action/event
metadata) and a **renderer kernel** in `components2/metadata/` (id-based dispatch, typed
React renderers, import allowlist). Pages do not download opaque UI JSON; RSC **builders** in
`lib/features/<module>/.../data/*-surface-builders.server.ts` map domain rows into configuration
objects that `GovernedComponentTree` validates and dispatches.

**Inventory (as of this audit):**

| Artifact | Count / state |
| --- | --- |
| Schema modules under `lib/features/governed-surface/schemas/` | 25 files |
| `AfendaGovernedRendererId` union | 13 ids |
| Entries in `AFENDA_GOVERNED_COMPONENT_REGISTRY` | 8 (`governed:stat-card` … `governed:detail-tabs`) |
| Shipped `*.renderer.tsx` files | 8 (parity with registry via `pnpm lint:components2-renderers`) |
| Governance ADRs | ADR-0011 (kernel), ADR-0021 (registry), ADR-0025 (placement contract) |
| Cursor rules | `governed-surface-schema-contract.mdc`, `governed-renderer-contract.mdc` |

**Critical infrastructure note:** `lib/features/governed-surface/schemas/component.schema.ts`
currently contains only the literal `3` on disk. The barrel still re-exports
`governedComponentDiscriminatedSchema` and `parseGovernedComponentData`. Typecheck reports
`TS2306: File … is not a module`. Until restored, the governed component envelope is not
enforced at build time — only tests and partial runtime paths remain.

**Session that motivated ADR-0025:** `governed:stat-card` in a ~320 px aside used viewport
breakpoints (`sm:grid-cols-4`); payslip document figures were passed without `dataNature:
"snapshot-summary"`. Schema accepted the payload; renderer produced cramped, misleading UI.
Governance (Zod `dataNature`, registry contracts, tree pre-flight) was added; **renderer and
skeleton implementations still use viewport breakpoints and raw `<div>` tiles** —
see §4 and §5.

### Top 5 anti-drift wins (by automation potential)

1. **`pnpm lint:components2-renderers`** — registry id ↔ renderer file parity (already shipped).
2. **`AFENDA_GOVERNED_RENDERER_CONTRACTS` + tree pre-flight** — rejects wrong `dataNature` before
   dispatch (shipped; depends on restored `component.schema.ts` for full envelope).
3. **`afenda/renderer-placement-contract` ESLint block** — flags viewport breakpoints in renderer
   `className` (shipped; **not yet applied** to stat-card/skeleton).
4. **`pnpm gen renderer` (proposed)** — one generator run scaffolds schema + renderer + registry +
   skeleton + lint row; eliminates hand-maintained quartet drift.
5. **`scripts/check-renderer-contracts.mjs` (proposed)** — asserts Zod `*DataNatureSchema` enums
   match `acceptedNatures` in registry, cursor rule table, and ADR-0025 §2.

### Top 3 anti-patterns to refuse

1. **Visual / low-code editor with stored app JSON** (Retool, Builder.io) — parallel authoring
   surface, unbounded customization.
2. **Tester-priority renderer registries** (JSON Forms) — multiple renderers compete per node;
   static 1:1 `governed:type` → `rendererId` stays analyzable.
3. **Free-form styling in metadata** (`className`, arbitrary Tailwind in schemas) — geometry
   belongs in renderers + design tokens, intent in `dataNature` / `density` / `tone`.

---

## 2. Where we sit vs the field

| Pattern | JSON Forms | Retool | react-admin / Refine | Plasmic | Afenda | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Data vs UI schema split | JSON Schema + UI schema | Component JSON + queries | Resource / field metadata | Visual props + code components | Zod config + `GovernedComponent` envelope | **have it** |
| Renderer dispatch | Tester returns priority; highest wins | Plugin type string | `<Resource>` + inferred fields | Registered code components | 1:1 registry map | **deliberately not adopting** tester model |
| Conditional UI | `rule.effect` SHOW/HIDE/ENABLE/DISABLE | Event handler "Only run when" | `useRecordContext` + custom | Variants / visibility | None at schema level | **gap** (future ADR) |
| Query / data layer | External to library | First-class Query object | dataProvider abstraction | Data bindings | Module `data/` + RSC builders | **deliberately not adopting** extra layer |
| Events / actions | Actions in UI schema | `events[]` on components | `<Button mutationOptions>` | Component actions API | `actionDescriptorSchema`, `FORM_EVENTS` | **have it** |
| Auth in metadata | None | `allowedGroupIds` on queries | `accessControl` | N/A | Guards in layout/actions, not in tree | **gap** (permission field on component) |
| Schema versioning | UI schema version in ecosystem | App export version | N/A | Project versioning | No `__schemaVersion` | **gap** |
| CRUD inferencer | Examples / tooling | Templates | Refine Inferencer, react-admin guessers | N/A | Manual builders only | **gap worth scoping later** |
| Visual editor | JSON Forms Editor (separate) | Core product | None | Core product | None; Figma Code Connect on disk only | **deliberately not adopting** |
| Design-system lock-in | Theme + renderers | Retool component library | MUI / custom | Design tokens in Plasmic | `#components2/ui/*` + ESLint allowlist | **have it** (enforcement incomplete) |

**Reading the table:** We are closest to **JSON Forms + react-admin** semantics with **server-first**
builders instead of a client interpreter. We are **not** building Retool or Plasmic; their strengths
(editor, inferencer, query graph) trade away the consistency and automation goals this audit
prioritizes.

---

## 3. Hand-maintained artifacts that should be generated

Each subsection: where strings live today · how drift manifests · automation recommendation.

### 3.1 Accepted `dataNature` values (four copies)

| Location | Example (`stat-card`) |
| --- | --- |
| Zod | `statCardDataNatureSchema` in `stat-card.schema.ts` |
| Registry | `AFENDA_GOVERNED_RENDERER_CONTRACTS["stat-card"].acceptedNatures` |
| Cursor rule | Table in `.cursor/rules/governed-renderer-contract.mdc` |
| ADR | ADR-0025 §2 table |

**Drift:** Add `"comparison"` to Zod only → tree accepts it, registry rejects it, or the inverse —
operator sees `GovernedEmpty` with no compile-time failure on the builder.

**Recommendation:** Single manifest (JSON or TS `as const`) consumed by a small codegen step or
`check-renderer-contracts.mjs` that regex-parses / imports all four. Long-term: export
`acceptedNatures` from the schema module and `satisfies` against `RendererContractEntry`.

**Effort:** M.

### 3.2 Skeleton switch vs registry

`GovernedComponentSkeleton` switches on all 13 `AfendaGovernedRendererId` values; registry maps
only 8 component types. Skeleton cases for `kanban-board`, `chart`, etc. exist before renderers ship.

**Drift:** New id in `AfendaGovernedRendererId` without skeleton `case` → `assertNever` at runtime;
new registry entry without skeleton → loading UI wrong shape.

**Recommendation:** Extend `check-components2-renderers.mjs` to require skeleton `case` string
match for every id in the union (grep `case "stat-card":`).

**Effort:** S.

### 3.3 Registry vs discriminated component types

`governedComponentDiscriminatedSchema` should list every `governed:*` type. With
`component.schema.ts` corrupted, the discriminant union is **not enforced**. Registry has 8 types;
schemas also exist for kanban, chart, multi-step-form, scorecard-form, approval-timeline without
registry entries.

**Drift:** Builder emits `governed:kanban-board` → tree: no renderer registered → muted empty state.

**Recommendation:** When `component.schema.ts` is restored, lint script: every key in
`governedComponentTypeSchema` either appears in `AFENDA_GOVERNED_COMPONENT_REGISTRY` or in an
`EXPLICITLY_UNREGISTERED` allowlist with comment.

**Effort:** S (after schema restore).

### 3.4 No `pnpm gen renderer`

`AGENTS.md` §3 lists generators for capability, action, adr, audit-contract, workflow-job, ask-doc —
not renderer.

**Drift:** Adding a renderer requires touching 6+ files manually; easy to skip contract map or ESLint.

**Recommendation:** `pnpm gen renderer --id foo` emits:

- `lib/features/governed-surface/schemas/foo.schema.ts` (with `dataNature`, stability constants)
- `components2/metadata/renderers/foo.renderer.tsx` (container + shadcn stub)
- Registry + contract entries
- Skeleton case
- Unit test stub under `tests/unit/components2/metadata/renderers/`

Run `lint:agent-contract` + `lint:components2-renderers` on exit.

**Effort:** L.

---

## 4. Open drift surfaces — lint and type rules still missing

| # | Drift mechanism | Enforcement target | Effort |
| --- | --- | --- | --- |
| 4.1 | `value` / `delta` accept ISO dates and raw decimals | `superRefine` or branded `DisplayString` via `#lib/erp/format-display.shared.ts` | M |
| 4.2 | Builders return `*Configuration` (output) vs `*ConfigurationInput` | ESLint on `**/*-surface-builders.server.ts`: return type must end with `ConfigurationInput` | S |
| 4.3 | Arbitrary Tailwind `text-[11px]`, `gap-[7px]` in renderers | Extend `afenda/renderer-placement-contract` to flag `className` with `/\[[^\]]+\]/` | S |
| 4.4 | Raw `<div>` / `<span>` leaf markup | Whitelist structural tags; require `#components2/ui/*` for tiles | M |
| 4.5 | ADR-0025 §1 not implemented in stat-card | `stat-card.renderer.tsx` still `sm:grid-cols-4`; skeleton same | S (implementation) |
| 4.6 | Fixture exports not parsed at CI | `scripts/check-renderer-fixture-parity.mjs` | M |
| 4.7 | `component.schema.ts` corrupted | Restore discriminated union; CI fails if file &lt; 100 bytes | **blocker** |

### 4.1 Display strings

`stat-card.schema.ts` documents that `value` and `delta` are display-ready; nothing rejects
`2026-03-01` or `5000.00`. The payslip bug class survives any new builder.

### 4.2 Builder return types

Six files were fixed in-session to use `StatCardConfigurationInput`. No ESLint rule prevents
regression to output type (which requires `dataNature` and `density` after parse defaults).

### 4.3–4.4 Renderer styling

`stat-card.renderer.tsx` uses raw `<div>` with `rounded-2xl border …` and `text-[11px]`.
ADR-0025 §4 and cursor rule §3 forbid this; ESLint only partially enforces (viewport breakpoints,
template literal classNames).

### 4.5 Governance ahead of code

ADR-0025 and `statCardDensitySchema` assume container queries in the renderer. Implementation
and skeleton still use viewport grids — **documentation and schema promise behavior the code
does not deliver**.

---

## 5. Verification gaps

| Gap | Why it matters | Recommendation | Effort |
| --- | --- | --- | --- |
| Visual regression matrix | CSS drift on dispatch boundary undetected | Playwright snapshots: each shipped renderer × `dataNature` × density × widths 280/480/960 px | M |
| Dispatch telemetry | Wrong pairings only visible to `operator` diagnostics | OTEL span in `governed-component-tree.tsx`: `rendererId`, `dataNature`, `surfaceKey` | S |
| Skeleton exhaustiveness | `assertNever` only at runtime | TypeScript test: `satisfies Record<AfendaGovernedRendererId, ReactNode>` for skeleton map | S |
| Kernel unit tests vs broken schema | `governed-surface-kernel-extensions-contract.test.ts` imports broken module | Fix schema first; add CI gate on schema file size / export count | S |

**Existing tests:** `tests/unit/components2/metadata/renderers/stat-card.test.tsx` and
`list-surface.test.tsx` — parser/edge cases, not layout or container width.

---

## 6. Authoring conventions not yet enforced

### 6.1 Surface builder location

Convention: `lib/features/<module>/.../data/*-surface-builders.server.ts`. Not in
`check-agent-contract.mjs`. Files could appear at module root without CI failure.

**Recommendation:** Agent-contract glob: any file exporting `build*Configuration` returning a
`#features/governed-surface` input type must match `**/data/*-surface-builders.server.ts`.

**Effort:** S.

### 6.2 Parse-before-return

Builders may return plain objects that would fail `parseStatCardConfiguration` at runtime.
Tree parses again in renderer — double validation, late failure.

**Recommendation:** Builder return type `StatCardConfigurationInput` plus dev-only
`parseStatCardConfiguration(build(...))` assert in preview routes only; or require builders to
call parse and return `.data` (stricter, fewer duplicates).

**Effort:** M.

---

## 7. External patterns we deliberately refuse

### 7.1 Retool-style visual editor + stored app JSON

**Why refuse:** Second source of truth for layout, queries, and events. Encourages per-app
customization and bypasses module boundaries (`lib/features/`, Server Actions, IAM).

**Instead:** Server-side builders + governed registry; mutations only via Server Actions.

### 7.2 JSON Forms tester-priority dispatch

**Why refuse:** Runtime resolution hides which renderer owns a node; harder to lint and codegen.

**Instead:** `AFENDA_GOVERNED_COMPONENT_REGISTRY` + static imports in `governed-renderer-dispatch.tsx`.

### 7.3 react-admin / Refine `dataProvider`

**Why refuse:** Extra indirection between ERP modules and UI; Afenda already colocates queries in
`data/` behind `#features/<module>`.

**Instead:** RSC pages call module queries; builders map to configuration.

### 7.4 Runtime JSON-to-JSX (`react-jsx-parser`)

**Why refuse:** Already banned in ADR-0011 and ESLint `afenda/components2-metadata-renderer-imports`.

**Instead:** Typed renderers only.

### 7.5 `className` or CSS in metadata records

**Why refuse:** Expands customization surface; breaks design-contract and placement rules.

**Instead:** `dataNature`, `density`, `tone`, `chrome` enums; renderers map to tokens.

### 7.6 Refine / Plasmic inferencer and visual CMS for ERP screens

**Why refuse:** High velocity for generic CRUD, low consistency for compliance-heavy HRM/ERP.

**Instead:** `pnpm gen capability` / future `pnpm gen renderer`; Drizzle inferencer only if scoped
to **draft** metadata with human review gate.

---

## 8. Decision log for future ADRs (no commitment)

| Topic | Rationale | Depends on |
| --- | --- | --- |
| Rules layer (`rule.condition` + `rule.effect`) | ERP forms need conditional fields without client `useEffect` | Restored component envelope |
| Schema versioning (`__schemaVersion` + migrations) | Safe cached metadata / future DB storage | Rules + versioning ADR order |
| Permission gates on `GovernedComponent` (`requiresPermission`) | Auth today only in layout/builders | ERP RBAC key registry |
| CRUD inferencer from Drizzle | Module velocity | Strong `dataNature` + display string contracts |
| Code Connect per renderer | Design/dev parity | Renderer geometry stable (ADR-0025 implemented) |
| Restore + harden `component.schema.ts` | **Blocker** for all envelope guarantees | Immediate |

---

## Appendix A — Automation inventory (current)

| Gate | Command / location | What it enforces |
| --- | --- | --- |
| Renderer file parity | `pnpm lint:components2-renderers` | Registry ids ↔ `*.renderer.tsx` |
| Renderer imports | ESLint `afenda/components2-metadata-renderer-imports` | No shell, no `#components/ui`, no jsx-parser |
| Placement (partial) | ESLint `afenda/renderer-placement-contract` | Viewport breakpoints, template classNames |
| Schema handbook | `docs/governance/governed-surface-zod-schema-contract.md` rows 11–13 | dataNature, container queries, no raw div |
| Design contract | `pnpm lint:design-contract` | Tokens in `globals.css` / Tailwind theme |
| Agent contract | `pnpm lint:agent-contract` | Module shape, no cross-module deep imports |

**Not automated:** contract map ↔ Zod enum parity, fixture parse parity, builder path convention,
display string shape, visual regression, dispatch telemetry.

---

## Appendix B — Shipped vs declared renderers

| `AfendaGovernedRendererId` | In `AFENDA_GOVERNED_COMPONENT_REGISTRY` | `GOVERNED_RENDERERS` dispatch | `*.renderer.tsx` |
| --- | --- | --- | --- |
| stat-card | yes | yes | yes |
| list-surface | yes | yes | yes |
| section | yes | yes | yes |
| stack | yes | yes | yes |
| empty | yes | yes | yes |
| action-bar | yes | yes | yes |
| audit-panel | yes | yes | yes |
| detail-tabs | yes | yes | yes |
| kanban-board | no | no | no |
| multi-step-form | no | no | no |
| scorecard-form | no | no | no |
| approval-timeline | no | no | no |
| chart | no | no | no |

Schemas for the bottom four exist at `experimental`/`beta` stability; contracts pre-registered in
`AFENDA_GOVERNED_RENDERER_CONTRACTS` per ADR-0025.

---

## Appendix C — References

- [ADR-0011](../decisions/0011-governed-surface-metadata-kernel.md) — kernel boundaries, ten schema principles
- [ADR-0021](../decisions/0021-components2-metadata-renderer-registry.md) — renderer registry, import allowlist
- [ADR-0025](../decisions/0025-governed-renderer-placement-contract.md) — placement, dataNature, primitives
- [Governed surface Zod handbook](../governance/governed-surface-zod-schema-contract.md)
- JSON Forms: custom renderers, tester priority — https://jsonforms.io/docs/tutorial/custom-renderers
- Retool: components, queries, event handlers — https://docs.retool.com/apps/concepts/components/
- JSON Forms rules: SHOW/HIDE/ENABLE/DISABLE — https://jsonforms.io/docs/uischema/rules/

---

*End of audit. Next engineering step (out of scope here): restore `component.schema.ts`, then
implement ADR-0025 in `stat-card.renderer.tsx` and skeleton so schema, ADR, and runtime align.*
