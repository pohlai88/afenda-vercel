import type { ReactNode } from "react"
import { z } from "zod"

import type { WorkbenchRailMode } from "../workbench-rail-collapse-context"

/**
 * Runtime contract for `WorkbenchRail` slot data.
 *
 * This schema is the **governance kernel** for the rail. The TypeScript
 * surface below is derived from it via `z.infer<>`,
 * so adding or removing a slot field here is the only way to change the
 * rail contract — per-workbench rail-slot builders are pure mappers that
 * cannot synthesize fields the schema does not declare.
 *
 * Rail configuration may flow from registry-derived RSC builders today
 * (`buildAccountRailSlotsV2`, `buildOrgAdminRailSlots`, etc.) but tomorrow
 * will compose with permission filtering, tenant policy, and remote
 * feature manifests. TypeScript catches drift at build time; these Zod
 * schemas catch it at runtime when the data crosses an untrusted boundary.
 *
 * `WorkbenchRailSlots.footer` is intentionally excluded — it is a
 * `ReactNode` and cannot be expressed in Zod. See `WorkbenchRailSlots`
 * below for the composed type that adds `footer`.
 */

// ---------------------------------------------------------------------------
// Icon registry — the source of truth for serializable nav icon tokens.
// The client rail resolves each id to a Lucide component.
// ---------------------------------------------------------------------------

export const WORKBENCH_RAIL_NAV_ICON_IDS = [
  "activity",
  "briefcase",
  "building",
  "building-2",
  "calendar",
  "clock",
  "file-text",
  "key-round",
  "layout-dashboard",
  "list",
  "messages-square",
  "monitor-smartphone",
  "plug",
  "settings",
  "shield",
  "shield-check",
  "shopping-bag",
  "user-round",
  "users",
] as const

export const workbenchRailNavIconIdSchema = z.enum(WORKBENCH_RAIL_NAV_ICON_IDS)

// ---------------------------------------------------------------------------
// Tone vocabulary — feeds nav badge tones (Phase 2 promotes `tone` to required
// on `workbenchRailNavBadgeSchema`; see docs/_draft/working-memory-rail-plan.md
// sect 10 anti-patterns). The standalone tone enum was retired in Phase 1
// along with `workbenchRailIdentityPillSchema` and the context strip.
// ---------------------------------------------------------------------------

const WORKBENCH_RAIL_TONE_KEYS = ["default", "positive", "attention"] as const

/** Nav-item badges: adds `critical` for blocking pressure (e.g. failed runs). */
export const WORKBENCH_RAIL_BADGE_TONE_KEYS = [
  ...WORKBENCH_RAIL_TONE_KEYS,
  "critical",
] as const

export const workbenchRailBadgeToneSchema = z.enum(
  WORKBENCH_RAIL_BADGE_TONE_KEYS
)

// ---------------------------------------------------------------------------
// Active-state matching strategy — replaces ad hoc `pathname.startsWith`
// guesses across consumers.
// ---------------------------------------------------------------------------

/** How `href` (and `activePatterns`) are tested against the current pathname. */
export const WORKBENCH_RAIL_ACTIVE_MATCH_KEYS = ["exact", "prefix"] as const

export const workbenchRailActiveMatchSchema = z.enum(
  WORKBENCH_RAIL_ACTIVE_MATCH_KEYS
)

// ---------------------------------------------------------------------------
// Identity
//
// `.strict()` is intentional: the schema is the governance kernel. Phase 1
// retired `pills` (decorative status duplication) and `description`
// (marketing filler on `labels`). Strict object parsing refuses stale
// registry payloads, remote manifests, or builder regressions that try
// to resurrect them — Zod silently strips unknown keys otherwise, which
// would let drift creep back in without anyone noticing.
// ---------------------------------------------------------------------------

