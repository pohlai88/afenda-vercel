# Wave A design review (frontend-design-review Mode 1)

**Date:** 2026-05-18 · **Skills:** shadcn-metadata, frontend-skill (Apps), tailwind-v4-shadcn, metadata-eui-polish

## Summary

Wave A closes the governed list path for contacts, performance, claims recent, and skills catalog. Hierarchy, density, empty/forbidden states, and loading skeletons align with ADR-0026 Pattern B/C. Remaining VQ gap is mass migration of Tier 1 hand-rolled tables (Wave B).

## Blocking

_None after Wave A closure._

## Major (addressed in Wave A)

| Route | Issue | Fix |
|-------|-------|-----|
| Contacts | Double list chrome + `<p>` forbidden | `presentation.table-only`, `GovernedEmpty`, i18n |
| Performance | Raw `<select>`, English forbidden copy | `NativeSelect`, `Label`, i18n keys |
| Claims recent | Empty `<p>` bypass | Renderer empty state |
| Skills | Hand-rolled `Table` | Pattern C + builder |

## Minor (Wave C / optional)

| Item | Note |
|------|------|
| Performance create form | Could extract client `FieldGroup` island |
| Workforce | Still `variant=full` on list (no outer Card) — acceptable |
| List toolbar | Phase 2 metadata |

## Strengths

- `af-material-opaque` + `density=compact` on all metadata list tables
- `useLocale()` in list cells for date/currency
- `GovernedMetadataLoading` on contacts + performance segment loading
- M3 typescale on stat-card and `ModulePageHeader`

## Skill checklist (quick)

| Pillar | Pass |
|--------|------|
| Frictionless action | Contacts Add in CardAction; performance row actions in trailing column |
| Craft | Semantic tokens; shadcn shelf; no raw hex on touched paths |
| Trust | GovernedEmpty forbidden/error/muted; shape-matched loading |

## Next.js MCP

- Dev server port 3000 — MCP connected
- Routes: `dashboard/contacts`, `dashboard/hrm/performance`
- No compile errors on touched modules (typecheck gate)
