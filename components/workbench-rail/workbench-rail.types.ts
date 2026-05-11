export type WorkbenchRailIconKey =
  | "userRound"
  | "monitorSmartphone"
  | "shield"
  | "shieldCheck"
  | "building2"
  | "keyRound"
  | "logOut"
  | "panelLeft"

export type WorkbenchRailIdentity = {
  initial: string
  displayName: string
  email: string
  pills: Array<{
    label: string
    tone: "default" | "positive" | "attention"
  }>
}

export type WorkbenchRailNavItem = {
  id: string
  label: string
  description?: string
  href: string
  iconKey: WorkbenchRailIconKey
  active: boolean
  /** Optional: show a secondary icon when the item is active */
  activeIconKey?: WorkbenchRailIconKey
}

export type WorkbenchRailAction =
  | {
      kind: "link"
      id: string
      label: string
      description?: string
      href: string
      iconKey: WorkbenchRailIconKey
    }
  | {
      kind: "signout"
      id: string
      label: string
      description?: string
      iconKey: WorkbenchRailIconKey
    }

export type WorkbenchRailContextItem = {
  label: string
  value: string
  href?: string | null
  tone?: "default" | "positive" | "attention"
}

export type WorkbenchRailSlots = {
  identity: WorkbenchRailIdentity
  nav: WorkbenchRailNavItem[]
  actions: WorkbenchRailAction[]
  /** Optional context strip (recent items, signals, etc.) */
  context?: WorkbenchRailContextItem[]
}

export type WorkbenchRailLabels = {
  ariaLabel: string
  /** Description shown below identity when expanded */
  description?: string
  navLabel: string
  actionsLabel: string
  /**
   * Required when `slots.context` is provided and non-empty.
   * If absent the context strip is suppressed even when context items exist.
   */
  contextLabel?: string
  collapseLabel: string
  expandLabel: string
}

export type WorkbenchRailProps = {
  slots: WorkbenchRailSlots
  labels: WorkbenchRailLabels
  collapsed: boolean
  onToggleCollapse: () => void
}
