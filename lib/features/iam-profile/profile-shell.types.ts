export type IamProfileSurfaceSectionId =
  | "identity"
  | "orbit"
  | "sessions"
  | "authority"
  | "workspace"

export type IamProfileShellSummary = {
  displayName: string
  email: string
  emailVerified: boolean
  activeOrgName: string | null
  activeOrgRole: string | null
  activeOrgHref: string | null
  orgCount: number
  sessionCount: number
}

export type IamProfileRailSection = {
  id: IamProfileSurfaceSectionId
  label: string
  description: string
  href: string
  matchPath?: string
  activeHash?: string | null
  children?: IamProfileRailChildSection[]
}

export type IamProfileRailChildSection = {
  id: string
  label: string
  description?: string
  href: string
  match?: "exact" | "prefix"
  matchPath?: string
}
