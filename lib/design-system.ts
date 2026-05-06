import { z } from "zod"

/**
 * Code-enforced UI contract (not docs).
 *
 * - Tailwind still sees literal class strings here → utilities stay generated.
 * - Import these in components instead of inventing new radii in class strings.
 * - Use Zod when variant names come from JSON/CMS/API so invalid values fail at runtime.
 * - CI: `pnpm run lint` runs ESLint (import boundaries) + `scripts/check-design-contract.mjs`
 *   (banned radii / shadows / arbitrary rounded outside allowlist under app/, components/, hooks/, lib/features/).
 * - Spacing: `uiSurfaceSpaceKeys` / `uiSurfaceInset` mirror `app/globals.css` `--space-surface-*` (Tailwind `*-surface-*`).
 */

/** Radius roles — single source for keys + Zod (keep in sync with `scripts/check-design-contract.mjs` allowlist). */
export const uiRadiusKeys = [
  "control",
  "chip",
  "surface",
  "surfaceTop",
  "surfaceBottom",
  "surfaceMediaTop",
  "surfaceMediaBottom",
  "section",
] as const

export type UiRadiusKey = (typeof uiRadiusKeys)[number]

export const uiRadius = {
  /** Inputs, buttons, triggers, single-line controls */
  control: "rounded-lg",
  /** Badges, kbd, compact chips */
  chip: "rounded-md",
  /** Cards, dialogs, popovers, command surfaces */
  surface: "rounded-2xl",
  /** Top / bottom caps for media-in-card patterns */
  surfaceTop: "rounded-t-2xl",
  surfaceBottom: "rounded-b-2xl",
  /** Full selector utilities for card image caps (Tailwind must see literals) */
  surfaceMediaTop: "*:[img:first-child]:rounded-t-2xl",
  surfaceMediaBottom: "*:[img:last-child]:rounded-b-2xl",
  /** Accordions, medium grouped shells */
  section: "rounded-xl",
} as const satisfies Record<UiRadiusKey, string>

export const uiRadiusKeySchema = z.enum(uiRadiusKeys)

export const uiRadiusClassSchema = z.enum([
  uiRadius.control,
  uiRadius.chip,
  uiRadius.surface,
  uiRadius.surfaceTop,
  uiRadius.surfaceBottom,
  uiRadius.surfaceMediaTop,
  uiRadius.surfaceMediaBottom,
  uiRadius.section,
])

export type UiRadiusClass = z.infer<typeof uiRadiusClassSchema>

export const uiTracking = {
  /** Buttons, fields, dense UI */
  control: "tracking-[0.01em]",
} as const

/**
 * Vertical rhythm between stacked blocks — mirrors `:root` `--density-comfortable` / `--density-compact`
 * (`1rem` / `0.75rem`) via Tailwind `gap-density-*` utilities from `@theme inline`.
 */
export const uiDensity = {
  comfortable: "gap-density-comfortable",
  compact: "gap-density-compact",
} as const

export const uiDensitySchema = z.enum(["comfortable", "compact"])
export type UiDensity = z.infer<typeof uiDensitySchema>

/** Keys for `--space-surface-*` in `app/globals.css` → `p-surface-*`, `gap-surface-*`, etc. */
export const uiSurfaceSpaceKeys = ["xs", "sm", "md", "lg", "xl", "2xl"] as const

export type UiSurfaceSpaceKey = (typeof uiSurfaceSpaceKeys)[number]

export const uiSurfaceSpaceSchema = z.enum(uiSurfaceSpaceKeys)

/** Uniform inset per step — use partial axes (`px-surface-*`, `py-surface-*`) when needed */
export const uiSurfaceInset = {
  xs: "p-surface-xs",
  sm: "p-surface-sm",
  md: "p-surface-md",
  lg: "p-surface-lg",
  xl: "p-surface-xl",
  "2xl": "p-surface-2xl",
} as const satisfies Record<UiSurfaceSpaceKey, string>

export const uiTitle = {
  /**
   * Card / dialog titles — `text-lg` matches `@layer base` h3 (`1.125rem`).
   * Page/editorial headings inherit from `app/globals.css` (h1–h4).
   */
  sm: "font-heading text-lg leading-tight font-semibold",
} as const

export const uiStatusToneKeys = [
  "neutral",
  "success",
  "warning",
  "info",
  "critical",
] as const

export type UiStatusTone = (typeof uiStatusToneKeys)[number]
export const uiStatusToneSchema = z.enum(uiStatusToneKeys)

export const uiStatusToneClasses: Record<UiStatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  info: "bg-info/15 text-info",
  critical: "bg-critical/15 text-critical",
}

export const uiSurfaceElevation = {
  default: "shadow-elevation-1",
  raised: "shadow-elevation-2",
  floating: "shadow-elevation-3",
} as const

export const uiSurfaceElevationSchema = z.enum([
  "default",
  "raised",
  "floating",
])
export type UiSurfaceElevation = z.infer<typeof uiSurfaceElevationSchema>

/** Button variants — keep in sync with `components/ui/button.tsx` */
export const buttonVariantKeys = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const

export type ButtonVariant = (typeof buttonVariantKeys)[number]

export const buttonVariantSchema = z.enum(buttonVariantKeys)

/** Button sizes — keep in sync with `components/ui/button.tsx` */
export const buttonSizeKeys = [
  "default",
  "xs",
  "sm",
  "lg",
  "icon",
  "icon-xs",
  "icon-sm",
  "icon-lg",
] as const

export type ButtonSize = (typeof buttonSizeKeys)[number]

export const buttonSizeSchema = z.enum(buttonSizeKeys)

/** Badge variants — keep in sync with `components/ui/badge.tsx` */
export const badgeVariantKeys = [
  "default",
  "secondary",
  "success",
  "warning",
  "info",
  "critical",
  "destructive",
  "outline",
  "ghost",
  "link",
] as const

export type BadgeVariant = (typeof badgeVariantKeys)[number]

export const badgeVariantSchema = z.enum(badgeVariantKeys)

/** Card size — keep in sync with `components/ui/card.tsx` */
export const cardSizeKeys = ["default", "sm"] as const

export type CardSize = (typeof cardSizeKeys)[number]

export const cardSizeSchema = z.enum(cardSizeKeys)

/**
 * Parse untrusted props / CMS JSON. Example:
 * `buttonVariantSchema.parse(payload.variant)`
 */
export function parseButtonVariant(value: unknown): ButtonVariant {
  return buttonVariantSchema.parse(value)
}

export function parseButtonSize(value: unknown): ButtonSize {
  return buttonSizeSchema.parse(value)
}

export function parseBadgeVariant(value: unknown): BadgeVariant {
  return badgeVariantSchema.parse(value)
}

export function parseCardSize(value: unknown): CardSize {
  return cardSizeSchema.parse(value)
}

export function parseUiDensity(value: unknown): UiDensity {
  return uiDensitySchema.parse(value)
}

export function parseUiStatusTone(value: unknown): UiStatusTone {
  return uiStatusToneSchema.parse(value)
}

export function parseSurfaceElevation(value: unknown): UiSurfaceElevation {
  return uiSurfaceElevationSchema.parse(value)
}

export function parseUiRadiusKey(value: unknown): UiRadiusKey {
  return uiRadiusKeySchema.parse(value)
}

export function parseUiRadiusClass(value: unknown): UiRadiusClass {
  return uiRadiusClassSchema.parse(value)
}

export function parseUiSurfaceSpaceKey(value: unknown): UiSurfaceSpaceKey {
  return uiSurfaceSpaceSchema.parse(value)
}
