import type { ReactNode } from "react"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Icon registry — serializable token → Lucide component resolved at render.
// ---------------------------------------------------------------------------

export const APP_SHELL_PRIMARY_LEFT_RAIL_NAV_ICON_IDS = [
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

export const appShellPrimaryLeftRailNavIconIdSchema = z.enum(
  APP_SHELL_PRIMARY_LEFT_RAIL_NAV_ICON_IDS
)

// ---------------------------------------------------------------------------
// Badge tones — semantic urgency, required on every emitted badge.
// ---------------------------------------------------------------------------

export const APP_SHELL_PRIMARY_LEFT_RAIL_BADGE_TONE_KEYS = [
  "default",
  "positive",
  "attention",
  "critical",
] as const

export const appShellPrimaryLeftRailBadgeToneSchema = z.enum(
  APP_SHELL_PRIMARY_LEFT_RAIL_BADGE_TONE_KEYS
)

// ---------------------------------------------------------------------------
// Active-match strategy — replaces ad-hoc pathname.startsWith guesses.
// ---------------------------------------------------------------------------

export const appShellPrimaryLeftRailActiveMatchSchema = z.enum([
  "exact",
  "prefix",
])

// ---------------------------------------------------------------------------
// Nav items + sections
// ---------------------------------------------------------------------------

const navLinkTargetSchema = {
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  description: z.string().trim().optional(),
  href: z.string().trim().min(1),
  active: z.boolean().optional(),
  match: appShellPrimaryLeftRailActiveMatchSchema.optional(),
  activePatterns: z.array(z.string().trim().min(1)).optional(),
}

export const appShellPrimaryLeftRailNavBadgeSchema = z
  .object({
    count: z.number().int().nonnegative().optional(),
    tone: appShellPrimaryLeftRailBadgeToneSchema,
  })
  .strict()

export const appShellPrimaryLeftRailNavChildItemSchema = z
  .object(navLinkTargetSchema)
  .strict()

export const appShellPrimaryLeftRailNavItemSchema = z
  .object({
    ...navLinkTargetSchema,
    icon: appShellPrimaryLeftRailNavIconIdSchema,
    badge: appShellPrimaryLeftRailNavBadgeSchema.optional(),
    items: z.array(appShellPrimaryLeftRailNavChildItemSchema).min(1).optional(),
  })
  .strict()

export const appShellPrimaryLeftRailNavSectionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  items: z.array(appShellPrimaryLeftRailNavItemSchema),
  collapsible: z.boolean().optional(),
  defaultCollapsed: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Working Memory Rail slots
// ---------------------------------------------------------------------------

export const appShellPrimaryLeftRailViewSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    href: z.string().trim().min(1),
    icon: appShellPrimaryLeftRailNavIconIdSchema.optional(),
  })
  .strict()

export const APP_SHELL_PRIMARY_LEFT_RAIL_FORBIDDEN_LABEL_NAMESPACES = [
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
  return APP_SHELL_PRIMARY_LEFT_RAIL_FORBIDDEN_LABEL_NAMESPACES.some((prefix) =>
    trimmed.startsWith(`${prefix}.`)
  )
}

export const appShellPrimaryLeftRailInboxSchema = z
  .object({
    label: z.string().trim().min(1),
    count: z.number().int().positive(),
    href: z.string().trim().min(1),
    tone: appShellPrimaryLeftRailBadgeToneSchema,
  })
  .strict()

export const appShellPrimaryLeftRailPinSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    href: z.string().trim().min(1),
    icon: appShellPrimaryLeftRailNavIconIdSchema.optional(),
    resourceType: z.string().trim().min(1),
    resourceId: z.string().trim().min(1),
  })
  .strict()

export const appShellPrimaryLeftRailIdentitySchema = z
  .object({
    initial: z.string().trim().min(1).max(3),
    primary: z.string().trim().min(1),
    secondary: z.string().trim().optional(),
    href: z.string().trim().optional(),
  })
  .strict()

export const appShellPrimaryLeftRailRecentSchema = z
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
    icon: appShellPrimaryLeftRailNavIconIdSchema.optional(),
    resourceType: z.string().trim().min(1),
    resourceId: z.string().trim().min(1).optional(),
    occurredAt: z.string().trim().datetime(),
  })
  .strict()

