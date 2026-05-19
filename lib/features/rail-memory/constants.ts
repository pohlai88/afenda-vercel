import {
  toLocaleOrgAdminRevalidatePattern,
  toLocaleOrgAppsRevalidatePattern,
  toLocaleOrgIamProfileRevalidatePattern,
  toLocaleRoutePattern,
} from "#lib/i18n/locales.shared"
import type { AppPath } from "#lib/i18n/locales.shared"

/**
 * Working Memory Rail — kernel constants.
 *
 * Doctrinal anchor: `docs/_draft/working-memory-rail-plan.md` §10.3 +
 * `AGENTS.md` §5 (Workbench runtime / IAM audit policy / locale-first
 * surface). Phase 3a shipped the Drizzle tables (`drizzle/0023_*`) and
 * the four kernel Zod schemas. Phase 3b — this module — owns the
 * Server Actions + queries + the `WorkbenchId` typed union.
 *
 * Kernel rules encoded here:
 *
 *   1. **`WorkbenchId` is a closed, typed union.** DB columns stay
 *      `text` for migration ergonomics, but every reader and writer in
 *      the app graph narrows through `isWorkbenchId` so adding a new
 *      workbench is a compile-time + tuple-level event, not a
 *      string-literal sprinkle.
 *
 *   2. **Audit action strings are the public contract.** Hoisted as
 *      named exports (`RAIL_MEMORY_AUDIT_ACTIONS`) so writers + log
 *      drains + dashboards never drift from a hand-typed magic string.
 *      The same drift-prevention pattern Phase 3T / 3U used for
 *      compliance pack export / regenerate.
 *
 *   3. **Recents are throughput-bounded, not audited.** App-side cap is
 *      5 surfaced after dedupe, query sample is 50 to keep dedupe cheap,
 *      retention target is 25 (cron pruning lives elsewhere). The
 *      writer rate-limits at 30s per (org × user × workbench × resource)
 *      so a navigation burst doesn't fan out into 20 audit-grade-noisy
 *      INSERTs. **`rail_recent_item` writes are not audited** — high
 *      frequency would dwarf legitimate IAM events; track via OTEL
 *      counters when telemetry lands.
 */

// ---------------------------------------------------------------------------
// WorkbenchId — the typed union (open question Q3 lock-in)
// ---------------------------------------------------------------------------

/**
 * Stable identifier for each post-login shell surface. Adding a
 * workbench requires extending **both** the union below **and** the
 * `WORKBENCH_IDS` tuple — the `satisfies` clause makes the compiler
 * reject any drift between them.
 *
 * Choice of strings mirrors the URL segment / module slug so log drains
 * and audit metadata stay grep-able:
 *
 *   - `account`         → `/{locale}/o/{orgSlug}/iam-profile/*` (IAM personal surface).
 *                       The DB column literal stays `account` so existing rows
 *                       and Drizzle migrations remain stable across the IAM
 *                       profile URL rename (ADR-0029).
 *   - `org-admin`       → `/{locale}/o/{orgSlug}/admin/*`
 *   - `hrm`             → `/{locale}/o/{orgSlug}/apps/hrm/*`
 *   - `platform-admin`  → `/{locale}/platform/*`
 *
 * Per-ERP-module workbenches will join this union as they adopt the
 * Working Memory Rail (PR 3e roll-out). Until then they should NOT be
 * pre-registered: a workbench id without a matching rail-slot builder
 * is dead vocabulary.
 */
export type WorkbenchId = "account" | "org-admin" | "hrm" | "platform-admin"

/**
 * Const tuple of every legal `WorkbenchId`. The `satisfies` clause
 * guarantees the tuple matches the union exactly — drop a member from
 * either side and `tsc` flags the other.
 */
export const WORKBENCH_IDS = [
  "account",
  "org-admin",
  "hrm",
  "platform-admin",
] as const satisfies readonly WorkbenchId[]

/** Type predicate — narrows untrusted strings (Server Action input, DB columns). */
export function isWorkbenchId(value: unknown): value is WorkbenchId {
  return (
    typeof value === "string" &&
    (WORKBENCH_IDS as readonly string[]).includes(value)
  )
}

// ---------------------------------------------------------------------------
// Recent visit caps + rate limiter
// ---------------------------------------------------------------------------

/**
 * Surface cap — number of recents the rail renders after dedupe by
 * `(resourceType, resourceId | __list__:href)`. Matches the
 * `working-memory-rail-plan.md` §3.4 / §5 design — operators read the
 * 5 most-recently-touched records per workbench, not a long list.
 */
export const RAIL_RECENT_SURFACE_LIMIT = 5

