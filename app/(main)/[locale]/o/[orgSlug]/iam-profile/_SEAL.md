# SEAL — Layer 1 · `app/.../o/[orgSlug]/iam-profile/`

**Authority:** org-scoped personal IAM routes only. Canonical decisions: [ADR-0034](../../../docs/decisions/0034-neon-auth-iam-profile-surface.md) · [ADR-0035](../../../docs/decisions/0035-three-layer-surface-ide-anti-drift.md).

**Product name is always `iam-profile`.** URL segment `/o/{slug}/iam-profile/*` — not `/profile/`.

## Three layers

| Layer | Path | Door |
| --- | --- | --- |
| 1 | `app/.../iam-profile/` | Thin re-exports from `#features/iam-profile/server` |
| 2 | `lib/features/iam-profile/` | `#features/iam-profile` · `#features/iam-profile/server` |
| 3 | `components2/iam-profile/` | `#components2/iam-profile/*` |

**No `_SEAL.md` at `lib/features/iam-profile/` root** — agent-contract rejects it.

## Routes (fixed segments — no catch-alls)

| Segment | File | Role |
| --- | --- | --- |
| `/iam-profile` | `page.tsx` | Re-exports `IamProfileOverviewPage` |
| `/iam-profile/identity` | `identity/page.tsx` | Re-exports identity page + metadata |
| `/iam-profile/security` | `security/page.tsx` | Re-exports security page + metadata |
| `/iam-profile/reverify` | `reverify/page.tsx` | Re-exports `IamProfileReverifyPage` + metadata |
| `layout.tsx` | Tier A org session + deferred `OrgIamProfileDeferredShell` |
| `error.tsx` | Uncaught failures — `#features/nexus/client` for path helpers |
| `not-found.tsx` | Invalid segment — `IamProfileSurface.notFound` |

## Layer 2 — `lib/features/iam-profile/`

### Public doors

| Door | Consumers |
| --- | --- |
| `index.ts` | RSC layouts (server barrel) |
| `server.ts` | Page bodies, metadata, shell data |
| `client.ts` | `"use client"` — actions + shared types only |

### Server Actions (mutations)

| Action | Audit / notes |
| --- | --- |
| `changePasswordAction` | `iam.password.change` · step-up |
| `sendVerificationEmailAction` | `iam.email.verification.resend` |
| `updateDisplayNameAction` | profile update via auth |
| `revokeSessionAction` / `revokeOtherSessionsAction` | session lifecycle |
| `setActiveOrganizationAction` / `leaveOrganizationAction` | org plugin |
| `deleteAccountAction` | `iam.account.delete` · then sign-in redirect |
| Invitation accept/reject | `org.invitation.*` |

### Data (`data/`)

- `profile-shell-data.server.ts` — overview summary, org list, activity tail
- `profile-metadata.server.ts` — segment metadata generators
- `account-device-sessions.server.ts` — session list for security panel
- `account-security-activity.server.ts` — allowlisted `iam.*` / `org.*` actions

### Page orchestrators (`components/`)

- `iam-profile-overview-page.server.tsx`
- `iam-profile-identity-page.server.tsx`
- `iam-profile-security-page.server.tsx`
- `iam-profile-reverify-page.server.tsx`
- `org-iam-profile-deferred-shell.tsx`

## Forbidden in this tree

- `[[...path]]` catch-alls · legacy `/account` routes · redirects to deleted paths
- Domain queries, Server Action bodies, Zod schemas in `app/` pages
- Passkey / 2FA / `changeEmail` UI (not in Neon Auth contract)
- `#features/nexus` from client boundaries — use `#features/nexus/client`

## Import doors

- Server data/actions/pages: `#features/iam-profile/server`
- Client islands: `#components2/iam-profile/*` + `#features/iam-profile/client` for actions

## Path builders

- `organizationIamProfilePath(orgSlug, segment?)` from `#lib/org-apps-module-paths`
- Revalidate: `toLocaleOrgIamProfileRevalidatePattern` (actions only)

## Verification

```bash
pnpm lint:path -- lib/features/iam-profile components2/iam-profile
pnpm test:fast -- tests/unit/iam-profile-surface-contract.test.ts
pnpm typecheck
```