export const workbenchRailIdentitySchema = z
  .object({
    initial: z.string().trim().min(1).max(3),
    primary: z.string().trim().min(1),
    secondary: z.string().trim().optional(),
    href: z.string().trim().optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Nav items + sections
// ---------------------------------------------------------------------------

/**
 * Phase 2 of the Working Memory Rail migration promoted `tone` from optional
 * to required: every emitted badge must carry semantic urgency. Operators
 * read tone (color) before integer count, so a builder that emits a raw
 * number with no tone is a doctrine violation — the kernel refuses it at
 * parse time. `count` stays optional so marker-dot badges (no number) remain
 * valid; thresholds in per-module `*-rail-pressure.shared.ts` derive tone
 * from raw counts + age buckets + SLA buckets.
 *
 * `.strict()` blocks accidental extra keys (e.g. resurrected `label`,
 * `description`) that would re-introduce decorative drift.
 */
export const workbenchRailNavBadgeSchema = z
  .object({
    count: z.number().int().nonnegative().optional(),
    tone: workbenchRailBadgeToneSchema,
  })
  .strict()

const workbenchRailNavLinkTargetSchema = {
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  description: z.string().trim().optional(),
  href: z.string().trim().min(1),
  /** Caller-forced active flag. Bypasses `match` / `activePatterns`. */
  active: z.boolean().optional(),
  /**
   * Match strategy applied to `href` and any `activePatterns`.
   * Defaults to `"prefix"` for backward compatibility with the previous
   * `pathname === href || pathname.startsWith(href + "/")` heuristic.
   */
  match: workbenchRailActiveMatchSchema.optional(),
  /**
   * Extra pathnames that should mark this item active. Useful when a
   * single rail item covers multiple URLs (e.g. detail-page sub-routes
   * that share an index entry, or aliases under a feature flag).
   */
  activePatterns: z.array(z.string().trim().min(1)).optional(),
}

export const workbenchRailNavChildItemSchema = z
  .object(workbenchRailNavLinkTargetSchema)
  .strict()

export const workbenchRailNavItemSchema = z
  .object({
    ...workbenchRailNavLinkTargetSchema,
    icon: workbenchRailNavIconIdSchema,
    badge: workbenchRailNavBadgeSchema.optional(),
    /**
     * Optional second-level links rendered as a shadcn-style nested sidebar
     * menu. Children are links only; icons and badges stay on the primary row.
     */
    items: z.array(workbenchRailNavChildItemSchema).min(1).optional(),
  })
  .strict()

export const workbenchRailNavSectionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  items: z.array(workbenchRailNavItemSchema),
  collapsible: z.boolean().optional(),
  defaultCollapsed: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Working Memory Rail (Phase 3a) — inbox, pinned, views, recents.
//
// Each slot answers exactly one operator question:
//
//   inbox   → "What needs me right now?"     (single pressure summary)
//   pinned  → "Which records am I working with?" (operator-authored)
//   views   → "What queries do I run repeatedly?" (filtered URL saves)
//   recents → "Where was I just at?"          (activity-derived)
//
// Conditional density is enforced **at the kernel**: arrays demand at
// least one entry, and the inbox count must be positive. Builders that
// have nothing to surface must omit the slot entirely instead of
// emitting an empty array or a `count: 0` placeholder. This is the
// schema-level guarantee that empty memory does not render decorative
// chrome.
// ---------------------------------------------------------------------------

/**
 * Single-summary inbox slot (e.g. "12 pending invitations"). `count` must
 * be ≥ 1 — a zero-count inbox is conceptually a "Ready" tautology and
 * must be omitted by the builder, not rendered as silent noise. `tone`
 * mirrors the nav-badge vocabulary so operators read the same urgency
 * cues across the rail.
 */
export const workbenchRailInboxSchema = z
  .object({
    label: z.string().trim().min(1),
    count: z.number().int().positive(),
    href: z.string().trim().min(1),
    tone: workbenchRailBadgeToneSchema,
  })
  .strict()

/**
 * Operator-pinned record. `id` is the `rail_pinned_item.id` so the
 * client can address unpin/reorder mutations to a specific row.
 * `resourceType` / `resourceId` mirror the DB columns and let the UI
 * group pinned records visually by domain (e.g. employees vs. members).
 */
export const workbenchRailPinSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    href: z.string().trim().min(1),
    icon: workbenchRailNavIconIdSchema.optional(),
    resourceType: z.string().trim().min(1),
    resourceId: z.string().trim().min(1),
  })
  .strict()

/**
 * Operator-saved view (a named filtered URL). The `href` carries the
 * query string the operator persisted; the rail only ever links to it.
 */
export const workbenchRailViewSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    href: z.string().trim().min(1),
    icon: workbenchRailNavIconIdSchema.optional(),
  })
  .strict()

