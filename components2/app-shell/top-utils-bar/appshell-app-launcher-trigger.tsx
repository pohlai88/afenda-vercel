"use client"

import Image from "next/image"
import { forwardRef, type ComponentPropsWithoutRef } from "react"

import { ERP_UTILITY_MULTIPLE_APPS_PNG } from "#lib/site"
import { cn } from "#lib/utils"

import {
  APP_SHELL_UTILITY_DISC_33_PX,
  APP_SHELL_UTILITY_FLUSH_DISC_CLASS,
} from "./appshell-utility-chrome.shared"

const TRIGGER_CLASS = cn(
  APP_SHELL_UTILITY_FLUSH_DISC_CLASS,
  "size-[33px]!",
  "cursor-pointer disabled:pointer-events-none disabled:opacity-50"
)

export type AppShellAppLauncherTriggerProps = {
  "aria-label": string
} & ComponentPropsWithoutRef<"button">

/**
 * Native control so Radix `asChild` owns the trigger node directly.
 * Mirrors the avatar control contract to avoid wrapper composition regressions.
 */
export const AppShellAppLauncherTrigger = forwardRef<
  HTMLButtonElement,
  AppShellAppLauncherTriggerProps
>(function AppShellAppLauncherTrigger(
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
        sizes={`${APP_SHELL_UTILITY_DISC_33_PX}px`}
        className="pointer-events-none object-cover select-none"
        aria-hidden
      />
    </button>
  )
})

AppShellAppLauncherTrigger.displayName = "AppShellAppLauncherTrigger"
