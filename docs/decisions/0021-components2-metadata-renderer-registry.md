# ADR-0021: components2 metadata renderer registry

> **Canonical architecture:** [ADR-0026](./0026-metadata-driven-ui-architecture.md). This ADR records the original renderer-registry decision.

**Status:** Accepted  
**Date:** 2026-05-16  
**Supersedes:** Renderer-kernel section of ADR-0012-phase10 (draft) for display dispatch only.

## Context

Afenda's governed UI kernel (ADR-0011) separates **schema** (`lib/features/governed-surface/`) from **presentation**. We need a typed, id-based renderer registry similar to:

- **JSON Forms** — data schema / UI schema / renderer registry split; dispatch by tester + renderer (we use Zod + string ids instead).
- **react-admin** — declarative `entity → renderer` map at the application boundary.
- **shadcn registry** — namespaced distributable UI payloads (`@afenda/*`).

## Decision

1. **Schema kernel** stays in `lib/features/governed-surface/` (`governedComponentSchema`, `governedComponentRegistrySchema`, configuration schemas such as `stat-card` and `list-surface-renderer`).
2. **Renderer kernel** lives in `components2/metadata/`:
   - `render-governed-component.tsx` — `GovernedComponentRenderer` dispatcher.
   - `detail-section.adapter.tsx` — `resolveGovernedDetailSectionContent` for detail tabs.
   - `registry.ts` — `AFENDA_GOVERNED_COMPONENT_REGISTRY` (`as const satisfies GovernedComponentRegistry`).
   - `renderers/*.renderer.tsx` — one typed React component per id.
3. **Renderer import allowlist** (ESLint `afenda/components2-metadata-renderer-imports` on `metadata/renderers/**`):
   - `#components2/ui` — shadcn primitives.
   - `#features/governed-surface` — governed chrome composers (`GovernedListSurface`, parsers).
   - `#i18n/navigation` — locale-aware links in table cells.
   - `#lib/utils` — `cn` and other class-name helpers.
   - `react`, `lucide-react`.
4. **Public doors:**
   - `#components2` — narrow barrel (dispatcher + registry only).
   - `#components2/metadata` — metadata module door (includes detail-section adapter).
   - `#components2/ui` — shadcn shelf (named imports).
5. **Forbidden:** `react-jsx-parser` and any runtime JSON-to-JSX parsing in the renderer kernel.
6. **Parity gate:** `scripts/check-components2-renderers.mjs` (`pnpm lint:components2-renderers`) enforces registry ids ↔ renderer files.
7. **Dev preview:** `components2/dev/app-shell-preview/` owns `/dev/shell-preview` composition; route is a thin wrapper.

## Promotion gate (`experimental` → `beta`)

Promoted **2026-05-16** with evidence:

| Criterion | Evidence |
| --- | --- |
| List or form renderer on execution path | `governed:list-surface` renderer; HRM `WorkforcePage` (`lib/features/hrm/components/workforce-page.tsx`) dispatches via `GovernedComponentRenderer`. |
| Registry ↔ renderer parity | `pnpm lint:components2-renderers` — 8 shipped renderers (`stat-card` … `detail-tabs`). |
| Schema stability | `governedComponentSchema`, `governedComponentRegistrySchema`, `stat-card`, `list-surface-renderer` at **`beta`**. |

Second consecutive minor release with green parity lint is tracked at release time (first promotion landing).

## Consequences

- Proof renderers: `governed:stat-card` (shell preview KPI grid), `governed:list-surface` (shell preview + HRM workforce directory).
- Configuration schemas live under `lib/features/governed-surface/schemas/`; renderers stay in `components2/metadata/renderers/`.
- Governed-surface UI repoint to `#components2/ui` is limited to three renderer-path files (codemod allowlist).
- Shell chrome (`components2/app-shell/`) remains frozen except additive exports documented in shell-directory rule.
