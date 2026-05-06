# Auth enrichment plan (normalized)

> **Superseded for maintenance:** the merged canonical plan is [auth-iam-roadmap-final.plan.md](auth-iam-roadmap-final.plan.md), which includes serialized WPs, implementation status, and the CNA IAM reference track. This file is kept for historical detail (full WP JSON and file lists).

## Document control

- **plan_id:** `auth-enrichment-from-legacy`
- **plan_version:** `1.1`
- **status:** `implemented` (partial — see § Implementation vs plan)
- **target_repo:** `afenda-vercel` (canonical)
- **legacy_extract:** `C:\JackProject\afenda-next` (patterns only; no URL tree copy)
- **deferred_source:** `afenda-node` (awaiting source drop)
- **last_normalized:** Vercel MCP `search_vercel_documentation` + repo `AGENTS.md`

## Vercel / Next.js platform alignment (stable)

Use these as **non-negotiable runtime assumptions** on Vercel; citations are from Vercel docs via MCP.

1. **Authenticate before privileged work** — Route handlers and upload/token flows must verify the caller server-side (e.g. Blob `onBeforeGenerateToken` pattern: reject unauthenticated requests). Same principle applies to new account Server Actions (session + step-up + email verification as designed).
   - Ref: [Vercel Blob — client upload auth](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk)

