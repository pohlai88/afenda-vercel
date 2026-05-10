# ADR-0003 — Post-login loading bay and Nexus routing


| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-10 |
| **Supersedes** | Prior assumption that org bootstrap lives at a dedicated `/onboarding` gate route before any operational surface. |
| **Does not supersede** | **ADR-0001** (Spatial OS L1–L4, materials, command pipeline target). **locale-first routing**, **tenant/session authority**, **`proxy.ts` narrow gate**, **Server Actions**, **IAM audit**, **`AGENTS.md` §6 import boundaries**. |
| **Implements in code** | `/{locale}/console` (no-org loading bay), `/{locale}/o/{orgSlug}/nexus` (with-org Nexus field), `next.config.ts` redirect `/:locale/onboarding` → `/:locale/console`, `lib/auth/callback-path.ts`, `lib/auth/auth-status-copy.ts`, `components/console/console-bootstrap-form.tsx`, `components/console/console-pending-invites.tsx` |
| **Related rules** | `.cursor/rules/i18n-directory.mdc` · `.cursor/rules/nextjs-best-practices.mdc` §2 (Tier A/B) · ADR-0001 §3 (layer roles) |

---

## 1. Context

Operators need a single mental model after authentication: **land, orient, choose the next move**. A separate pre-Nexus gate route (`/onboarding`) fragments that model and forces users through a linear funnel before they ever see the operational loading bay.

This ADR defines **two complementary loading bays** — one without an active organization and one with — both reachable **only post-login** (session-validated). Bootstrap work (create first org, review invitations) is **content inside the no-org bay**, not a prerequisite URL silo.

Spatial OS chrome (L1 utility bar, L4 dock target, command layer) remains mounted only under org-scoped layouts per ADR-0001; the console bay is intentionally lighter-weight IAM chrome.

---

## 2. Decision

### 2.1 Two loading bays

| Bay | Locale-internal URL | Authority | Purpose |
|-----|---------------------|-----------|---------|
| **No-org bay** | `/console` | `requireSignedInSession()` in `[locale]/console/layout.tsx` | Pending invitations, create first organization, multi-org picker |
| **With-org bay (Nexus field)** | `/o/{orgSlug}/nexus` | `requireOrgSession()` under `[locale]/o/[orgSlug]/layout.tsx` + `NexusShell` | Orientation, pressure, truth map, lanes — decide next surface |

### 2.2 Post-login defaults

- **`defaultPostAuthPath(locale)`** resolves to **`/console`** (locale-prefixed via `toLocalePath`). New sessions without org context land on the no-org bay.
- **`ORG_REQUIRED` interruption** primary CTA targets **`/console`**, not `/onboarding`.
- Sign-in may still default `callbackUrl` to **`/o`** as the **dispatcher**: with active org + membership → org resolver redirects to `/o/{slug}/nexus`; without org → interruption → `/console`.

### 2.3 Legacy `/onboarding` URL

Permanent redirect **`/:locale/onboarding` → `/:locale/console`** in `next.config.ts` (Next.js `redirects` — evaluated before `proxy.ts`). Bookmarks and external links keep working.

The IAM route tree `app/[locale]/(iam)/onboarding/**` is **removed**; bootstrap UI lives under `components/console/`.

### 2.4 Relationship to ADR-0001 (Nexus)

- Nexus **field** content stays at `/o/{orgSlug}/nexus`.
- Console is **not** L1–L4 Spatial OS; it is an authenticated **account/org bootstrap bay**. ADR-0001 L1 non-authority and dock contracts apply when `NexusShell` is mounted.

---

## 3. Consequences

1. Product copy and docs should describe **Console** / **Nexus** loading bays, not a separate “onboarding portal” URL for first-run (unless referring to the bootstrap *phase* inside Console).
2. `AGENTS.md` and proxy path lists must list `/console` as the org-bootstrap entry; `/onboarding` is redirect-only.
3. Server Actions that revalidated `/onboarding` must revalidate `/console` instead.
4. E2E specs waiting for `/onboarding` must wait for `/console` (or `/o` → Nexus).

---

## 4. Non-goals

- Replacing email verification or invitation acceptance flows (URLs unchanged except revalidation targets).
- Mounting full `NexusShell` on `/console`.
- Renaming route slug `nexus` or audit prefixes (ADR-0001 §2 stable identifier hierarchy).
