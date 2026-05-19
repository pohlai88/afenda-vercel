# SEAL — Layer 2 · `lib/features/iam-profile/`

**Authority:** personal IAM domain for signed-in members (Neon Auth / managed Better Auth). [ADR-0034](../../docs/decisions/0034-neon-auth-iam-profile-surface.md).

## Public doors

| Door | Consumers |
| --- | --- |
| `index.ts` | RSC pages, layouts (server barrel) |
| `server.ts` | Shell composers, metadata, `getProfileShellData` |
| `client.ts` | `"use client"` / `*.client.tsx` — actions + shared types only |

## Server Actions (mutations)

| Action | Audit / notes |
| --- | --- |
| `changePasswordAction` | `iam.password.change` · step-up |
| `sendVerificationEmailAction` | `iam.email.verification.resend` |
| `updateDisplayNameAction` | profile update via auth |
| `revokeSessionAction` / `revokeOtherSessionsAction` | session lifecycle |
| `setActiveOrganizationAction` / `leaveOrganizationAction` | org plugin |
| `deleteAccountAction` | `iam.account.delete` · then sign-in redirect |
| Invitation accept/reject | `org.invitation.*` |

## Data (`data/`)

- `profile-shell-data.server.ts` — overview summary, org list, activity tail
- `account-device-sessions.server.ts` — session list for security panel
- `account-security-activity.server.ts` — allowlisted `iam.*` / `org.*` actions (no passkey emitters)

## Neon unsupported (do not add)

- Passkeys, 2FA, `changeEmail`, avatar `updateUser({ image })` until Neon documents support

## Typings extension

- Auth-flow Email OTP typings: `lib/auth/neon-auth-client-runtime.shared.ts` (not `lib/` root)
