# SEAL — Layer 1 · `app/(main)/[locale]/console/`

**Authority:** post-login no-org loading bay only. Canonical decision: [ADR-0003](../../../docs/decisions/0003-post-login-loading-bay-nexus.md) · [ADR-0035](../../../docs/decisions/0035-three-layer-surface-ide-anti-drift.md).

**Product name is always `console`.** URL segment `/console` — not `/onboarding` (308 redirect only).

## Three layers

| Layer | Path | Door |
| --- | --- | --- |
| 1 | `app/.../console/` | Thin re-exports from `#features/console/server` |
| 2 | `lib/features/console/` | `#features/console` · `#features/console/server` |
| 3 | `components2/console/` | `#components2/console/*` |

**No `_SEAL.md` at `lib/features/console/` root** — agent-contract rejects it.

## Routes

| File | Role |
| --- | --- |
| `page.tsx` | Re-exports `ConsoleOrgListPage` |
| `layout.tsx` | Tier A session + `ConsoleDeferredShell` |
| `loading.tsx` | Re-exports `#components2/console/console-loading` |
| `error.tsx` | Uncaught failures — `useRouteEnvelope` |
| `not-found.tsx` | Invalid segment — console recovery links |

## Layer 2 — `lib/features/console/`

### Public doors

| Door | Consumers |
| --- | --- |
| `index.ts` | Cross-module server imports |
| `server.ts` | Page bodies, metadata, deferred shell |

### Data (`data/`)

- `console-org-context.server.ts` — org list, active org redirect, no-org / multi-org states
- `console-pending-invites.server.ts` — pending invitation query
- `console-metadata.server.ts` — layout metadata

### Page orchestrators (`components/`)

- `console-org-list-page.server.tsx` — org picker + bootstrap bay
- `console-pending-invites-section.server.tsx` — invitation list section
- `console-deferred-shell.tsx` — `AppShell` + console utility bar

## Forbidden in this tree

- Domain queries, DB access, redirect logic in `app/` pages
- `#components2/console` imports in route files (Layer 3 via Layer 2 only)
- Mounting full org `WorkbenchShell` on `/console` (ADR-0003)

## Verification

```bash
pnpm lint:path -- lib/features/console components2/console app/(main)/[locale]/console
pnpm test:fast -- tests/unit/console-surface-contract.test.ts
pnpm typecheck
```