/**
 * Canonical audit-namespace prefixes — recents may **not** carry labels
 * that look like raw audit action strings. Per the
 * `working-memory-rail-plan.md` §10 anti-pattern guardrail #3:
 *
 *   "Recents are continuity memory, not audit logs. Human / compressed /
 *    narrative labels."
 *
 * Mirrors `ORG_ADMIN_EVENT_NAMESPACES` in `lib/features/org-admin/constants.ts`
 * (the authoritative repo-wide list). The kernel duplicates it because
 * `components/workbench/left-nav-rail/` sits below `lib/features/` in the import
 * graph — direction-of-dependency must stay leaf → root. If the
 * namespace list ever changes, both files must update together; the
 * fixtures-parity unit test guards against drift.
 *
 * Whole-token match (with a `.` boundary) — "ergonomics" is human, but
 * "erp.contact.record.create" is an audit string and refused.
 */
export const WORKBENCH_RAIL_FORBIDDEN_LABEL_NAMESPACES = [
  "iam",
  "org",
  "erp",
  "governance",
  "integration",
  "workflow",
  "system",
] as const

function isAuditNamespaceLabel(value: string): boolean {
  const trimmed = value.trimStart()
  return WORKBENCH_RAIL_FORBIDDEN_LABEL_NAMESPACES.some((prefix) =>
    trimmed.startsWith(`${prefix}.`)
  )
}

/**
 * Activity-derived recent visit. `resourceId` is optional — list-level
 * surfaces (e.g. "Members" index page) have a stable href but no record
 * id. `occurredAt` is an ISO 8601 string to keep the slot serializable
 * across the RSC → client boundary; relative-time rendering happens on
 * the client. Builders cap the array length at 5 per the
 * `working-memory-rail-plan.md` §5 doctrine.
 *
 * `label` carries an extra refinement: it must read as *operator
 * memory*, not as a raw audit action string. See the comment on
 * `WORKBENCH_RAIL_FORBIDDEN_LABEL_NAMESPACES` for the doctrinal
 * reasoning.
 */
