import "server-only"

import type {
  IamProfileSecurityActivityRow,
  IamProfileSecuritySessionRow,
} from "#components2/iam-profile/iam-profile.types.shared"

import type { IamProfileShellData } from "./profile-shell-data.server"

function toIso(d: Date | string): string {
  if (d instanceof Date) return d.toISOString()
  return typeof d === "string" ? d : new Date(d).toISOString()
}

export function buildIamProfileSecurityViewFromShell(
  shellData: IamProfileShellData
): {
  currentSessionId: string
  currentSessionToken: string
  sessions: IamProfileSecuritySessionRow[]
  activity: IamProfileSecurityActivityRow[]
  hasCredential: boolean
} {
  const sessions: IamProfileSecuritySessionRow[] = shellData.deviceSessions.map(
    (s) => ({
      id: s.id,
      token: s.token,
      createdAt: toIso(s.createdAt),
      expiresAt: toIso(s.expiresAt),
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? null,
    })
  )

  const activity: IamProfileSecurityActivityRow[] =
    shellData.securityActivity.map((a) => ({
      id: a.id,
      label: a.label,
      createdAt: toIso(a.createdAt),
      path: a.path,
    }))

  return {
    currentSessionId: shellData.currentSessionId,
    currentSessionToken: shellData.currentSessionToken,
    sessions,
    activity,
    hasCredential: shellData.hasCredential,
  }
}