/**
 * Query sample size — fetched per request before in-memory dedupe.
 * Sized so a busy operator visiting the same record many times still
 * surfaces 5 distinct entries; the table's lookup index keeps the
 * sample SELECT O(log n).
 */
export const RAIL_RECENT_QUERY_LIMIT = 50

/**
 * Retention target — cron pruning beyond this per (org, user,
 * workbench) keeps the table bounded for high-traffic operators.
 * Pruning itself is owned by a future cron route (not this module).
 */
export const RAIL_RECENT_RETENTION_LIMIT = 25

/**
 * Recent visit rate limiter — if a row already exists for the same
 * `(org, user, workbench, resourceType, resourceId)` within this
 * window, `recordRecentVisit` is a no-op. Prevents a navigation burst
 * (e.g. tab → detail → tab → detail) from fanning out N rows per
 * second. **Not** an audit guarantee — recents are not audited; this
 * exists purely to keep the table cheap.
 */
export const RAIL_RECENT_RATE_LIMIT_SECONDS = 30

// ---------------------------------------------------------------------------
// Pin caps
// ---------------------------------------------------------------------------

/**
 * Per-(org, user, workbench) pin cap. Doctrinal: the rail must stay
 * scannable — operators with 80 pins do not have a "memory rail," they
 * have a sidebar. `pinRecordAction` rejects new pins past this cap
 * with a clear error code so the UI can offer "unpin first."
 */
export const RAIL_PIN_LIMIT_PER_WORKBENCH = 30

/**
 * Per-(org, user, workbench) saved-view cap. Same rationale — saved
 * views past this point are noise, not memory.
 */
export const RAIL_VIEW_LIMIT_PER_WORKBENCH = 30

// ---------------------------------------------------------------------------
// Audit action grammar — stable strings (public contract)
// ---------------------------------------------------------------------------

/**
 * Canonical IAM audit action strings. Single source of truth for
 * writers (Server Actions in this module), readers (admin audit
 * dashboard, log drains), and AGENTS.md examples.
 *
 * `iam.workbench.*` namespace per AGENTS §5 — **personal operator
 * state**, not ERP business state. Tier B (member-default) gate.
 *
 * Recent visits are intentionally absent: recents are throughput data,
 * not authority change.
 */
export const RAIL_MEMORY_AUDIT_ACTIONS = {
  PIN_CREATE: "iam.workbench.pin.create",
  PIN_DELETE: "iam.workbench.pin.delete",
  PIN_REORDER: "iam.workbench.pin.reorder",
  VIEW_CREATE: "iam.workbench.view.create",
  VIEW_UPDATE: "iam.workbench.view.update",
  VIEW_DELETE: "iam.workbench.view.delete",
} as const

export type RailMemoryAuditAction =
  (typeof RAIL_MEMORY_AUDIT_ACTIONS)[keyof typeof RAIL_MEMORY_AUDIT_ACTIONS]

/**
 * Resource types written into `iam_audit_event.resourceType` for the
 * pin/view audit rows. Mirrors the Drizzle table names so log drains
 * can join back to the row that the audit references.
 */
export const RAIL_MEMORY_RESOURCE_TYPES = {
  PIN: "rail_pinned_item",
  VIEW: "rail_saved_view",
} as const

export type RailMemoryResourceType =
  (typeof RAIL_MEMORY_RESOURCE_TYPES)[keyof typeof RAIL_MEMORY_RESOURCE_TYPES]

// ---------------------------------------------------------------------------
// Cache revalidation patterns
// ---------------------------------------------------------------------------

/**
 * Maps each `WorkbenchId` to the `revalidatePath` pattern that covers
 * its rail surface. After a pin / view mutation the action revalidates
 * at **layout** scope so the rail's RSC subtree re-fetches
 * `listPinnedForUser` / `listSavedViewsForUser` for the next request.
 * Page-scope revalidation would miss the rail because it lives in the
 * workbench `layout.tsx`, not the page.
 *
 * Patterns include every locale + every org slug — matches the standard
 * pattern in `lib/i18n/locales.shared.ts`. Adding a new workbench to
 * `WORKBENCH_IDS` requires adding a row here; the `satisfies` clause
 * makes `tsc` flag the omission at compile time.
 */
export const WORKBENCH_REVALIDATE_PATTERNS = {
  account: toLocaleOrgIamProfileRevalidatePattern(""),
  "org-admin": toLocaleOrgAdminRevalidatePattern(""),
  hrm: toLocaleOrgAppsRevalidatePattern("/hrm"),
  "platform-admin": toLocaleRoutePattern("/platform"),
} as const satisfies Record<WorkbenchId, AppPath>
