import "server-only"

import { headers } from "next/headers"

import { organizationNexusPath } from "#features/nexus"
import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"
import { auth, requireSignedInSession } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"

export type ConsoleOrgSwitcherRow = {
  id: string
  name: string
  slug: string
  role: string
}

export type ConsoleOrgContext =
  | {
      kind: "redirect"
      href: string
    }
  | {
      kind: "no-orgs"
      session: { userId: string; email: string }
    }
  | {
      kind: "multi-org"
      orgs: ConsoleOrgSwitcherRow[]
    }

export async function resolveConsoleOrgContext(
  locale: AppLocale
): Promise<ConsoleOrgContext> {
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

  if (orgs.length === 1 && orgs[0]) {
    return {
      kind: "redirect",
      href: toLocalePath(locale, organizationNexusPath(orgs[0].slug)),
    }
  }

  if (orgs.length === 0) {
    return {
      kind: "no-orgs",
      session: { userId: session.userId, email: session.user.email },
    }
  }

  return {
    kind: "multi-org",
    orgs: orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: org.role,
    })),
  }
}
