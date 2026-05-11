import "server-only"

import { cache } from "react"

import {
  auth,
  listDeviceSessions,
  listUserSecurityActivity,
  requireAuthShellSignedInSession,
} from "#lib/auth"
import type { UserOrgSummary } from "#features/org-admin/client"
import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"

import type { AccountShellSummary } from "./account-shell.types"

export type AccountShellData = {
  summary: AccountShellSummary
  activeOrganization: UserOrgSummary | null
  organizations: UserOrgSummary[]
  securityActivity: Awaited<ReturnType<typeof listUserSecurityActivity>>
}

function fallbackDisplayName(email: string, name: string | null): string {
  if (name?.trim()) return name.trim()
  const localPart = email.split("@")[0]?.trim() ?? ""
  return localPart || email
}

export const getAccountShellData = cache(
  async (): Promise<AccountShellData> => {
    const session = await requireAuthShellSignedInSession()

    const [
      { data: authSession },
      organizations,
      deviceSessions,
      securityActivity,
    ] = await Promise.all([
      auth.getSession(),
      listUserOrganizationsForSwitcher(session.userId),
      listDeviceSessions(),
      listUserSecurityActivity(session.userId, 6),
    ])

    const activeOrganizationId =
      (
        authSession?.session as {
          activeOrganizationId?: string | null
        } | null
      )?.activeOrganizationId ?? null

    const activeOrganization =
      organizations.find((org) => org.id === activeOrganizationId) ?? null

    return {
      summary: {
        displayName: fallbackDisplayName(session.user.email, session.user.name),
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        activeOrgName: activeOrganization?.name ?? null,
        activeOrgRole: activeOrganization?.role ?? null,
        activeOrgHref: null,
        orgCount: organizations.length,
        sessionCount: deviceSessions.length,
      },
      activeOrganization,
      organizations,
      securityActivity,
    }
  }
)
