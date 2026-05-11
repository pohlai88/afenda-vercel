import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export type WorkbenchRailIdentity = {
  /** 1-2 char monogram for collapsed mode */
  initial: string
  /** displayName / orgName / projectName */
  primary: string
  /** email / role / slug */
  secondary?: string
  pills?: Array<{ label: string; tone: "default" | "positive" | "attention" }>
  /** Optional click target for the identity zone */
  href?: string
}

export type WorkbenchRailNavItem = {
  id: string
  label: string
  description?: string
  href: string
  /** Open icon prop — any imported Lucide icon; no enum registry */
  icon: LucideIcon
  active?: boolean
  badge?: {
    count?: number
    tone?: "default" | "positive" | "attention" | "critical"
  }
}

export type WorkbenchRailNavSection = {
  id: string
  /** Omit for flat rails (single-section like account today) */
  label?: string
  items: WorkbenchRailNavItem[]
  collapsible?: boolean
  defaultCollapsed?: boolean
}

export type WorkbenchRailContextStrip = {
  id: string
  label: string
  items: Array<{
    label: string
    value: string
    href?: string
    tone?: "default" | "positive" | "attention"
  }>
}

export type WorkbenchRailSlots = {
  identity: WorkbenchRailIdentity
  /** CHANGED from v1: was flat WorkbenchRailNavItem[], now sections */
  nav: WorkbenchRailNavSection[]
  /** CHANGED from v1: was one strip, now multiple */
  context?: WorkbenchRailContextStrip[]
  /** CHANGED from v1: was actions[]; now a fully composable slot */
  footer?: ReactNode
}

export type WorkbenchRailLabels = {
  ariaLabel: string
  /** Description shown below identity when expanded */
  description?: string
  collapseLabel: string
  expandLabel: string
}

export type WorkbenchRailProps = {
  slots: WorkbenchRailSlots
  labels: WorkbenchRailLabels
  /** Persisted collapse state, managed by parent shell */
  collapsed: boolean
  onToggleCollapse: () => void
}
