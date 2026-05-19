# SEAL — Layer 3 · `components2/playground/`

**Authority:** client islands for routed playground galleries. Gallery truth and fixtures live in `#features/playground`.

## Route-adjacent paint (galleries)

| Area | Role |
| --- | --- |
| `metadata-renderer-gallery/*.client.tsx` | Preview frames, kanban bridges, fixture editor |
| `pattern-c-section-gallery/gallery-pattern-c-trailing-cell.client.tsx` | Pattern C trailing cell |
| `app-shell-preview/*.client.tsx` | Shell preview utility bar / command / scope mocks |

## Import rules

- Fixtures + playground paths: `#features/playground/client` only
- Never `#features/playground/server` from `"use client"` files

## Forbidden

- Page orchestrators, production redirect gate, gallery scenario registry — Layer 2 only
- NODE_ENV-only overlays — use `components2/dev/` instead
