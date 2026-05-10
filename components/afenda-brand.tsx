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
/** Layout aspect for both lockups so theme toggle does not resize the slot (`object-contain` letterboxes the dark asset). */
const LOCKUP_WIDTH = 1800
const LOCKUP_HEIGHT = 488

export function AfendaBrandLockup({
  className,
  imgClassName,
  priority = false,
}: AfendaBrandLockupProps) {
  const wrapper = cn("w-full max-w-[240px]", className)
  const img = cn("h-auto w-full object-contain object-center", imgClassName)
  const sizes = "(max-width: 768px) 100vw, 240px"
  return (
    <div className={wrapper}>
      <Image
        src={BRAND_COMBINED_LOCKUP_PNG}
        alt={SITE_NAME}
        width={LOCKUP_WIDTH}
        height={LOCKUP_HEIGHT}
        sizes={sizes}
        className={cn(img, "dark:hidden")}
        priority={priority}
      />
      <Image
        src={BRAND_COMBINED_LOCKUP_DARK_PNG}
        alt={SITE_NAME}
        width={LOCKUP_WIDTH}
        height={LOCKUP_HEIGHT}
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
  /**
   * Fill a `relative` parent with explicit width/height (e.g. circular chrome).
   * Image uses `object-cover` so the bitmap covers the frame edge-to-edge.
   */
  fill?: boolean
  /** Passed to `next/image` when `fill` is true (default tuned for small header marks). */
  sizes?: string
}

/**
 * Square app mark for compact chrome (e.g. dashboard header).
 * Same transparent asset in light and dark to avoid a maskable/transparent swap on theme toggle.
 */
export function AfendaBrandIcon({
  size = 64,
  className,
  priority = false,
  fill = false,
  sizes: sizesProp,
}: AfendaBrandIconProps) {
  if (fill) {
    return (
      <Image
        src={APP_ICON_512_PNG}
        alt={SITE_NAME}
        fill
        sizes={sizesProp ?? "44px"}
        className={cn("object-cover", className)}
        priority={priority}
      />
    )
  }

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
