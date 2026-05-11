import type { ReactNode } from "react"

import type { WorkbenchRailLabels, WorkbenchRailSlots } from "./rail"

export type WorkbenchShellRailConfig = {
  slots: WorkbenchRailSlots
  labels: WorkbenchRailLabels
  /** localStorage key for collapse state persistence. */
  storageKey: string
}

export type WorkbenchShellProps = {
  /** Localized label for the keyboard skip-link. */
  skipToMainLabel: string

  /**
   * Pre-built utility bar node. Layouts construct WorkbenchUtilityBar with
   * the appropriate mode (org | no-org) and pass it here.
   */
  utilityBar: ReactNode

  /**
   * Left rail config. Pass null for surfaces without a rail
   * (Nexus Field, console, surface-only ERP pages).
   */
  rail: WorkbenchShellRailConfig | null

  /**
   * Route-scoped command palette, pre-configured with sections by the layout.
   * Omit on surfaces where command is not needed.
   */
  commandLayer?: ReactNode

  /**
   * Dock slot. Pass <WorkbenchDock /> on org surfaces; omit on account/console/operator.
   */
  dock?: ReactNode

  /**
   * When true, wraps children in LynxSummonProvider and renders <LynxSummon />.
   * Enable on org surfaces; disable on account/console/operator.
   */
  enableLynxSummon?: boolean

  /**
   * Org slug — required when enableLynxSummon is true or when GlobalShortcuts are enabled.
   */
  orgSlug?: string

  children: ReactNode
}
