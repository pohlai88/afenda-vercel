# ADR-0003 — Post-login loading bay and Nexus routing


| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-10 |
| **Amended** | **2026-05-19** — Retired post-login **`/console`** product. **0-org** first-run → **`/bootstrap`**; **org resolution** → **`/o`** dispatcher (inline multi-org picker). Session reverify → **`/o/{slug}/iam-profile/reverify`** (not `session-expired?step_up`). |
| **Amended** | **2026-05-11** — With-org bay mounts **`WorkbenchShell`** (ADR-0005); **"Nexus Field"** retired — use **Nexus** for `/nexus` surface; non-goals clarify bootstrap does not mount full org shell. |
| **Supersedes** | Prior assumption that org bootstrap lives at a dedicated `/onboarding` gate route before any operational surface. |
| **Does not supersede** | **ADR-0001** (Spatial OS L1–L4, materials, command pipeline target). **locale-first routing**, **tenant/session authority**, **`proxy.ts` narrow gate**, **Server Actions**, **IAM audit**, **`AGENTS.md` §6 import boundaries**. |
| **Implements in code** | `/{locale}/bootstrap` (0-org setup), `/{locale}/o` (org dispatcher), `/{locale}/o/{orgSlug}/nexus` (with-org Nexus), `next.config.ts` redirect `/:locale/onboarding` → `/:locale/bootstrap`, `lib/auth/callback-path.ts`, `lib/auth/auth-status-copy.ts`, `lib/features/bootstrap/`, `components2/bootstrap/` |
| **Related rules** | `.cursor/rules/i18n-directory.mdc` · `.cursor/rules/nextjs-best-practices.mdc` §2 (Tier A/B) · ADR-0001 §3 (layer roles) · ADR-0005 (Workbench shell) |

---

## 1. Context

Operators need a single mental model after authentication: **land, orient, choose the next move**. A separate pre-Nexus gate route (`/onboarding`) fragments that model and forces users through a linear funnel before they ever see the operational loading bay.

This ADR defines **post-login org resolution** and **two complementary surfaces** — first-run setup without an organization, and Nexus with an active org — both reachable **only post-login** (session-validated). Bootstrap work (create first org, review invitations) is **content on `/bootstrap`**, not a prerequisite URL silo.

Spatial OS chrome (L1 utility bar, L4 dock target, command layer) remains mounted only under org-scoped layouts per ADR-0001; the bootstrap bay is intentionally lighter-weight IAM chrome.

---

## 2. Decision

### 2.1 Post-login surfaces

| Surface | Locale-internal URL | Authority | Purpose |
|---------|----------------------|-----------|---------|
| **Org dispatcher** | `/o` | `requireSignedInSession()` | Resolve active org: 0 → `/bootstrap`; 1 → set active + Nexus; N → inline picker |
| **First-run setup** | `/bootstrap` | `requireSignedInSession()` in `[locale]/bootstrap/layout.tsx` | Pending invitations, create first organization (0-org only) |
| **With-org bay (Nexus)** | `/o/{orgSlug}/nexus` | `requireOrgSession()` under `[locale]/o/[orgSlug]/layout.tsx` + **`WorkbenchShell`** | Orientation, pressure, truth map, lanes — decide next surface |
| **Session reverify** | `/o/{orgSlug}/iam-profile/reverify` | `requireSignedInSession()` + `SignInForm` step-up | Prove recent session before sensitive IAM/admin work |

### 2.2 Post-login defaults

- Sign-in defaults `callbackUrl` to **`/o`** as the **dispatcher**: with active org + membership → redirect to `/o/{slug}/nexus`; without org → `/bootstrap`.
- **`ORG_REQUIRED` interruption** primary CTA targets **`/o`** (dispatcher), not `/console` or `/onboarding`.
- **`requireRecentAuthStepUp`** redirects to the matching **reverify** surface when `returnTo` is org- or platform-scoped; otherwise falls back to the auth interruption surface.

### 2.3 Legacy URLs

- Permanent redirect **`/:locale/onboarding` → `/:locale/bootstrap`** in `next.config.ts`.
- **`/console`** is **retired** — no redirect tombstone; bookmarks 404.

### 2.4 Relationship to ADR-0001 (Spatial OS shell)

- Nexus **page** content stays at `/o/{orgSlug}/nexus`.
- Bootstrap is **not** L1–L4 Spatial OS; it is an authenticated **account/org bootstrap bay**. ADR-0001 L1 non-authority and dock contracts apply when **`WorkbenchShell`** is mounted on org routes (ADR-0005).

---

## 3. Consequences

1. Product copy and docs should describe **Bootstrap** (0-org) and **`/o`** (dispatcher), not **Console** or a separate “onboarding portal” URL.
2. `AGENTS.md` and proxy path lists must list `/bootstrap` and `/o`; `/console` must not appear as a live route.
3. Server Actions that revalidated `/console` must revalidate `/bootstrap` or org patterns instead.
4. E2E specs waiting for `/console` must wait for `/bootstrap` or `/o` → Nexus.

---

## 4. Non-goals

- Replacing email verification or invitation acceptance flows (URLs unchanged except revalidation targets).
- Mounting full **`WorkbenchShell`** on `/bootstrap` (bootstrap uses lighter account/workbench chrome).
- Renaming route slug `nexus` or audit prefixes (ADR-0001 §2 stable identifier hierarchy).
- Compatibility redirects for retired `/console` URLs.
