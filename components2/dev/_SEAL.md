# SEAL — Layer 3 · `components2/dev/` (NODE_ENV overlays only)

**Authority:** cross-app development overlays gated by `NODE_ENV === "development"`. **Not** the routed `playground` product ([`components2/playground/_SEAL.md`](../playground/_SEAL.md)).

| Component | Role |
| --- | --- |
| `dev-signin-panel*.tsx` | Local sign-in shortcuts |
| `locale-route-dev-gate.client.tsx` | Mounts sign-in panel outside portal |
| `route-error-debug-panel.tsx` | Error boundary debug panel |

## Import rules

- May import `#components2/ui/*`, `#app-shell/client`, client-safe auth helpers
- Do not import `#features/playground/server` or gallery fixture registries
