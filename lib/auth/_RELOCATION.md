# Relocated from `lib/auth/` (2026-05-19)

These modules were **member profile / IAM surface** concerns — not IAM control plane. They live in `lib/features/iam-profile/`.

| Former path | New path | Reason |
| --- | --- | --- |
| `accounts.server.ts` | `lib/features/iam-profile/data/account-identity.server.ts` | Linked-account reads for identity UI |
| `accounts.types.shared.ts` | `lib/features/iam-profile/schemas/accounts.types.shared.ts` | Client-safe linked-account type |
| `activity.server.ts` | `lib/features/iam-profile/data/account-security-activity.server.ts` | User security activity feed |
| `security.server.ts` | `lib/features/iam-profile/data/account-device-sessions.server.ts` | Device session listing |
| `accept-invitation-actions.server.ts` | `lib/features/iam-profile/actions/accept-invitation.actions.ts` | Invitation accept/reject Server Actions |

**Do not move back** into `lib/auth/` without unsealing `_SEAL.md` and updating `iam-directory.mdc`.

**Import doors:**

- RSC / server loaders: `#features/iam-profile/server` or `#features/iam-profile`
- Client islands: `#features/iam-profile/client`
- IAM backend: `#lib/auth` only (guards, audit writers, Neon config)
