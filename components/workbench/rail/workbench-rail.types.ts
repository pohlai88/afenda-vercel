import type { ReactNode } from "react"
import type { z } from "zod"

import type {
  workbenchRailActiveMatchSchema,
  workbenchRailBadgeToneSchema,
  workbenchRailIdentitySchema,
  workbenchRailInboxSchema,
  workbenchRailLabelsSchema,
  workbenchRailNavBadgeSchema,
  workbenchRailNavIconIdSchema,
  workbenchRailNavItemSchema,
  workbenchRailNavSectionSchema,
  workbenchRailPinSchema,
  workbenchRailRecentSchema,
  workbenchRailSlotsDataSchema,
  workbenchRailViewSchema,
} from "./workbench-rail.schema"

/**
 * Type surface for `WorkbenchRail`. All shapes are derived from the Zod
 * schemas in `workbench-rail.schema.ts` so the build-time and runtime
 * contracts stay in lock-step.
 *
 * Serializable nav-icon tokens cross the RSC → client boundary; the
 * Lucide resolution happens only inside the client `WorkbenchRail`.
 */

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

export type WorkbenchRailNavItem = z.infer<typeof workbenchRailNavItemSchema>

export type WorkbenchRailNavSection = z.infer<
  typeof workbenchRailNavSectionSchema
>

// Working Memory Rail (Phase 3a) — per-user, per-workbench operator memory.
export type WorkbenchRailInbox = z.infer<typeof workbenchRailInboxSchema>
export type WorkbenchRailPin = z.infer<typeof workbenchRailPinSchema>
export type WorkbenchRailView = z.infer<typeof workbenchRailViewSchema>
export type WorkbenchRailRecent = z.infer<typeof workbenchRailRecentSchema>

/**
 * Composed slots — schema-validated data plus the React-only `footer` slot
 * (a `ReactNode` such as `<SignOutButton />`). The footer is intentionally
 * not part of the Zod contract because RSC props that contain rendered
 * trees cannot be re-validated client-side.
 */
export type WorkbenchRailSlots = z.infer<
  typeof workbenchRailSlotsDataSchema
> & {
  footer?: ReactNode
}

export type WorkbenchRailLabels = z.infer<typeof workbenchRailLabelsSchema>

export type WorkbenchRailProps = {
  slots: WorkbenchRailSlots
  labels: WorkbenchRailLabels
  /** Persisted collapse state, managed by parent shell */
  collapsed: boolean
  /**
   * When false, the `<nav>` omits `id={WORKBENCH_RAIL_NAV_DOM_ID}` so a second
   * rail instance (e.g. mobile sheet) does not duplicate the landmark id used
   * by the L1 collapse control (`aria-controls`).
   */
  assignNavLandmarkId?: boolean
}
