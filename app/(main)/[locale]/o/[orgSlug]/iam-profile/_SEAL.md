# SEAL — Layer 1 · `app/.../o/[orgSlug]/iam-profile/`

**Authority:** org-scoped personal IAM routes only. Canonical decision: [ADR-0034](../../../docs/decisions/0034-neon-auth-iam-profile-surface.md).

## Routes (fixed segments — no catch-alls)

| Segment | File | Role |
| --- | --- | --- |
| `/iam-profile` | `page.tsx` | Overview — server summary + client next/membership/danger sections |
| `/iam-profile/identity` | `identity/page.tsx` | Identity surface wiring |
| `/iam-profile/security` | `security/page.tsx` | Security surface wiring |
| `layout.tsx` | Tier A org session + deferred `OrgIamProfileDeferredShell` |
| `error.tsx` | Uncaught failures — `IamProfileSurface.errors` |
| `not-found.tsx` | Invalid segment — `IamProfileSurface.notFound` |

## Forbidden in this tree

- `[[...path]]` catch-alls · legacy `/account` routes · redirects to deleted paths
- Domain queries, Server Action bodies, Zod schemas
- Passkey / 2FA / `changeEmail` UI (not in Neon Auth contract)

## Import doors

- Server data/actions: `#features/iam-profile/server`
- Client islands: `#components2/iam-profile/*` + `#features/iam-profile/client` for actions invoked from client

## Path builders

- `organizationIamProfilePath(orgSlug, segment?)` from `#lib/org-apps-module-paths`
- Revalidate: `toLocaleOrgIamProfileRevalidatePattern` (actions only)
