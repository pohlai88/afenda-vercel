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

**Handcrafted exclusions (permanent):** Nexus, Orbit, Lynx, specialized timelines.

---

## Schema kernel (`lib/features/governed-surface/`)

**Public doors:** `#features/governed-surface` · `#features/governed-surface/client` (data table only)

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

| Pattern | When | Mechanism |
| --- | --- | --- |
| **A — Chrome only** | Bespoke forms, settings | `GovernedSurface` + `GovernedSection` |
| **B — Full tree** | KPI grids, directories, audit | `GovernedComponentRenderer` + builders |
| **C — Trailing column** | List metadata + non-serializable actions (forms) | `GovernedListSurfaceWithTrailingColumn` from `#components2/metadata` only |

Pattern C is the **only** approved bypass of `GovernedComponentRenderer` for list tables. Do not import `list-surface-table` from feature modules.

---

## Design-reserve renderers

Types in `governedComponentTypeSchema` without a registry entry (`chart`, `kanban-board`, `multi-step-form`, `scorecard-form`, `approval-timeline`) are **design-reserve**. Builders must not emit them until a renderer ships (`pnpm lint:renderer-contracts` enforces registry ↔ type parity).

---

## Low-code and playground (deferred)

**Production ERP:** no stored app JSON, visual canvas, or runtime layout editor.

**Governed Playground (dev only):** extends `/[locale]/dev/metadata-renderer-gallery` — fixtures, width presets, `diagnostics: "operator"`. Same kernels; no persistence. Optional Zod 4 `z.toJSONSchema()` export for docs tooling only.

---

## Generator

`pnpm gen governed-renderer` scaffolds schema + renderer + test. Run `pnpm exec node scripts/wire-governed-renderer.mjs --id <kebab>` to patch registry, dispatch, skeleton, and contract files, then `pnpm lint:renderer-*`.

---

## P2 backlog (not blocking Pattern B rollout)

- Rules layer on form configs (`rule.effect` — JSON Forms–style, server-evaluated)
- `__schemaVersion` on envelopes
- `requiresErpPermission` aligned with `#features/erp-rbac/server`
- Draft inferencer → server builders (not Refine client inferencer)
- Figma Code Connect per renderer

---

## Maturity score

Post-P0+P1 re-score: [`docs/architecture/metadata-maturity-score.md`](../architecture/metadata-maturity-score.md) (74/100 — bounded production-ready).

## References

- Handbook: `docs/governance/governed-surface-zod-schema-contract.md`
- Cursor: `.cursor/rules/governed-surface-schema-contract.mdc`, `.cursor/rules/governed-renderer-contract.mdc`
- Maturity plan: `.cursor/plans/metadata_ui_maturity_audit_d18acb49.plan.md`
