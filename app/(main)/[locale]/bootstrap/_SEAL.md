# SEAL — Layer 1 · `app/(main)/[locale]/bootstrap/`

**Authority:** first-run setup (0 org memberships). ADR-0003 · ADR-0035.

**Product name:** `bootstrap`. URL `/bootstrap` — not `/console` (retired).

## Three layers

| Layer | Path | Door |
| --- | --- | --- |
| 1 | `app/.../bootstrap/` | `#features/bootstrap/server` |
| 2 | `lib/features/bootstrap/` | `#features/bootstrap` |
| 3 | `components2/bootstrap/` | `#components2/bootstrap/*` |

## Routes

| File | Role |
| --- | --- |
| `page.tsx` | `BootstrapSetupPage` |
| `layout.tsx` | `BootstrapDeferredShell` |
| `loading.tsx` | `#components2/bootstrap/bootstrap-loading` |

Workspace resolution (multi-org picker) lives on `app/.../o/page.tsx` — not here.

## Verification

```bash
pnpm lint:path -- lib/features/bootstrap components2/bootstrap app/(main)/[locale]/bootstrap
pnpm test:fast -- tests/unit/bootstrap-surface-contract.test.ts
```
