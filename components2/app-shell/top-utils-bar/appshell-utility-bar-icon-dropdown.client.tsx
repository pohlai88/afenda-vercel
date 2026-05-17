"use client"

import type { ReactNode } from "react"

import {
  AppShellUtilityDropdown,
  type AppShellUtilityDropdownProps,
} from "./appshell-utility-bar-dropdown.client"

export type AppShellUtilityBarIconDropdownProps =
  AppShellUtilityDropdownProps & {
    /**
     * Sibling UI after the dropdown root (sheets, dialogs, portals).
     * Same pattern as marketplace: dropdown closes; overlays stay mounted as siblings.
     */
    children?: ReactNode
  }

/**
 * Standard utility-bar entry: {@link AppShellUtilityDropdown} plus optional sibling overlays.
 * Use for marketplace, account hub, and future L2 icons so trigger + header + groups stay consistent.
 */
export function AppShellUtilityBarIconDropdown({
  children,
  ...dropdownProps
}: AppShellUtilityBarIconDropdownProps) {
  return (
    <>
      <AppShellUtilityDropdown {...dropdownProps} />
      {children}
    </>
  )
}
