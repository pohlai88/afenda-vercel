import "server-only"

import { after } from "next/server"
import { getTranslations } from "next-intl/server"

import { recordRecentVisit } from "#features/rail-memory/server"

import { organizationAdminPath } from "../constants"

/**
 * Server-only helper that records a single org-admin page visit into
 * the operator's Working Memory Rail recents.
 *
 * Why colocated here instead of inline at each page:
 *
 *   1. Every admin page recording would otherwise repeat 8 lines of
 *      boilerplate (after-wrap, recordRecentVisit shape, locale lookup,
 *      href computation). Centralizing keeps page files focused on
 *      composition and lets `tests/unit/org-admin-contract.test.ts`
 *      add a single segment-coverage assertion later.
 *
 *   2. The `getTranslations("OrgAdmin.rail.recentsLabels")` lookup is
 *      `React.cache`-deduped per request, but the segment → resourceType
 *      mapping is the only place we want to stamp `org_admin_<segment>`
 *      strings — keeping it private here means the resourceType vocab
 *      cannot drift across pages.
 *
 *   3. The actual write fires inside `after(...)` so the page response
 *      streams to the browser without waiting on the recents INSERT.
 *      The writer itself rate-limits at 30s per (org, user, workbench,
 *      resource), so even a navigation burst fans out to a single row.
 *
 * **Best-effort.** A recents write failure must NOT break the page —
 * `recordRecentVisit` already returns a closed-set result and never
 * throws on DB hiccups; the `after` callback drops the failure on the
 * floor (the writer itself logs / counters it in a follow-up).
 *
 * **Audit boundary.** Recents are NOT audited. `iam_audit_event` is
 * reserved for authority change; recents would dwarf legitimate IAM
 * rows. See `lib/features/rail-memory/data/recent.mutations.server.ts`.
 */

/**
 * Whitelist of org-admin URL segments the recents helper recognizes.
 * Mirrors the capability registry's `primarySegment` values plus
 * `overview`. Adding a new admin page that should record visits
 * requires extending this union AND `SEGMENT_RESOURCE_TYPES` below;
 * the `satisfies` clause flags any drift at compile time.
 */
export type OrgAdminRecentSegment =
  | "overview"
  | "members"
  | "audit"
  | "integrations"
  | "settings"

/**
 * Stable `iam_audit_event.resourceType`-style strings for recents.
 * Distinct from the audit `resourceType` namespace — recents write to
 * `rail_recent_item.resourceType`, which is its own taxonomy. We use
 * `org_admin_<segment>` so a future log-drain query can grep recents
 * by workbench surface without confusing them with audit rows.
 */
const SEGMENT_RESOURCE_TYPES = {
  overview: "org_admin_overview",
  members: "org_admin_members",
  audit: "org_admin_audit",
  integrations: "org_admin_integrations",
  settings: "org_admin_settings",
} as const satisfies Record<OrgAdminRecentSegment, string>

export type OrgAdminRecentSessionContext = {
  readonly organizationId: string
  readonly userId: string
}

/**
 * Records an admin page visit into the operator's recents. Returns a
 * Promise so callers `await` it inside their RSC function (the actual
 * INSERT is deferred via `after`). Idempotent within the rate-limit
 * window — repeated calls for the same `(org, user, workbench, segment)`
 * inside `RAIL_RECENT_RATE_LIMIT_SECONDS` (30s) collapse to a single
 * row in the table.
 */
export async function recordOrgAdminPageVisit({
  orgSession,
  orgSlug,
  segment,
}: {
  orgSession: OrgAdminRecentSessionContext
  orgSlug: string
  segment: OrgAdminRecentSegment
}): Promise<void> {
  const t = await getTranslations("OrgAdmin.rail.recentsLabels")
  const label = t(segment)
  const href = organizationAdminPath(orgSlug, segment)
  const resourceType = SEGMENT_RESOURCE_TYPES[segment]

  after(() =>
    recordRecentVisit({
      organizationId: orgSession.organizationId,
      userId: orgSession.userId,
      workbenchId: "org-admin",
      resourceType,
      href,
      label,
    })
  )
}