// Zod-serializable slots (no ReactNode).
export const appShellPrimaryLeftRailSlotsDataSchema = z
  .object({
    identity: appShellPrimaryLeftRailIdentitySchema.optional(),
    nav: z.array(appShellPrimaryLeftRailNavSectionSchema),
    inbox: appShellPrimaryLeftRailInboxSchema.optional(),
    pinned: z.array(appShellPrimaryLeftRailPinSchema).min(1).optional(),
    views: z.array(appShellPrimaryLeftRailViewSchema).min(1).optional(),
    recents: z.array(appShellPrimaryLeftRailRecentSchema).min(1).max(5).optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const appShellPrimaryLeftRailLabelsSchema = z
  .object({
    ariaLabel: z.string().min(1),
    collapseLabel: z.string().min(1),
    expandLabel: z.string().min(1),
    navSearchPlaceholder: z.string().min(1).optional(),
    navSearchAriaLabel: z.string().min(1).optional(),
    navSearchCollapsedTriggerAriaLabel: z.string().min(1).optional(),
    navSearchNoMatches: z.string().min(1).optional(),
    emptyState: z.string().optional(),
    inboxAriaLabel: z.string().min(1).optional(),
    pinnedHeading: z.string().min(1).optional(),
    viewsHeading: z.string().min(1).optional(),
    recentsHeading: z.string().min(1).optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type AppShellPrimaryLeftRailNavIconId = z.infer<
  typeof appShellPrimaryLeftRailNavIconIdSchema
>
export type AppShellPrimaryLeftRailBadgeTone = z.infer<
  typeof appShellPrimaryLeftRailBadgeToneSchema
>
export type AppShellPrimaryLeftRailNavItem = z.infer<
  typeof appShellPrimaryLeftRailNavItemSchema
>

/** Nav row fields used for pathname active detection (client rail). */
export type AppShellPrimaryLeftRailNavItemActiveInput = Pick<
  AppShellPrimaryLeftRailNavItem,
  "href" | "active" | "match" | "activePatterns"
>
export type AppShellPrimaryLeftRailNavChildItem = z.infer<
  typeof appShellPrimaryLeftRailNavChildItemSchema
>
export type AppShellPrimaryLeftRailNavSection = z.infer<
  typeof appShellPrimaryLeftRailNavSectionSchema
>
export type AppShellPrimaryLeftRailInbox = z.infer<
  typeof appShellPrimaryLeftRailInboxSchema
>
export type AppShellPrimaryLeftRailPin = z.infer<
  typeof appShellPrimaryLeftRailPinSchema
>
export type AppShellPrimaryLeftRailView = z.infer<
  typeof appShellPrimaryLeftRailViewSchema
>
export type AppShellPrimaryLeftRailRecent = z.infer<
  typeof appShellPrimaryLeftRailRecentSchema
>
export type AppShellPrimaryLeftRailIdentity = z.infer<
  typeof appShellPrimaryLeftRailIdentitySchema
>
export type AppShellPrimaryLeftRailLabels = z.infer<
  typeof appShellPrimaryLeftRailLabelsSchema
>

/** Serializable rail slot payload (no ReactNode). */
export type AppShellPrimaryLeftRailSlotsData = {
  identity?: AppShellPrimaryLeftRailIdentity
  nav: AppShellPrimaryLeftRailNavSection[]
  inbox?: AppShellPrimaryLeftRailInbox
  pinned?: AppShellPrimaryLeftRailPin[]
  views?: AppShellPrimaryLeftRailView[]
  recents?: AppShellPrimaryLeftRailRecent[]
}

/** Full slots type — adds `footer: ReactNode` (not Zod-serializable). */
export type AppShellPrimaryLeftRailSlots = AppShellPrimaryLeftRailSlotsData & {
  footer?: ReactNode
}

/** Complete rail config passed from layout.tsx to AppShell/AppSubLayout. */
export type AppShellPrimaryLeftRailConfig = {
  slots: AppShellPrimaryLeftRailSlots
  labels: AppShellPrimaryLeftRailLabels
  /** localStorage key for persisting collapse state. */
  storageKey: string
}

export function parseAppShellPrimaryLeftRailSlotsData(
  data: unknown
): AppShellPrimaryLeftRailSlotsData {
  return appShellPrimaryLeftRailSlotsDataSchema.parse(data)
}

export function parseAppShellPrimaryLeftRailLabels(
  data: unknown
): AppShellPrimaryLeftRailLabels {
  return appShellPrimaryLeftRailLabelsSchema.parse(data)
}

export function parseAppShellPrimaryLeftRailInbox(
  data: unknown
): AppShellPrimaryLeftRailInbox {
  return appShellPrimaryLeftRailInboxSchema.parse(data)
}

export function parseAppShellPrimaryLeftRailPin(
  data: unknown
): AppShellPrimaryLeftRailPin {
  return appShellPrimaryLeftRailPinSchema.parse(data)
}

export function parseAppShellPrimaryLeftRailView(
  data: unknown
): AppShellPrimaryLeftRailView {
  return appShellPrimaryLeftRailViewSchema.parse(data)
}

export function parseAppShellPrimaryLeftRailRecent(
  data: unknown
): AppShellPrimaryLeftRailRecent {
  return appShellPrimaryLeftRailRecentSchema.parse(data)
}
