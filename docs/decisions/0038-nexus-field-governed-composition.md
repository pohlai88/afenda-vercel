# ADR-0038: Nexus Field governed composition

**Status:** Accepted  
**Date:** 2026-05-19  
**Related:** [ADR-0026](0026-metadata-driven-ui-architecture.md) · [ADR-0035](0035-three-layer-surface-ide-anti-drift.md)

## Context

The Nexus Field at `/{locale}/o/{orgSlug}/nexus` is the org operational origin. Sections B, D, and E are list-shaped; sections A and C are bespoke IA (orientation + truth map).

## Decision

### Three layers (product name: `nexus`)

| Layer | Path | Owns |
| --- | --- | --- |
| 1 | `app/.../o/[orgSlug]/nexus/` | Thin re-exports from `#features/nexus/server` |
| 2 | `lib/features/nexus/` | `getNexusSnapshot`, list-surface builders, `nexus-field-page.server.tsx` |
| 3 | `components2/nexus/` | `NexusFieldView`, orientation band, truth map, Lynx summon |

### Single snapshot rule

`getNexusSnapshot` remains **one server-built graph per request**. List-surface builders are **pure functions** over snapshot slices — no extra fetches in builders or Layer 3.

### Section mapping

| Section | Rendering |
| --- | --- |
| A — Orientation | Handcrafted `NexusOrientationBand` |
| B — Operational pressure | `governed:list-surface` (`nexus:pressure`) |
| C — Truth map | Handcrafted `NexusTruthMap` + surface cards |
| D — Priority lanes | `governed:list-surface` (`nexus:priority-lanes`) |
| E — Recent resolutions | `governed:list-surface` (`nexus:resolutions`) |

### Surface keys

- `nexus:pressure`
- `nexus:priority-lanes`
- `nexus:resolutions`

Playground validation: `/{locale}/playground/metadata-renderer-gallery`.

## Consequences

- Import doors: `#features/nexus`, `#features/nexus/server`, `#components2/nexus/*`
- Rule: `.cursor/rules/nexus-directory.mdc`
- Contract: `tests/unit/nexus-surface-contract.test.ts`
