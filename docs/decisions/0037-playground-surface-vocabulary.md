# ADR-0037: Playground surface vocabulary

**Status:** Accepted  
**Date:** 2026-05-19  
**Related:** [ADR-0035](0035-three-layer-surface-ide-anti-drift.md) · [ADR-0026](0026-metadata-driven-ui-architecture.md)

## Context

Internal metadata and shell galleries lived under `/dev/*` with product name `dev`, colliding with:

- `NODE_ENV === "development"`
- `pnpm dev`
- `components2/dev/` overlays used across the whole app

## Decision

Rename the **routed gallery product** to **`playground`**:

| Layer | Path |
| --- | --- |
| 1 | `app/(main)/[locale]/playground/` |
| 2 | `lib/features/playground/` |
| 3 | `components2/playground/` |

URLs: `/playground/shell-preview`, `/playground/metadata-renderer-gallery`, `/playground/pattern-c-section-gallery`.

Keep **`components2/dev/`** for cross-app development overlays only (`RouteErrorDebugPanel`, `DevSignInPanel`, `LocaleRouteDevGate`).

No `/dev` → `/playground` compatibility redirects (local bookmarks may break).

## Future direction

`playground` is the extension point for a Retool-inspired **no-code / low-code builder** (fixture editor today; persisted documents deferred per ADR-0026). New builder UI must stay inside the three-layer `playground` product — do not introduce a parallel `studio` module.

## Consequences

- Import doors: `#features/playground`, `#features/playground/server`, `#features/playground/client`, `#components2/playground/*`
- Rule: `.cursor/rules/playground-directory.mdc`
- Contract test: `tests/unit/playground-surface-contract.test.ts`
