import type { ReactNode } from "react"

import type { AppShellPrimaryLeftRailConfig } from "./left-rail-bar/appshell-primary-left-rail.schema"

/** Slots for the sticky L1 utility bar — usable from Client and Server bundles. */
export type AppShellUtilityBarSlots = {
  left: ReactNode
  center?: ReactNode
  right: ReactNode
}

/**
 * Props passed into {@link AppShellClient} after {@link AppShell} applies defaults.
 * Excludes `envelope` — `RouteEnvelopeProvider` wraps outside the client subtree.
 */
export type AppShellChromeProps = {
  rail: AppShellPrimaryLeftRailConfig | null
  utilityBar: AppShellUtilityBarSlots
  command: ReactNode | null
  overlay: ReactNode | null
  children: ReactNode
}

/**
 * Chrome slice accepted by {@link AppShell} before defaults — same fields as
 * {@link AppShellChromeProps}, but `rail` / `command` / `overlay` may be omitted.
 */
export type AppShellChromePropsInput = Omit<
  AppShellChromeProps,
  "rail" | "command" | "overlay"
> & {
  rail?: AppShellPrimaryLeftRailConfig | null
  command?: ReactNode | null
  overlay?: ReactNode | null
}
