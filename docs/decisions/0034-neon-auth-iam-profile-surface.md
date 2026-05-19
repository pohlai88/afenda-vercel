# ADR-0034 — Neon Auth IAM profile surface contract

**Status:** Accepted  
**Date:** 2026-05-19

## Context

Afenda's org-scoped IAM profile (`/{locale}/o/{orgSlug}/iam-profile/*`) must only ship UI backed by the **documented Neon Auth runtime** for project `snowy-dawn-60990429` (branch `br-young-term-aobkvd38`). Neon MCP `get_neon_auth_config` and official Neon Auth docs are the source of truth — not speculative Better Auth plugin typings.

## Neon MCP configuration applied (Phase 0)

| Setting | Value |
|---|---|
| `trusted_origins` | `https://www.nexuscanon.com` |
| `allow_localhost` | `true` (dev) |
| `verify_email_on_sign_up` | `true` |
| `require_email_verification` | `true` (strict) |
| `email_verification_method` | `otp` |
| OAuth | Google (shared) |

## Runtime surface matrix

| Capability | Neon docs | MCP-configurable | Afenda action |
|---|---|---|---|
| `updateUser({ name })` | [user-management](https://neon.com/docs/auth/guides/user-management.md) | N/A | **Ship** — identity panel |
| `updateUser({ image })` | SDK ref only; user-management lists `name` only | N/A | **Defer** — no avatar upload until Neon documents image |
| `changeEmail` | Explicitly **not supported** | N/A | **Drop** — remove UI + calls |
| `changePassword` | [Next.js server SDK](https://neon.com/docs/auth/reference/nextjs-server.md) | N/A | **Ship** — security panel + Server Action |
| `listSessions` / `revokeSession` / `revokeOtherSessions` | Same | N/A | **Ship** — security panel |
| `sendVerificationEmail` | Same | N/A | **Ship** — identity verify CTA + Server Action |
| `deleteUser` | Same | N/A | **Ship** — danger zone + step-up |
| `organization.list` / `setActive` / `leave` | [Organization plugin](https://neon.com/docs/auth/guides/plugins/organization.md) | Console/API plugins tab | **Ship** — membership panel |
| Passkey plugin | **Not in supported plugins list** | No | **Drop** — no UI, no i18n |
| 2FA / `twoFactor` plugin | **Not in supported plugins list** | No | **Drop** — no UI, no i18n |
| Magic Link | Supported plugin; auth-flow only | Console | **Out of scope** for iam-profile |
| `@neondatabase/auth-ui` `AccountView` | [UI components](https://neon.com/docs/auth/reference/ui-components.md) | N/A | **Not adopted** — Afenda owns design system, rail, RouteEnvelope, locale paths |
| Data export | Not a Neon Auth API | N/A | **Drop** — no stub; add when a named DSR workflow exists |

## Client typing policy

- Delete `lib/auth-client-neon-compat.ts` passkey/2FA/magicLink shims.
- Auth **flow** islands (sign-in, verify-email) may use [`lib/auth/neon-auth-client-runtime.shared.ts`](../lib/auth/neon-auth-client-runtime.shared.ts) for Email OTP typings only.
- IAM profile UI calls **Server Actions** for mutations; no direct `authClient.changeEmail`, `twoFactor`, or `passkey` calls.

## Audit strings (iam-profile enrichment)

| Action | Tier |
|---|---|
| `iam.password.change` | S |
| `iam.email.verification.resend` | B |
| `org.member.leave` | A |
| `iam.account.delete` | S |

## Consequences

- Rail/quick-action copy must not mention passkeys or 2FA until Neon Auth adds those plugins to the supported list.
- Strict email verification may block unverified users from security surfaces — `requireVerifiedEmailForAccount` remains the gate.
- Revisit avatar upload when Neon Auth user-management documents `image` as a supported field.
