# `components2/auth/` — pre-login auth UI seal (Layer 3)

**Status:** DONE · sealed **2026-05-19**  
**Policy:** Do not edit this tree unless the task **explicitly** requires pre-login auth UI work.

This directory is **Layer 3** of the pre-login auth stack. Routes (Layer 1) import from here; the IAM backend (Layer 2) stays in `#lib/auth`.

---

## Three-layer pre-login auth stack

```txt
Layer 1 — app/(main)/[locale]/(auth)/   thin routes (metadata, guards wiring, AuthPageFrame)
Layer 2 — lib/auth/                     IAM control plane (#lib/auth)
Layer 3 — components2/auth/             Card + client forms (this seal)
```

**Cross-cutting (not a layer):** `lib/features/account/` — invitation Server Actions + signed-in account queries used by accept-invitation and `(iam)/`.

**Import alias:** `#components2/auth/*` (filesystem: `components2/auth/**`).

---

## Edit policy

| Action | Allowed? |
| --- | --- |
| Bug fix on sign-in / sign-up / recovery / verify / invite UI | Yes — minimal diff |
| New pre-login form or auth chrome primitive | Yes — follow composition rules below |
| i18n via `useTranslations("Auth")` | Yes — update `messages/en.json` + fixtures parity |
| shadcn shelf primitives (`#components2/ui/*`) | Yes |
| Session guards, Neon config, audit writes | **No** — Layer 2 `#lib/auth` |
| Route params, `generateMetadata`, layout shells | **No** — Layer 1 `(auth)/` |
| Governed metadata renderers (`#components2/metadata`) | **No** — bespoke auth Card UI only |
| ERP modules, org-admin data | **No** |
| Self-wrap `AuthPageFrame` inside client forms | **No** — page owns frame |
| “While I’m here” refactors | **No** |

---

## Locked composition

```txt
Page (Layer 1)     →  <AuthPageFrame> … <ClientForm /> … </AuthPageFrame>
Client (Layer 3)   →  <Card> … </Card> only — no AuthPageFrame inside forms
```

| Primitive | Role |
| --- | --- |
| `auth-page-frame.tsx` | Full-viewport pre-login shell (brand, skip link, `#auth-main`) — used by **pages**, not nested in forms |
| `auth-result.tsx` | Interruption / missing-param states (`AuthResult`) |
| `auth-footer-links.tsx` | Canonical footer link styling (`AuthFooterLink`) |
| `auth-legal-consent.tsx` | Terms/privacy consent block |
| `auth-route-loading.tsx` · `auth-frame-loading-card.tsx` | Shape-matched loading |
| `sign-in-form*.client.tsx` | Compound SignInForm (provider + method panels) |
| `forgot-password-form` · `reset-password-form` · `verify-email-form` | Recovery / verify Card forms |
| `check-email-client.tsx` · `accept-invitation-client.tsx` | Funnel + invite Card UI |

**SignInForm compound pattern:** `sign-in-form.types.shared.ts` → `sign-in-form-context.client.tsx` → `sign-in-form-method-panels.client.tsx` → thin `sign-in-form.client.tsx`.

---

## Import boundaries (Layer 3)

| May import | Must not import |
| --- | --- |
| `#components2/ui/*` | `#lib/auth` barrel (pulls server-only graph) |
| `#lib/auth-client` | `#features/*` index barrels with server RSC |
| `#features/iam-profile/client` (invitation actions) | `#components2/metadata` |
| `#lib/auth/auth-flow.shared` (pure URL helpers) | `next/headers`, `#lib/db` |
| `#i18n/navigation` | Governed Pattern B/C list renderers |

Deep `#lib/auth/*.shared` only when documented in `iam-directory.mdc` (e.g. auth-flow helpers from pages — prefer props from Layer 1).

---

## Design system (not metadata EUI)

Pre-login auth is **not** metadata-driven. Use shadcn shelf primitives and semantic tokens — same quality bar, different pattern:

- `Card`, `Button`, `Input`, `Tabs`, `Alert`, `Field` from `#components2/ui/*`
- Semantic tokens only — no hardcoded palette
- `flex` + `gap-*` — no `space-y-*`
- Password toggles: `type="button"` + `aria-pressed`
- OTP: `inputMode="numeric"`, `autoComplete="one-time-code"`, `aria-describedby` on errors

---

## Component inventory

| File | Surface |
| --- | --- |
| `auth-page-frame.tsx` | Layer 1 shell wrapper |
| `auth-result.tsx` | Interruption cards |
| `auth-footer-links.tsx` | Footer links |
| `auth-legal-consent.tsx` | Legal consent |
| `auth-route-loading.tsx` | Route loading |
| `auth-frame-loading-card.tsx` | Card skeleton |
| `sign-in-form.client.tsx` | Sign-in / sign-up |
| `sign-in-form-context.client.tsx` | Form state provider |
| `sign-in-form-method-panels.client.tsx` | Email / OTP / OAuth panels |
| `sign-in-form.types.shared.ts` | Shared form types |
| `forgot-password-form.client.tsx` | Forgot password |
| `reset-password-form.client.tsx` | Reset password |
| `verify-email-form.client.tsx` | Email verification OTP |
| `check-email-client.tsx` | Check-email funnel |
| `accept-invitation-client.tsx` | Org invitation accept/reject |

---

## Verification

```bash
pnpm lint:path -- components2/auth
pnpm test:fast tests/unit/auth-surface-contract.test.ts
pnpm typecheck
```

With Layer 1 + 2 changes:

```bash
pnpm gate -- components2/auth lib/auth
```

---

## Mechanical guards

| Guard | Path |
| --- | --- |
| Auth UI + page frame contract | `tests/unit/auth-surface-contract.test.ts` |
| Auth flow URL helpers | `tests/unit/auth-flow.shared.test.ts` |
| Layer 1 seal | `app/(main)/[locale]/(auth)/_SEAL.md` |
| Layer 2 seal | `lib/auth/_SEAL.md` |
| IAM doctrine | `.cursor/rules/iam-directory.mdc` |

---

## Related surfaces (separate seals)

| Path | Layer / role |
| --- | --- |
| `o/[orgSlug]/profile/**` + `#components2/iam-profile/**` | Signed-in profile — not Layer 3 auth |
| `components2/app-shell/` | Post-login app shell chrome (the standardized shell) |
| `lib/features/account/` | Account data + invitation actions |

---

## Unseal criteria

Update this seal only when a named ADR or explicit product decision changes pre-login auth UI architecture.

Until then: **treat `components2/auth/` as complete Layer 3.**
