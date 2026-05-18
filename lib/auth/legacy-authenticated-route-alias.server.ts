import "server-only"

import { headers } from "next/headers"
import type { Route } from "next"
import { redirect } from "next/navigation"

import {
  AFENDA_PATHNAME_HEADER,
  AFENDA_SEARCH_HEADER,
} from "#lib/auth/forwarded-path-headers.shared"
import { organizationAccountPath } from "#lib/org-apps-module-paths"
import {
  stripLeadingLocalePrefix,
  toLocalePath,
  type AppLocale,
} from "#lib/i18n/locales.shared"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { ORBIT_SURFACE_SEGMENT_SET } from "#features/planner/planner-orbit-path.shared"
import { requireOrgSession } from "./tenant-session.server"
import { organizationOrbitPath } from "#features/planner"

/** Session-aware legacy URL prefixes resolved to org-scoped canonical routes. */
type LegacySurface = "account"

function withForwardedSearch(pathname: string, search: string | null): string {
  const trimmed = search?.trim() ?? ""
  if (!trimmed) return pathname
  return `${pathname}?${trimmed}`
}

function resolveAccountAliasPath(orgSlug: string, pathname: string): Route {
  if (pathname === "/account") {
    return organizationAccountPath(orgSlug)
  }
  if (pathname === "/account/identity") {
    return organizationAccountPath(orgSlug, "identity")
  }
  if (pathname === "/account/security") {
    return organizationAccountPath(orgSlug, "security")
  }
  if (pathname === "/account/orbit") {
    return organizationOrbitPath(orgSlug)
  }
  const orbitMatch = pathname.match(/^\/account\/orbit\/([^/]+)$/)
  if (orbitMatch && ORBIT_SURFACE_SEGMENT_SET.has(orbitMatch[1]!)) {
    return organizationOrbitPath(orgSlug, orbitMatch[1] as never)
  }
  return organizationAccountPath(orgSlug)
}

export async function redirectLegacyAuthenticatedSurfaceAlias(input: {
  locale: AppLocale
  surface: LegacySurface
}): Promise<never> {
  const session = await requireOrgSession()
  const orgSlug = await getOrganizationSlugById(session.organizationId)
  if (!orgSlug) {
    redirect(toLocalePath(input.locale, "/o") as Route)
  }

  const h = await headers()
  const pathnameHeader = h.get(AFENDA_PATHNAME_HEADER)?.trim()
  const stripped = pathnameHeader
    ? stripLeadingLocalePrefix(pathnameHeader)
    : null
  const localeInternalPath =
    stripped?.pathnameWithoutLocale ?? `/${input.surface}`
  const search = h.get(AFENDA_SEARCH_HEADER)

  const target = resolveAccountAliasPath(orgSlug, localeInternalPath)

  redirect(
    toLocalePath(
      input.locale,
      withForwardedSearch(target, search) as never
    ) as Route
  )
}
