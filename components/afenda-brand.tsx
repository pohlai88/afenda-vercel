"use client"

import Image from "next/image"

import {
  APP_ICON_512_PNG,
  BRAND_COMBINED_LOCKUP_DARK_PNG,
  BRAND_COMBINED_LOCKUP_PNG,
  SITE_NAME,
} from "#lib/site"
import { cn } from "#lib/utils"

type AfendaBrandLockupProps = {
  /** Outer wrapper (width, alignment). */
  className?: string
  /** Passed to both lockup images (`object-*`, etc.). */
  imgClassName?: string
  priority?: boolean
}

/**
 * Full-color combined lockup for marketing and auth hero surfaces.
 * Light theme uses the full-color transparent PNG; dark theme uses the guideline
 * dark lockup with keyed canvas (see `scripts/knockout-dark-lockup-bg.mjs`).
 */
export function AfendaBrandLockup({
  className,
  imgClassName,
  priority = false,
}: AfendaBrandLockupProps) {
  /** One aspect box for both themes so toggling `dark` does not resize the slot. */
  const wrapper = cn(
    "relative w-full max-w-[240px] aspect-[1800/488]",
    className,
  )
  const img = cn("object-contain object-center", imgClassName)
  const sizes = "(max-width: 768px) 100vw, 240px"
  return (
    <div className={wrapper}>
      <Image
        src={BRAND_COMBINED_LOCKUP_PNG}
        alt={SITE_NAME}
        fill
        sizes={sizes}
        className={cn(img, "dark:hidden")}
        priority={priority}
      />
      <Image
        src={BRAND_COMBINED_LOCKUP_DARK_PNG}
        alt={SITE_NAME}
        fill
        sizes={sizes}
        className={cn(img, "hidden dark:block")}
        priority={priority}
      />
    </div>
  )
}

type AfendaBrandIconProps = {
  size?: number
  className?: string
  priority?: boolean
}

/**
 * Square app mark for compact chrome (e.g. dashboard header).
 * Same transparent asset in light and dark to avoid a maskable/transparent swap on theme toggle.
 */
export function AfendaBrandIcon({
  size = 64,
  className,
  priority = false,
}: AfendaBrandIconProps) {
  return (
    <Image
      src={APP_ICON_512_PNG}
      alt={SITE_NAME}
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  )
}
