"use client"

import Image from "next/image"
import { forwardRef, type ComponentPropsWithoutRef } from "react"

import { ERP_UTILITY_AVATAR_PNG } from "#lib/site"
import { cn } from "#lib/utils"

import {
  WORKBENCH_UTILITY_CHROME_DISC_33_CLASS,
  WORKBENCH_UTILITY_DISC_33_PX,
} from "./workbench-utility-round-control-class"

/** Matches left-rail brand disc + calm open state when used as a menu trigger. */
const TRIGGER_CLASS = cn(
  WORKBENCH_UTILITY_CHROME_DISC_33_CLASS,
  "inline-flex cursor-pointer items-center justify-center border-0 outline-none",
  "aria-expanded:bg-card/92 data-[state=open]:bg-card/92",
  "disabled:pointer-events-none disabled:opacity-50"
)

export type NexusUtilityControlAvatarTriggerProps = {
  "aria-label": string
} & ComponentPropsWithoutRef<"button">

/** Native control so Radix `asChild` merges onto a single `<button>` without CVA overlap. */
export const WorkbenchUtilityControlAvatarTrigger = forwardRef<
  HTMLButtonElement,
  NexusUtilityControlAvatarTriggerProps
>(function WorkbenchUtilityControlAvatarTrigger(
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

WorkbenchUtilityControlAvatarTrigger.displayName =
  "WorkbenchUtilityControlAvatarTrigger"
