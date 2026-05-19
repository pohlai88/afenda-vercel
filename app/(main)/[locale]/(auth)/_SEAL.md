# `(auth)` route group — refactor seal

**Status:** DONE · sealed **2026-05-19**  
**Policy:** Do not edit this tree unless the task **explicitly** requires auth-route work.

This file is the human + agent stop sign. Mechanical guards live in tests and Cursor rules listed below.

---

## Edit policy

| Action | Allowed? |
| --- | --- |
| Bug fix on a live auth URL | Yes — minimal diff, same architecture |
| New pre-login auth route (product requirement) | Yes — follow locked architecture below |
| i18n key add/change for existing auth copy | Yes — update `messages/en.json` + `pnpm lint:fixtures-parity` |
| Metadata-driven ERP UI / governed renderers here | **No** — bespoke `components2/auth/` only |
| Duplicate forms, shims, or `app/(auth)/**` business logic | **No** |
| Moving session guards or Neon config into `app/` | **No** — `#lib/auth` only |
| “While I’m here” refactors | **No** |

If the change touches `(auth)/`, cite the explicit requirement in the PR/commit message (issue, product spec, or user instruction).

---

## Locked architecture — three layers

```txt
Layer 1 — app/(main)/[locale]/(auth)/   → thin routes (params, metadata, AuthPageFrame, client import)
Layer 2 — lib/auth/                     → IAM control plane (guards, audit, Neon, auth-flow.shared)
Layer 3 — components2/auth/             → Card + client forms (SignInForm compound, AuthResult, …)
```

**Invitation actions:** `#features/iam-profile/client` — not Layer 3 auth UI.

**Page owns the frame (Layer 1).** Client components (Layer 3) own the Card only — never self-wrap `AuthPageFrame`.

**Not auth UI:** metadata renderers (`#components2/metadata`), ERP modules, org-admin data, IAM account shell — those belong under `(iam)/`, `components2/app-shell/`, or `lib/features/*`.

---

## Route inventory (canonical)

| Segment | Role |
| --- | --- |
| `sign-in/` · `sign-up/` | `SignInForm` (+ lock mode on sign-up) |
| `forgot-password/` · `reset-password/` | Password recovery |
| `check-email/` · `verify-email/` | Email verification funnel |
| `session-expired/` | `AuthResult` interruption surface |
| `accept-invitation/` | Org invite accept/reject |
| `layout.tsx` | `RouteEnvelope` + private `robots` defaults |
| `error.tsx` · `not-found.tsx` | `AuthShell` i18n + `RouteErrorShell` / `AuthPageFrame` |
| `*/loading.tsx` | Shape-matched skeletons only |

Public URLs: `/{locale}/sign-in`, `/{locale}/sign-up`, … — `(auth)` is invisible in the path.

---

## Where code may live (do not drift)

| Concern | Canonical home |
| --- | --- |
| Post-auth path / callback parsing | `#lib/auth/auth-flow.shared` |
| Sign-in / OTP / OAuth UI | `#components2/auth/*` |
| Accept/reject invitation mutations | `#features/iam-profile/client` |
| Session lifecycle audit (sign-in/sign-up) | `#lib/auth/session-lifecycle-audit.*` + `app/api/auth/[...path]/route.ts` |
| Interruption copy / status codes | `AuthStatus` + `#lib/auth/auth-status-copy` |
| Auth shell error copy | `AuthShell` namespace in `messages/en.json` |

---

## Allowed change checklist

When an explicit task requires editing `(auth)/`:

1. Keep `page.tsx` thin — no new data graphs in `app/`.
2. Preserve `AuthPageFrame` on every page surface (see contract test).
3. Client forms: `useTranslations("Auth")` (or `AuthShell` for shell errors) — no hardcoded English.
4. Run targeted verification:

```bash
pnpm gate -- "app/(main)/[locale]/(auth)" components2/auth lib/auth
pnpm test:fast tests/unit/auth-surface-contract.test.ts tests/unit/auth-flow.shared.test.ts tests/unit/lib-auth-contract.test.ts
```

5. Next.js MCP (dev server): `get_errors` + confirm auth routes in `get_routes`.

---

## Mechanical guards (CI / agents)

| Guard | Path |
| --- | --- |
| Auth surface contract | `tests/unit/auth-surface-contract.test.ts` |
| Auth flow helpers | `tests/unit/auth-flow.shared.test.ts` |
| `lib/auth` barrel / lifecycle | `tests/unit/lib-auth-contract.test.ts` |
| i18n parity | `pnpm lint:fixtures-parity` |
| IAM / routing doctrine | `.cursor/rules/iam-directory.mdc`, `.cursor/rules/i18n-directory.mdc` |
| No repo-root `components/` | `.cursor/rules/never-restore-deleted-components.mdc` |

---

## Related sealed neighbors (edit only with same explicit intent)

| Path | Layer |
| --- | --- |
| `components2/auth/_SEAL.md` | **Layer 3** — pre-login UI shelf |
| `lib/auth/_SEAL.md` | **Layer 2** — IAM control plane |
| `lib/features/account/` | Staging — invitation actions + account queries |
| `lib/auth/auth-flow.shared.ts` | Layer 2 URL/query helpers (used by Layer 1 pages) |
| `lib/features/account/actions/accept-invitation.actions.ts` | Invitation Server Actions |
| `app/api/auth/[...path]/route.ts` | Neon Auth handler + lifecycle audit wrapper |

**Profile surface:** `o/[orgSlug]/profile/*` + `#components2/iam-profile/*` — separate from pre-login `(auth)/`.

---

## Unseal criteria

Remove or update this seal only when:

- A named ADR or product decision changes pre-login auth architecture, or
- A stakeholder explicitly requests unsealing with scope (e.g. “unseal `(auth)` for OAuth provider X”).

Until then: **treat `(auth)` as complete.**
