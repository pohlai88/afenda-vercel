import "server-only"

import { cache } from "react"
import { headers } from "next/headers"

import {
  auth,
  requireAuthShellSignedInSession,
} from "#lib/auth"
import { hasCredentialAccount } from "./account-identity.server"
import { listDeviceSessions } from "./account-device-sessions.server"
import { listUserSecurityActivity } from "./account-security-activity.server"
import { organizationNexusPath } from "#features/nexus"
import type { UserOrgSummary } from "#features/org-admin/client"
import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"

import type { IamProfileShellSummary } from "../schemas/profile-shell.types.shared"

export type IamProfileShellDeviceSession = Awaited<
  ReturnType<typeof listDeviceSessions>
>[number]
export type IamProfileShellActivityRow = Awaited<
  ReturnType<typeof listUserSecurityActivity>
>[number]

export type IamProfileShellData = {
  summary: IamProfileShellSummary
  activeOrganization: UserOrgSummary | null
  organizations: UserOrgSummary[]
  deviceSessions: IamProfileShellDeviceSession[]
  securityActivity: IamProfileShellActivityRow[]
  currentSessionId: string
  currentSessionToken: string
  hasCredential: boolean
}

function fallbackDisplayName(email: string, name: string | null): string {
  if (name?.trim()) return name.trim()
  const localPart = email.split("@")[0]?.trim() ?? ""
  return localPart || email
}

export const getProfileShellData = cache(
  async (): Promise<IamProfileShellData> => {
    const session = await requireAuthShellSignedInSession()

    const [
      { data: authSession },
      organizations,
      deviceSessions,
      securityActivity,
      hasCredential,
    ] = await Promise.all([
      auth.getSession({ fetchOptions: { headers: await headers() } }),
      listUserOrganizationsForSwitcher(session.userId),
      listDeviceSessions(),
      listUserSecurityActivity(session.userId, 6),
      hasCredentialAccount(session.userId),
    ])

    const activeOrganizationId =
      (
        authSession?.session as {
          activeOrganizationId?: string | null
        } | null
      )?.activeOrganizationId ?? null

    const activeOrganization =
      organizations.find((org) => org.id === activeOrganizationId) ?? null

    const activeOrgSlug = activeOrganizationId
      ? await getOrganizationSlugById(activeOrganizationId)
      : null

    return {
      summary: {
        displayName: fallbackDisplayName(session.user.email, session.user.name),
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        activeOrgName: activeOrganization?.name ?? null,
        activeOrgRole: activeOrganization?.role ?? null,
        activeOrgHref: activeOrgSlug
          ? organizationNexusPath(activeOrgSlug)
          : null,
        orgCount: organizations.length,
        sessionCount: deviceSessions.length,
      },
      activeOrganization,
      organizations,
      deviceSessions,
      securityActivity,
      currentSessionId: session.sessionId,
      currentSessionToken: authSession?.session?.token ?? "",
      hasCredential,
    }
  }
)
