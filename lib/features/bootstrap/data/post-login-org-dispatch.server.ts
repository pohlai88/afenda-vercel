import "server-only"

import { headers } from "next/headers"

import { organizationNexusPath } from "#features/nexus"
import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"
import {
  auth,
  requireSignedInSession,
  setActiveOrganizationForSession,
} from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"

export type PostLoginOrgRow = {
  id: string
  name: string
  slug: string
  role: string
}

export type PostLoginOrgDispatch =
  | {
      kind: "redirect"
      href: string
    }
  | {
      kind: "bootstrap"
    }
  | {
      kind: "picker"
      orgs: PostLoginOrgRow[]
    }

export async function resolvePostLoginOrgDispatch(
  locale: AppLocale
): Promise<PostLoginOrgDispatch> {
  const session = await requireSignedInSession()
  const [orgs, authSession] = await Promise.all([
    listUserOrganizationsForSwitcher(session.userId),
    auth.getSession({ fetchOptions: { headers: await headers() } }),
  ])

  const activeOrganizationId =
    (
      authSession.data?.session as {
        activeOrganizationId?: string | null
      } | null
    )?.activeOrganizationId ?? null
  const activeOrganization =
    orgs.find((org) => org.id === activeOrganizationId) ?? null

  if (activeOrganization) {
    return {
      kind: "redirect",
      href: toLocalePath(
        locale,
        organizationNexusPath(activeOrganization.slug)
      ),
    }
  }

  if (orgs.length === 0) {
    return { kind: "bootstrap" }
  }

  if (orgs.length === 1 && orgs[0]) {
    const sole = orgs[0]
    await setActiveOrganizationForSession({
      userId: session.userId,
      sessionId: session.sessionId,
      organizationId: sole.id,
    })
    return {
      kind: "redirect",
      href: toLocalePath(locale, organizationNexusPath(sole.slug)),
    }
  }

  return {
    kind: "picker",
    orgs: orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: org.role,
    })),
  }
}