export const workbenchRailRecentSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z
      .string()
      .trim()
      .min(1)
      .refine((value) => !isAuditNamespaceLabel(value), {
        message:
          "Recents carry continuity memory, not audit action strings. " +
          "Use a human label (e.g. 'Aisha Khan · viewed 12m ago').",
      }),
    href: z.string().trim().min(1),
    icon: workbenchRailNavIconIdSchema.optional(),
    resourceType: z.string().trim().min(1),
    resourceId: z.string().trim().min(1).optional(),
    occurredAt: z.string().trim().datetime(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Slots (data only — `footer: ReactNode` lives on the composed type)
// ---------------------------------------------------------------------------

export const workbenchRailSlotsDataSchema = z
  .object({
    identity: workbenchRailIdentitySchema.optional(),
    nav: z.array(workbenchRailNavSectionSchema),
    /**
     * Working Memory Rail slots (Phase 3a). All optional; an absent slot
     * means "nothing in this operator's memory for this workbench right
     * now." Arrays are non-empty by contract: empty memory must be
     * expressed by omitting the slot key entirely so the rail UI never
     * renders a hollow "Pinned (0)" frame.
     */
    inbox: workbenchRailInboxSchema.optional(),
    pinned: z.array(workbenchRailPinSchema).min(1).optional(),
    views: z.array(workbenchRailViewSchema).min(1).optional(),
    recents: z.array(workbenchRailRecentSchema).min(1).max(5).optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

/**
 * Phase 3c (Working Memory Rail UI sections) extends `labels` with four
 * optional copy keys for the per-section affordances. Rendering is gated
 * by slot presence — empty memory hides the heading entirely — so callers
 * that have not yet wired pinned / views / recents slot data can omit the
 * keys and the rail still parses cleanly. Once the reference workbench
 * (PR 3d, org-admin) wires real slot data, the matching label keys
 * become operationally required *for that workbench only*; the kernel
 * keeps them optional + falls back to permanent English literals so a
 * builder regression cannot leave a heading-less section in production.
 *
 * `inboxAriaLabel` is the **regional** accessible name on the
 * `<section aria-label>` wrapping the single inbox row (the visible
 * label is always `inbox.label` from slot data). The three section
 * headings are uppercase chrome strings rendered above the row list
 * (`PINNED` / `VIEWS` / `RECENT`).
 */
export const workbenchRailLabelsSchema = z
  .object({
    ariaLabel: z.string().min(1),
    collapseLabel: z.string().min(1),
    expandLabel: z.string().min(1),
    /** Primary nav filter (expanded rail). */
    navSearchPlaceholder: z.string().min(1).optional(),
    /** Accessible name on the filter field. */
    navSearchAriaLabel: z.string().min(1).optional(),
    /** Icon trigger when the rail is collapsed. */
    navSearchCollapsedTriggerAriaLabel: z.string().min(1).optional(),
    /** Shown inside `<nav>` when a filter removes every primary link. */
    navSearchNoMatches: z.string().min(1).optional(),
    /** Shown in the nav region when permission filtering removes every item. */
    emptyState: z.string().optional(),
    /** Working Memory Rail (Phase 3c) — section affordance copy. */
    inboxAriaLabel: z.string().min(1).optional(),
    pinnedHeading: z.string().min(1).optional(),
    viewsHeading: z.string().min(1).optional(),
    recentsHeading: z.string().min(1).optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Parsers — call from RSC layouts when slot data crosses untrusted
// boundaries (registry config files, remote manifests, CMS payloads).
// ---------------------------------------------------------------------------

export function parseWorkbenchRailSlotsData(
  value: unknown
): z.infer<typeof workbenchRailSlotsDataSchema> {
  return workbenchRailSlotsDataSchema.parse(value)
}

export function parseWorkbenchRailLabels(
  value: unknown
): z.infer<typeof workbenchRailLabelsSchema> {
  return workbenchRailLabelsSchema.parse(value)
}

export function parseWorkbenchRailNavItem(
  value: unknown
): z.infer<typeof workbenchRailNavItemSchema> {
  return workbenchRailNavItemSchema.parse(value)
}

export function parseWorkbenchRailNavChildItem(
  value: unknown
): z.infer<typeof workbenchRailNavChildItemSchema> {
  return workbenchRailNavChildItemSchema.parse(value)
}

export function parseWorkbenchRailInbox(
  value: unknown
): z.infer<typeof workbenchRailInboxSchema> {
  return workbenchRailInboxSchema.parse(value)
}

export function parseWorkbenchRailPin(
  value: unknown
): z.infer<typeof workbenchRailPinSchema> {
  return workbenchRailPinSchema.parse(value)
}

export function parseWorkbenchRailView(
  value: unknown
): z.infer<typeof workbenchRailViewSchema> {
  return workbenchRailViewSchema.parse(value)
}

export function parseWorkbenchRailRecent(
  value: unknown
): z.infer<typeof workbenchRailRecentSchema> {
  return workbenchRailRecentSchema.parse(value)
}

export type WorkbenchRailNavIconId = z.infer<
  typeof workbenchRailNavIconIdSchema
>

export type WorkbenchRailBadgeTone = z.infer<
  typeof workbenchRailBadgeToneSchema
>

export type WorkbenchRailActiveMatch = z.infer<
  typeof workbenchRailActiveMatchSchema
>

export type WorkbenchRailIdentity = z.infer<typeof workbenchRailIdentitySchema>

export type WorkbenchRailNavBadge = z.infer<typeof workbenchRailNavBadgeSchema>

export type WorkbenchRailNavChildItem = z.infer<
  typeof workbenchRailNavChildItemSchema
>

export type WorkbenchRailNavItem = z.infer<typeof workbenchRailNavItemSchema>

export type WorkbenchRailNavSection = z.infer<
  typeof workbenchRailNavSectionSchema
>

export type WorkbenchRailInbox = z.infer<typeof workbenchRailInboxSchema>
export type WorkbenchRailPin = z.infer<typeof workbenchRailPinSchema>
export type WorkbenchRailView = z.infer<typeof workbenchRailViewSchema>
export type WorkbenchRailRecent = z.infer<typeof workbenchRailRecentSchema>

export type WorkbenchRailSlots = z.infer<
  typeof workbenchRailSlotsDataSchema
> & {
  footer?: ReactNode
}

export type WorkbenchRailLabels = z.infer<typeof workbenchRailLabelsSchema>

export type WorkbenchRailProps = {
  slots: WorkbenchRailSlots
  labels: WorkbenchRailLabels
  collapsed: boolean
  interactionMode?: WorkbenchRailMode
  assignNavLandmarkId?: boolean
}
