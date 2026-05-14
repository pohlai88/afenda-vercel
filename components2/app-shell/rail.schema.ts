import type { ReactNode } from "react"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Icon registry — serializable token → Lucide component resolved at render.
// ---------------------------------------------------------------------------

export const APP_SHELL_RAIL_NAV_ICON_IDS = [
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

export const appShellRailNavIconIdSchema = z.enum(APP_SHELL_RAIL_NAV_ICON_IDS)

// ---------------------------------------------------------------------------
// Badge tones — semantic urgency, required on every emitted badge.
// ---------------------------------------------------------------------------

export const APP_SHELL_RAIL_BADGE_TONE_KEYS = [
  "default",
  "positive",
  "attention",
  "critical",
] as const

export const appShellRailBadgeToneSchema = z.enum(
  APP_SHELL_RAIL_BADGE_TONE_KEYS
)

// ---------------------------------------------------------------------------
// Active-match strategy — replaces ad-hoc pathname.startsWith guesses.
// ---------------------------------------------------------------------------

export const appShellRailActiveMatchSchema = z.enum(["exact", "prefix"])

// ---------------------------------------------------------------------------
// Nav items + sections
// ---------------------------------------------------------------------------

const navLinkTargetSchema = {
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  description: z.string().trim().optional(),
  href: z.string().trim().min(1),
  active: z.boolean().optional(),
  match: appShellRailActiveMatchSchema.optional(),
  activePatterns: z.array(z.string().trim().min(1)).optional(),
}

export const appShellRailNavBadgeSchema = z
  .object({
    count: z.number().int().nonnegative().optional(),
    tone: appShellRailBadgeToneSchema,
  })
  .strict()

export const appShellRailNavChildItemSchema = z
  .object(navLinkTargetSchema)
  .strict()

export const appShellRailNavItemSchema = z
  .object({
    ...navLinkTargetSchema,
    icon: appShellRailNavIconIdSchema,
    badge: appShellRailNavBadgeSchema.optional(),
    items: z.array(appShellRailNavChildItemSchema).min(1).optional(),
  })
  .strict()

export const appShellRailNavSectionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  items: z.array(appShellRailNavItemSchema),
  collapsible: z.boolean().optional(),
  defaultCollapsed: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Working Memory Rail slots
// ---------------------------------------------------------------------------

export const appShellRailViewSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    href: z.string().trim().min(1),
    icon: appShellRailNavIconIdSchema.optional(),
  })
  .strict()

export const appShellRailRecentSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    href: z.string().trim().min(1),
    icon: appShellRailNavIconIdSchema.optional(),
    resourceType: z.string().trim().min(1),
    resourceId: z.string().trim().min(1).optional(),
    occurredAt: z.string().trim().datetime(),
  })
  .strict()

// Zod-serializable slots (no ReactNode).
export const appShellRailSlotsDataSchema = z
  .object({
    nav: z.array(appShellRailNavSectionSchema),
    views: z.array(appShellRailViewSchema).min(1).optional(),
    recents: z.array(appShellRailRecentSchema).min(1).max(5).optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const appShellRailLabelsSchema = z
  .object({
    ariaLabel: z.string().min(1),
    collapseLabel: z.string().min(1),
    expandLabel: z.string().min(1),
    navSearchPlaceholder: z.string().min(1).optional(),
    navSearchAriaLabel: z.string().min(1).optional(),
    navSearchCollapsedTriggerAriaLabel: z.string().min(1).optional(),
    navSearchNoMatches: z.string().min(1).optional(),
    emptyState: z.string().optional(),
    viewsHeading: z.string().min(1).optional(),
    recentsHeading: z.string().min(1).optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type AppShellRailNavIconId = z.infer<typeof appShellRailNavIconIdSchema>
export type AppShellRailBadgeTone = z.infer<typeof appShellRailBadgeToneSchema>
export type AppShellRailNavItem = z.infer<typeof appShellRailNavItemSchema>
export type AppShellRailNavChildItem = z.infer<
  typeof appShellRailNavChildItemSchema
>
export type AppShellRailNavSection = z.infer<
  typeof appShellRailNavSectionSchema
>
export type AppShellRailView = z.infer<typeof appShellRailViewSchema>
export type AppShellRailRecent = z.infer<typeof appShellRailRecentSchema>
export type AppShellLabels = z.infer<typeof appShellRailLabelsSchema>

/** Full slots type — adds `footer: ReactNode` (not Zod-serializable). */
export type AppShellRailSlots = z.infer<typeof appShellRailSlotsDataSchema> & {
  footer?: ReactNode
}

/** Complete rail config passed from layout.tsx to AppShell/AppSubLayout. */
export type AppShellRailConfig = {
  slots: AppShellRailSlots
  labels: AppShellLabels
  /** localStorage key for persisting collapse state. */
  storageKey: string
}
