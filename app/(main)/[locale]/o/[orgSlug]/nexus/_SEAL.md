# SEAL — Layer 1 · `app/(main)/[locale]/o/[orgSlug]/nexus/`

**Authority:** org operational origin (Nexus Field). [ADR-0035](../../../docs/decisions/0035-three-layer-surface-ide-anti-drift.md) · [ADR-0038](../../../docs/decisions/0038-nexus-field-governed-composition.md).

**Product name is always `nexus`.** URL segment `/o/{orgSlug}/nexus` — org root redirects here.

## Three layers

| Layer | Path | Door |
| --- | --- | --- |
| 1 | `app/.../nexus/` | Thin re-exports from `#features/nexus/server` |
| 2 | `lib/features/nexus/` | `#features/nexus` · `#features/nexus/server` |
| 3 | `components2/nexus/` | `#components2/nexus/*` |

**No `_SEAL.md` at `lib/features/nexus/` root** — agent-contract rejects it.

## Routes

| Segment | File | Role |
| --- | --- | --- |
| `/o/{orgSlug}/nexus` | `page.tsx` | Re-exports `NexusFieldPage` |
| `loading.tsx` | Streaming skeleton for field data |

## Forbidden in this tree

- `getNexusSnapshot`, list-surface builders, or `#components2/nexus` in route files
- Business logic or snapshot assembly in `app/`

## Verification

```bash
pnpm lint:path -- lib/features/nexus components2/nexus
pnpm test:fast -- tests/unit/nexus-surface-contract.test.ts tests/unit/nexus-pressure-list-surface.test.ts
pnpm typecheck
```
