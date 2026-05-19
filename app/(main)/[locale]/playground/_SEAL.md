# SEAL — Layer 1 · `app/(main)/[locale]/playground/`

**Authority:** gated local developer galleries only (`NODE_ENV === "development"`). [ADR-0035](../../../docs/decisions/0035-three-layer-surface-ide-anti-drift.md).

**Product name is always `playground`.** URL segment `/playground/*` — local galleries and future no-code experiments, not production surfaces.

## Three layers

| Layer | Path | Door |
| --- | --- | --- |
| 1 | `app/.../playground/` | Thin re-exports from `#features/playground/server` |
| 2 | `lib/features/playground/` | `#features/playground` · `#features/playground/server` · `#features/playground/client` |
| 3 | `components2/playground/` | `#components2/playground/*` |

**No `_SEAL.md` at `lib/features/playground/` root** — agent-contract rejects it.

**NODE_ENV overlays** (sign-in panel, route-error debug) live in `components2/dev/` — not this product.

## Routes

| Segment | File | Role |
| --- | --- | --- |
| `/playground/shell-preview` | `shell-preview/page.tsx` | Re-exports `PlaygroundShellPreviewPage` |
| `/playground/metadata-renderer-gallery` | `metadata-renderer-gallery/page.tsx` | Re-exports renderer gallery |
| `/playground/pattern-c-section-gallery` | `pattern-c-section-gallery/page.tsx` | Re-exports Pattern C gallery |
| `metadata-renderer-gallery/loading.tsx` | Re-exports metadata loading skeleton |

## Layer 2 — `lib/features/playground/`

- `data/playground-route-gate.server.ts` — production redirect guard
- `data/gallery-*` — validated renderer + Pattern C fixtures
- `schemas/playground-paths.shared.ts` — locale-internal playground href constants
- `components/playground-*-page.server.tsx` — page orchestrators

## Forbidden in this tree

- Gallery fixture graphs, shell preview wiring, or playground gate logic in `app/` pages
- `#components2/playground` imports in route files (Layer 3 via Layer 2 only)

## Verification

```bash
pnpm lint:path -- lib/features/playground components2/playground
pnpm test:fast -- tests/unit/playground-surface-contract.test.ts tests/unit/components2/metadata/gallery-scenarios.test.ts
pnpm typecheck
```
