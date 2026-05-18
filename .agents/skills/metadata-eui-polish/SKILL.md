---
name: metadata-eui-polish
description: >
  Afenda metadata-driven EUI polish workflow. Use automatically when implementing,
  reviewing, or refining governed renderers (components2/metadata/renderers),
  surface builders (*-surface-builders.server.ts), Pattern A/B/C ERP pages, or
  the dev metadata-renderer-gallery. Composes shadcn-metadata, governed-renderer
  contracts, and Vercel web-design/composition skills. Do not invoke sibling
  skills separately for the same task.
allowed-tools: Read Write Edit Glob Grep Bash
---

# Metadata EUI polish — governed renderer workflow

**Target:** production-grade Pattern B/C surfaces that pass renderer lint gates and match ADR-0026 maturity (≥90).

**Announce at start:** "Applying metadata EUI polish to [path or renderer id]."

This skill applies when editing:

- `components2/metadata/renderers/**`
- `lib/features/governed-surface/**` (`GovernedSurfaceSectionCard`, `GovernedPatternCListSection`)
- `lib/features/*/data/*-surface-builders.server.ts`
- ERP pages using `GovernedComponentRenderer`, `GovernedPatternCListSection`, or the portal `EmployeePortalGovernedTable` embedded helper
- `app/[locale]/dev/metadata-renderer-gallery/**`
- `app/[locale]/dev/pattern-c-section-gallery/**`

## Embedded skills (load in this order)

| Skill | Location | Role |
| --- | --- | --- |
| **shadcn-metadata** | `.agents/skills/shadcn-metadata/SKILL.md` | Shelf primitives, composition, semantic tokens, forms — **never raw tile `<div>`s** |
| **web-design-guidelines** | global — `vercel-labs/agent-skills@web-design-guidelines` | Hierarchy, spacing rhythm, interaction states, loading/empty/error polish |
| **vercel-composition-patterns** | global — `vercel-labs/agent-skills@vercel-composition-patterns` | Compound components; avoid boolean prop bags on renderers |

Optional review pass (attach manually): **frontend-design-review**, **wcag-accessibility-audit** for table keyboard/focus audits.

## Cursor rules (non-negotiable)

| Rule | Path |
| --- | --- |
| Renderer placement | `.cursor/rules/governed-renderer-contract.mdc` |
| Schema kernel | `.cursor/rules/governed-surface-schema-contract.mdc` |
| Design tokens | `.cursor/rules/design-system.mdc` |
| Layout geometry | `.cursor/rules/frontend-quality-contract.mdc` (§11) |
| Shelf imports | `#components2/ui/*` only — **never** recreate repo-root `components/` |

**Canonical ADRs:** ADR-0026 (architecture), ADR-0025 (renderer placement). **Platform** maturity: `docs/architecture/metadata-maturity-score.md`. **Section composition:** `docs/architecture/governed-section-composition-score.md`.

## Pattern map

| Pattern | When | Import door |
| --- | --- | --- |
| **A** | Page chrome + bespoke forms | `GovernedSurface`, `ModulePageHeader`, `GovernedSection` from `#features/governed-surface` |
| **B** | Tables, KPI grids, audit lists (no trailing row forms) | `GovernedComponentRenderer` from `#components2/metadata` + manual `Card` section |
| **C** | List metadata + trailing forms/actions | `GovernedPatternCListSection` from `#features/governed-surface`; `GovernedTrailingActionSlot` from `#features/governed-surface/client` |

**Builder recipe:** `lib/features/<module>/data/*-surface-builders.server.ts` returns `ListSurfaceRendererConfigurationInput`. Pattern C sections pass the builder output to `GovernedPatternCListSection` — do not re-parse in the feature module.

**Pattern C polish:** `surfaceKey`, `requiresErpPermission`, row `trailingAction` + `disabledReason`, `data-trailing-action-state` on trailing cells, `data-testid="governed-list-section:{surfaceKey}"`. Validate states at `/[locale]/dev/pattern-c-section-gallery`.

## Polish checklist (every renderer / surface PR)

### 1. Placement & layout

- [ ] Outermost element: `@container`; inner grids use `@sm:` / `@md:` — **no viewport `sm:`/`md:`/`lg:` inside renderers**
- [ ] Variant maps typed as `Record<SchemaEnum, string>` — no inline ternaries for density/size
- [ ] Skeleton case exists in `GovernedComponentSkeleton` for the renderer id
- [ ] Gallery visual matrix updated if geometry changed (`tests/` or gallery fixtures)

### 2. Primitives & tokens

- [ ] Leaf tiles/rows/chips use `#components2/ui/*` (`Card`, `Badge`, `Table`, `Empty`, `Skeleton`, `Alert`)
- [ ] Semantic colors only (`text-muted-foreground`, `bg-card`) — no hardcoded hex or `dark:` one-offs
- [ ] `flex` + `gap-*` for stacks — no `space-y-*` / `space-x-*`
- [ ] Loading: `Skeleton` shape matches real content density

### 3. Data nature & schema

- [ ] Configuration schema exports `dataNatureSchema` + required `dataNature` field
- [ ] Nature registered in `AFENDA_GOVERNED_RENDERER_CONTRACTS` (`components2/metadata/registry.ts`)
- [ ] KPI vs snapshot-summary stat cards use correct `dataNature` (no ISO dates as KPI deltas)

### 4. ERP states (every surface)

- [ ] Loading skeleton · empty with action · error with recovery · permission denied (honest, non-leaking)
- [ ] Table rows: stable entity IDs as keys — never `key={index}`
- [ ] `requiresErpPermission` on config when module gates apply
- [ ] Pattern C: single section path via `GovernedPatternCListSection` (no duplicate empty `Card`, no `GovernedComponentRenderer` empty fork)
- [ ] Trailing: `GovernedTrailingActionSlot` + `data-trailing-action-state`; invalid config uses `invalidConfig*` copy, not empty titles

### 5. Verification gates

```bash
# After every change
pnpm exec eslint --max-warnings=0 components2/metadata/renderers/ lib/features/governed-surface/
pnpm typecheck

# Renderer-specific (when touching registry / skeleton / fixtures)
pnpm lint:components2-renderers
pnpm lint:renderer-contracts
pnpm lint:renderer-container-queries
pnpm lint:renderer-skeleton-parity
pnpm lint:renderer-fixtures
```

Pre-push: `pnpm verify:parallel`.

## New renderer scaffold

```bash
node scripts/wire-governed-renderer.mjs <slug>
```

Then apply this skill's checklist before wiring the first module builder.

## Dev gallery

Validate width presets and fixture JSON at `/{locale}/dev/metadata-renderer-gallery` (development only). Compare 280 / 480 / 720 container widths after layout changes.

## Anti-patterns (block merge)

```txt
Viewport breakpoints inside renderers
Raw <div> tile geometry instead of Card/Badge/Table primitives
Bespoke empty/loading markup instead of Empty/Skeleton
Deep import of list-surface-table from feature modules (use GovernedPatternCListSection)
GovernedComponentRenderer empty fork inside Pattern C list sections
Copying server list data into client state for initial ERP reads
Decorative motion that does not clarify state
```

## Gold references

- Pattern B ceiling: `lib/features/contacts/components/contacts-page.tsx`
- Pattern C ceiling: `lib/features/hrm/employee-management/employee-lifecycle-management/components/hrm-onboarding-section.tsx`
- Registry: `components2/metadata/registry.ts`
- Maturity audit: `.cursor/plans/metadata_ui_maturity_audit_d18acb49.plan.md`
