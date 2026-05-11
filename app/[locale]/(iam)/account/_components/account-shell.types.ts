export type AccountSurfaceSectionId =
  | "identity"
  | "orbit"
  | "sessions"
  | "authority"
  | "workspace"

export type AccountShellSummary = {
  displayName: string
  email: string
  emailVerified: boolean
  activeOrgName: string | null
  activeOrgRole: string | null
  activeOrgHref: string | null
  orgCount: number
  sessionCount: number
}

export type AccountRailSection = {
  id: AccountSurfaceSectionId
  label: string
  description: string
  href: string
  matchPath?: string
  activeHash?: string | null
}

export type AccountRecentContext = {
  label: string
  value: string
  href?: string | null
}

export type AccountSignal = {
  label: string
  value: string
  tone?: "default" | "positive" | "attention"
}
