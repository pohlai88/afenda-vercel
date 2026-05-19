# SEAL — Layer 3 · `components2/dev/`

**Authority:** client islands + dev-only overlays. Gallery truth and fixtures live in `#features/dev`.

## Route-adjacent paint (galleries)

| Area | Role |
| --- | --- |
| `metadata-renderer-gallery/*.client.tsx` | Preview frames, kanban bridges, fixture editor |
| `pattern-c-section-gallery/gallery-pattern-c-trailing-cell.client.tsx` | Pattern C trailing cell |
| `app-shell-preview/*.client.tsx` | Shell preview utility bar / command / scope mocks |

## Global dev overlays (not `/dev` routes)

| Component | Role |
| --- | --- |
| `dev-signin-panel*.tsx` | Local sign-in shortcuts |
| `locale-route-dev-gate.client.tsx` | Mounts sign-in panel outside portal |
| `route-error-debug-panel.tsx` | Error boundary debug panel |

## Import rules

- Fixtures + dev paths: `#features/dev/client` only
- Never `#features/dev/server` from `"use client"` files

## Forbidden

- Page orchestrators, production redirect gate, gallery scenario registry — Layer 2 only