2. **Server redirects** — Use `redirect()` from `next/navigation` in App Router server contexts for auth redirects (aligned with existing `lib/auth/stepup.server.ts` / `lib/tenant.ts`).
   - Ref: [Vercel — Redirects (App Router)](https://vercel.com/docs/routing/redirects)

3. **Cron / job endpoints** — If new scheduled or internal HTTP triggers are added, follow **Bearer secret** verification (`CRON_SECRET` or dedicated secret); do not expose unauthenticated state-changing routes.
   - Ref: [Vercel — Cron jobs (secure endpoint)](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

4. **Routing middleware** — This project uses root **`proxy.ts`** (Next 16) with a **narrow matcher**; keep **session cookie presence / redirects only** per `AGENTS.md`. Do not move authorization or DB reads into edge routing.
   - Ref: [Vercel — Routing Middleware API](https://vercel.com/docs/routing-middleware/api) (general); repo contract overrides breadth.

5. **Environment stability** — Production secrets live in Vercel Project env; local flow remains `.env.config` → `pnpm env:sync` → `.env.local`. New auth-related keys (`BETTER_AUTH_*`, optional `@better-auth/infra`) must be documented in `.env.config.example` and synced.
   - Ref: [Vercel CLI — env](https://vercel.com/docs/cli/env), [Framework env vars](https://vercel.com/docs/environment-variables/framework-environment-variables)

6. **Build/runtime context** — Use `VERCEL_ENV` / `VERCEL_URL` only for **cosmetic or non-security** branching when needed; authorization must not depend on client-controlled headers.

## Repository alignment (AGENTS)

- **IAM authority:** `lib/auth/` only; **`app/`** = routes + composition.
- **Surfaces:** `/account/*`, `/sign-in`, `/dashboard`, `/api/auth/*` — **no `app/iam/*`** unless `AGENTS.md` is updated first.
- **Mutations:** Server Actions for dashboard/account mutations; keep **`experimental.serverActions.allowedOrigins`** in sync with [`lib/site.ts`](lib/site.ts) / `BETTER_AUTH_*` hosts ([`next.config.ts`](next.config.ts)).
- **Audit:** `iam_audit_event` + [`lib/auth/audit.server.ts`](lib/auth/audit.server.ts); ERP naming under **IAM audit policy (ERP)** in [`AGENTS.md`](AGENTS.md).
- **Imports:** `#lib/auth` public door; no cross-module deep imports.

## Goal (unchanged)

Enrich **tenant-facing auth** so the product feels like a **complete** system (sessions, devices, identity linking, org membership), by **extracting patterns** from `afenda-next`, without adopting its `/iam` route tree or non-contract folders.

## Non-goals (freeze)

- No Auth.js / Auth0 migration in this plan.
- No slug/subdomain tenant host routing (that is `afenda-node` territory later).
- No new architectural categories under `lib/features/*` beyond existing vocabulary.

## Serialized work packages

Each item is **ordered**; `depends_on` must complete before implementation.

```json
[
  {
    "id": "WP-01",
    "title": "Security center — sessions and passkeys (server-first)",
    "depends_on": [],
    "delivers": [
      "RSC data: listSessions + listPasskeys via auth.api + headers()",
      "Server Actions: revokeSession, revokeOtherSessions, deletePasskey",
      "Refactor app/account/security to thin client island"
    ],
    "primary_files": [
      "lib/auth/config.server.ts",
      "lib/auth/index.ts",
      "app/account/security/page.tsx",
      "app/account/security/_actions/*.ts"
    ],
    "legacy_reference": "afenda-next: auth.security.query.server.ts, iam/account/security"
  },
  {
    "id": "WP-02",
    "title": "User-visible security activity feed",
    "depends_on": ["WP-01"],
    "delivers": [
      "Read model over iam_audit_event filtered by actorUserId + allowlisted actions",
      "No PII secrets in metadata; copy-safe labels"
    ],
    "primary_files": ["lib/auth/*.server.ts", "lib/db/schema.ts"],
    "legacy_reference": "afenda-next: listRecentAuthEvents (conceptual parity via iam_audit_event)"
  },
  {
    "id": "WP-03",
    "title": "Identity — profile + OAuth account linking",
    "depends_on": ["WP-01"],
    "delivers": [
      "betterAuth account.accountLinking (and related) in config.server.ts",
      "app/account/identity: linked providers, link/unlink flows",
      "Safe DB projections for linked accounts (no token columns in UI queries)"
    ],
    "primary_files": [
      "lib/auth/config.server.ts",
      "app/account/identity/page.tsx",
      "app/account/identity/_actions/*.ts"
    ],
    "legacy_reference": "afenda-next: auth.account-query.server.ts, iam/account/identity"
  },
  {
    "id": "WP-04",
    "title": "Policy composition — verified email + step-up",
    "depends_on": [],
    "delivers": [
      "lib/auth: requireVerifiedEmail (or equivalent) composed with requireRecentAuthStepUp for /account/security and /account/identity",
      "Document interaction with session cookie cache if enabled later"
    ],
    "primary_files": ["lib/auth/*.server.ts", "app/account/**/layout.tsx"],
    "legacy_reference": "afenda-next: auth.policy.server.ts"
  },
  {
    "id": "WP-05",
    "title": "Organization UX + org audit events",
    "depends_on": ["WP-03", "WP-04"],
    "delivers": [
      "Invites / members / roles UI using organization plugin APIs",
      "writeIamAuditEvent* for org.* actions per AGENTS naming"
    ],
    "primary_files": ["app/dashboard/** or app/account/**", "lib/auth/audit.server.ts", "AGENTS.md"],
    "legacy_reference": "afenda-next: workspace/select-tenant (UX patterns only)"
  },
  {
    "id": "WP-06",
    "title": "Optional @better-auth/infra (dash + sentinel)",
    "depends_on": ["WP-01"],
    "delivers": [
      "Env-gated plugins matching afenda-next (BETTER_AUTH_API_KEY, optional URLs)",
      ".env.config.example + AGENTS auth bullet"
    ],
    "primary_files": ["package.json", "lib/auth/config.server.ts", ".env.config.example", "AGENTS.md"],
    "legacy_reference": "afenda-next: auth.config.adapter.server.ts (dash/sentinel block)"
  },
  {
    "id": "WP-07",
    "title": "Regression tests (auth module)",
    "depends_on": ["WP-04"],
    "delivers": [
      "Focused vitest on policy/redirect helpers where repo already permits tests"
    ],
    "primary_files": ["lib/auth/__tests__ or existing test root per CI"],
    "legacy_reference": "afenda-next: auth.*.test.ts"
  }
]
```

## Environment variables (serial)

Add or confirm when implementing; sync via `pnpm env:sync` and Vercel project settings.

- **Existing (stable):** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, OAuth client IDs/secrets as today.
- **WP-06 optional:** `BETTER_AUTH_API_KEY`, `BETTER_AUTH_API_URL`, `BETTER_AUTH_KV_URL` (only if infra plugins enabled).
- **Cron (if new routes):** `CRON_SECRET` per Vercel cron docs.

## Verification gates (every WP merge)

1. `pnpm lint` (agent-contract + eslint + design-contract)
2. `pnpm typecheck`
3. Manual: `/account/security` and new `/account/identity` — step-up + verified-email behavior
4. Production: confirm Vercel env contains auth secrets for target environment; no missing `BETTER_AUTH_URL` on prod

## Deferred: afenda-node

When source is available: compare **IdP / PBAC / host-tenant** doctrine only; port **documentation or predicates** into `AGENTS.md` if product requires — **no automatic code merge** without explicit stack decision.

## Implementation vs plan (actual)

| WP | Planned | Delivered |
|----|---------|-----------|
| WP-01 | RSC security center, `listSessions` / `listPasskeys`, revoke / delete passkey actions, thin client | **Done:** [`lib/auth/security.server.ts`](lib/auth/security.server.ts), [`app/account/security/page.tsx`](app/account/security/page.tsx), [`security-center-client.tsx`](app/account/security/security-center-client.tsx), [`security-actions.ts`](app/account/security/security-actions.ts) using `auth.api.*` + [`next/headers`](https://nextjs.org/docs/app/api-reference/functions/headers) per Better Auth server session docs. |
| WP-02 | User activity from `iam_audit_event` | **Done:** [`lib/auth/activity.server.ts`](lib/auth/activity.server.ts) — allowlisted `iam.session.*` only; labels for copy-safe UI. |
| WP-03 | Identity, account linking, safe linked-account queries | **Done:** [`lib/auth/accounts.server.ts`](lib/auth/accounts.server.ts), [`app/account/identity/*`](app/account/identity/), `account.accountLinking` + `user.changeEmail` in [`config.server.ts`](lib/auth/config.server.ts) per [Better Auth options](https://www.better-auth.com/docs/reference/options) / [users & accounts](https://www.better-auth.com/docs/concepts/users-accounts). |
| WP-04 | Verified email + step-up | **Done:** [`lib/auth/policy.server.ts`](lib/auth/policy.server.ts); security + organization layouts require verified email after step-up; identity allows unverified with banner. |
| WP-05 | Org invites UI + `org.*` audit | **Partial:** [`app/account/organization/page.tsx`](app/account/organization/page.tsx) read-only org summary + onboarding links; **no** invite/member management UI or new `writeIamAuditEvent` org mutations. |
| WP-06 | `@better-auth/infra` dash/sentinel | **Not done** (optional env-gated scope). |
| WP-07 | Vitest auth tests | **Not done** (repo has no `vitest` devDependency). |
| Deferred | afenda-node | Unchanged. |

**Verification:** `pnpm typecheck`, `pnpm lint` after clearing stale `.next` (typed routes validator mismatch otherwise).

## Implementation todos (mirror)

- [x] WP-01 Security center (sessions/passkeys + actions + RSC refactor)
- [x] WP-02 Activity feed from `iam_audit_event`
- [x] WP-03 Identity + account linking + `/account/identity`
- [x] WP-04 Verified-email + step-up composition
- [ ] WP-05 Org UX + `org.*` audit (partial: org summary page only)
- [ ] WP-06 Optional `@better-auth/infra`
- [ ] WP-07 Auth unit tests
- [ ] Deferred: afenda-node review
