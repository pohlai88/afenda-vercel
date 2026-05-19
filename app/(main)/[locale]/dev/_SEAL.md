# SEAL — Layer 1 · `app/(main)/[locale]/dev/`

**Authority:** gated local developer galleries only (`NODE_ENV === "development"`). [ADR-0035](../../../docs/decisions/0035-three-layer-surface-ide-anti-drift.md).

**Product name is always `dev`.** URL segment `/dev/*` — local galleries, not production surfaces.

## Three layers

| Layer | Path | Door |
| --- | --- | --- |
| 1 | `app/.../dev/` | Thin re-exports from `#features/dev/server` |
| 2 | `lib/features/dev/` | `#features/dev` · `#features/dev/server` · `#features/dev/client` |
| 3 | `components2/dev/` | `#components2/dev/*` |

**No `_SEAL.md` at `lib/features/dev/` root** — agent-contract rejects it.

## Routes

| Segment | File | Role |
| --- | --- | --- |
| `/dev/shell-preview` | `shell-preview/page.tsx` | Re-exports `DevShellPreviewPage` |
| `/dev/metadata-renderer-gallery` | `metadata-renderer-gallery/page.tsx` | Re-exports renderer gallery |
| `/dev/pattern-c-section-gallery` | `pattern-c-section-gallery/page.tsx` | Re-exports Pattern C gallery |
| `metadata-renderer-gallery/loading.tsx` | Re-exports metadata loading skeleton |

## Layer 2 — `lib/features/dev/`

- `data/dev-route-gate.server.ts` — production redirect guard
- `data/gallery-*` — validated renderer + Pattern C fixtures
- `schemas/dev-paths.shared.ts` — locale-internal dev href constants
- `components/dev-*-page.server.tsx` — page orchestrators

## Forbidden in this tree

- Gallery fixture graphs, shell preview wiring, or dev gate logic in `app/` pages
- `#components2/dev` imports in route files (Layer 3 via Layer 2 only)

## Verification

```bash
pnpm lint:path -- lib/features/dev components2/dev
pnpm test:fast -- tests/unit/dev-surface-contract.test.ts tests/unit/components2/metadata/gallery-scenarios.test.ts
pnpm typecheck
```
