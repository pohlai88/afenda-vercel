# `lib/auth/` — IAM control plane seal

**Status:** DONE · sealed **2026-05-19**  
**Policy:** Do not edit this tree unless the task **explicitly** requires IAM backend / control-plane work.

This directory is the **IAM backend only** — Better Auth config, session guards, audit writers, org IAM audit export, permission predicates, and edge-safe auth helpers. It is **not** account UI data, Server Actions for invitation flows, or route/page wiring.

See also: [`_RELOCATION.md`](./_RELOCATION.md) for modules moved out during this seal.

---

## Edit policy

| Action | Allowed? |
| --- | --- |
| Session guard / step-up / policy fix | Yes — minimal diff |
| Audit writer or org IAM audit CSV fix | Yes |
| Neon Auth config / webhook verify | Yes |
| New edge-safe `*.shared.ts` helper used by `proxy.ts` or auth routes | Yes — update `iam-directory.mdc` |
| Profile identity queries, device sessions, security activity | **No** — `#features/iam-profile` |
| Invitation accept/reject Server Actions | **No** — `#features/iam-profile/client` |
| Org-admin directory listing | **No** — `#features/org-admin/server` |
| Legacy `/account/*` redirects | **Deleted** — `/{locale}/o/{slug}/iam-profile/*` is the canonical surface (no shim) |
| UI copy in React components | **No** — `components2/auth/` or `components2/iam-profile/` |
| “While I’m here” refactors | **No** |

If the change touches `lib/auth/`, cite the explicit requirement in the PR/commit message.

---

## Locked architecture — three layers

```txt
Layer 1 — app/(main)/[locale]/(auth)/   → pre-login routes (_SEAL.md)
Layer 2 — lib/auth/                     → IAM control plane (this seal)
Layer 3 — components2/auth/             → pre-login Card + forms (_SEAL.md)
```

**Staging (not a layer):** `lib/features/iam-profile/` — signed-in member profile data + invitation actions.

```txt
#lib/auth          → server barrel (guards, auth, audit, org IAM audit)
#lib/auth/*.shared → edge/client-safe deep imports only where documented
#components2/auth  → Layer 3 UI (import via #components2/auth/*)
```

**Barrel rule:** `#lib/auth` is for **guards, `auth`, audit, org IAM audit, invitation guard, global admin check** — not account listing queries or feature Server Actions.

---

## Canonical module inventory

| Module | Role |
| --- | --- |
| `neon.server.ts` | Better Auth / Neon Auth instance |
| `tenant-session.server.ts` | ERP + route-handler org/signed-in guards |
| `auth-shell-session.server.ts` | Auth/account shell guards |
| `org-membership.*` | Membership truth for guards |
| `org-slug.*` | Slug validation + DB allocation |
| `audit.server.ts` | `writeIamAuditEvent*` |
| `org-audit*.ts` | Org IAM audit CSV/list/export verify |
| `session-lifecycle-audit.*` | `iam.session.*` mapping for auth API |
| `stepup.server.ts` · `session-policy.server.ts` · `policy.server.ts` | Step-up + email verification gates |
| `invitation-guard.server.ts` | Invitation ownership assert (control plane) |
| `org-invite-rate.server.ts` | Invite rate limit gate |
| `permission.server.ts` | `isGlobalAdminUser` only |
| `auth-flow.shared.ts` · `callback-path.ts` | Post-auth path + open-redirect validation |
| `auth-status*.ts` · `auth-interruption-url.shared.ts` | Interruption codes + copy resolver |
| `interruption-redirect.server.ts` · `intended-path.server.ts` | Server redirects |
| `webhook-verify.server.ts` | Neon Auth webhook signature |
| `auth-mail.server.ts` | Transactional IAM email (deep import) |
| `neon-auth-error.shared.ts` | Neon Auth error message helper |
| `forwarded-path-headers.shared.ts` · `proxy-protected-paths.shared.ts` | Proxy contract |
| `social-providers-env.shared.ts` | Enabled OAuth provider ids |

**Not in this tree (relocated):** see `_RELOCATION.md`.

---

## Allowed change checklist

When an explicit task requires editing `lib/auth/`:

1. Keep modules **server-only** or **pure shared** — no React, no feature UI.
2. Do not re-export account surface queries from `index.ts`.
3. Route handlers / Server Actions in other modules call **guards and audit** from here — do not embed business UI logic here.
4. Run targeted verification:

```bash
pnpm gate -- lib/auth lib/features/iam-profile components2/auth
pnpm test:fast tests/unit/lib-auth-contract.test.ts tests/unit/auth-flow.shared.test.ts tests/unit/org-membership-contract.test.ts
```

5. Update `.cursor/rules/iam-directory.mdc` if public doors or filenames change.

---

## Mechanical guards

| Guard | Path |
| --- | --- |
| `lib/auth` contract | `tests/unit/lib-auth-contract.test.ts` |
| Org membership | `tests/unit/org-membership-contract.test.ts` |
| Auth flow helpers | `tests/unit/auth-flow.shared.test.ts` |
| IAM doctrine | `.cursor/rules/iam-directory.mdc` |
| Relocation manifest | `lib/auth/_RELOCATION.md` |

---

## Related sealed neighbors

| Path | Layer |
| --- | --- |
| `app/(main)/[locale]/(auth)/_SEAL.md` | **Layer 1** — pre-login routes |
| `components2/auth/_SEAL.md` | **Layer 3** — pre-login UI |
| `lib/features/iam-profile/_SEAL.md` | Signed-in IAM profile staging |
| `app/api/auth/[...path]/route.ts` | Auth API + lifecycle audit wrapper |

**Next surface:** `app/(main)/[locale]/o/[orgSlug]/iam-profile/` — signed-in identity/security shell; do not merge IAM UI refactors into `lib/auth/`.

---

## Unseal criteria

Remove or update this seal only when:

- A named ADR changes IAM control-plane boundaries, or
- A stakeholder explicitly requests unsealing with scope.

Until then: **treat `lib/auth/` as complete backend.**
