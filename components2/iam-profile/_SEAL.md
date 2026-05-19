# SEAL — Layer 3 · `components2/iam-profile/`

**Authority:** client UI for org-scoped personal IAM. Domain truth stays in `#features/iam-profile`. [ADR-0034](../../docs/decisions/0034-neon-auth-iam-profile-surface.md).

## Entry components

| Component | Role |
| --- | --- |
| `iam-profile-identity.client.tsx` | Provider + panels mount |
| `iam-profile-security.client.tsx` | Provider + panels mount |
| `iam-profile-context-band.tsx` | Overview section chrome |
| `iam-profile-overview-sections.client.tsx` | Next / membership / danger on overview |

## Compound APIs

```txt
IamProfileIdentityPanels.{VerifyEmailNotice, Profile, LinkedAccounts, StatusFooter}
IamProfileSecurityPanels.{Password, Sessions, Activity}
```

## Context providers

- `iam-profile-identity-context.client.tsx` — `authClient.updateUser`, link/unlink, `sendVerificationEmailAction`
- `iam-profile-security-context.client.tsx` — session rows + `hasCredential` for password panel

## Panels (no Neon-unsupported flows)

| File | Ships |
| --- | --- |
| `iam-profile-identity-panels.client.tsx` | Display name, verify email, linked OAuth |
| `iam-profile-security-panels.client.tsx` | Password, sessions, activity |
| `iam-profile-membership-panels.client.tsx` | setActive / leave / open workspace |
| `iam-profile-danger-panels.client.tsx` | `deleteAccountAction` with email confirm |

## Import rules

- Actions: `#features/iam-profile/client` only
- Never `#features/iam-profile` index from client files
- Never `#lib/auth` server barrel

## Forbidden strings / patterns

- `addPasskey`, `changeEmail`, `twoFactor`, `/account/` fallbacks
- `auth-client-neon-compat` (deleted)
