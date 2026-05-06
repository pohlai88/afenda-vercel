import { z } from "zod"

/**
 * Code-enforced UI contract (not docs).
 *
 * - Tailwind still sees literal class strings here → utilities stay generated.
 * - Import these in components instead of inventing new radii in class strings.
 * - Use Zod when variant names come from JSON/CMS/API so invalid values fail at runtime.
 * - CI: `pnpm run lint` runs ESLint (import boundaries) + `scripts/check-design-contract.mjs`
 *   (banned radii / shadows / arbitrary rounded outside allowlist under app/, components/, hooks/).
 */

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
} as const

export type UiRadiusKey = keyof typeof uiRadius

export const uiRadiusKeySchema = z.enum([
  "control",
  "chip",
  "surface",
  "surfaceTop",
  "surfaceBottom",
  "surfaceMediaTop",
  "surfaceMediaBottom",
  "section",
])

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

export const uiTracking = {
  /** Buttons, fields, dense UI */
  control: "tracking-[0.01em]",
} as const

export const uiTitle = {
  /** Card / dialog titles — matches globals h3 scale */
  sm: "font-heading text-lg leading-tight font-semibold",
} as const

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
