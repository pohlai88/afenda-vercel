"use client"

import Image from "next/image"
import { forwardRef, type ComponentPropsWithoutRef } from "react"

import { ERP_UTILITY_AVATAR_PNG } from "#lib/site"
import { cn } from "#lib/utils"

import {
  WORKBENCH_UTILITY_DISC_33_PX,
  WORKBENCH_UTILITY_FLUSH_DISC_CLASS,
} from "#components/workbench/utility-bar/workbench-utility-round-control-class"

/** Flush 33px raster disc — avatar PNG carries its own brand surface, no glass ring. */
const TRIGGER_CLASS = cn(
  WORKBENCH_UTILITY_FLUSH_DISC_CLASS,
  "size-[33px]!",
  "cursor-pointer disabled:pointer-events-none disabled:opacity-50"
)

export type NexusUtilityControlAvatarTriggerProps = {
  "aria-label": string
} & ComponentPropsWithoutRef<"button">

/** Native control so Radix `asChild` merges onto a single `<button>` without CVA overlap. */
export const NexusUtilityControlAvatarTrigger = forwardRef<
  HTMLButtonElement,
  NexusUtilityControlAvatarTriggerProps
>(function NexusUtilityControlAvatarTrigger(
  { "aria-label": ariaLabel, className, type = "button", ...props },
  forwardedRef
) {
  return (
    <button
      ref={forwardedRef}
      type={type}
      aria-label={ariaLabel}
      className={cn(TRIGGER_CLASS, className)}
      {...props}
    >
      <Image
        src={ERP_UTILITY_AVATAR_PNG}
        alt=""
        fill
        draggable={false}
        sizes={`${WORKBENCH_UTILITY_DISC_33_PX}px`}
        className="pointer-events-none object-cover select-none"
        aria-hidden
      />
    </button>
  )
})

NexusUtilityControlAvatarTrigger.displayName =
  "NexusUtilityControlAvatarTrigger"
