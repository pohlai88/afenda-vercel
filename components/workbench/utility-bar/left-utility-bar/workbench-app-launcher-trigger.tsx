"use client"

import Image from "next/image"
import { forwardRef, type ComponentPropsWithoutRef } from "react"

import { ERP_UTILITY_MULTIPLE_APPS_PNG } from "#lib/site"
import { cn } from "#lib/utils"

import {
  WORKBENCH_UTILITY_DISC_33_PX,
  WORKBENCH_UTILITY_FLUSH_DISC_CLASS,
} from "../workbench-utility-round-control-class"

const TRIGGER_CLASS = cn(
  WORKBENCH_UTILITY_FLUSH_DISC_CLASS,
  "size-[33px]!",
  "cursor-pointer disabled:pointer-events-none disabled:opacity-50"
)

export type WorkbenchAppLauncherTriggerProps = {
  "aria-label": string
} & ComponentPropsWithoutRef<"button">

/**
 * Native control so Radix `asChild` owns the trigger node directly.
 * Mirrors the avatar control contract to avoid wrapper composition regressions.
 */
export const WorkbenchAppLauncherTrigger = forwardRef<
  HTMLButtonElement,
  WorkbenchAppLauncherTriggerProps
>(function WorkbenchAppLauncherTrigger(
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
        src={ERP_UTILITY_MULTIPLE_APPS_PNG}
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

WorkbenchAppLauncherTrigger.displayName = "WorkbenchAppLauncherTrigger"
