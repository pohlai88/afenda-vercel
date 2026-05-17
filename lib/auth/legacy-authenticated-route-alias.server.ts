import "server-only"

import { headers } from "next/headers"
import type { Route } from "next"
import { redirect } from "next/navigation"

import {
  AFENDA_PATHNAME_HEADER,
  AFENDA_SEARCH_HEADER,
} from "#lib/auth/forwarded-path-headers.shared"
import { organizationAccountPath } from "#lib/dashboard-module-paths"
import {
  stripLeadingLocalePrefix,
  toLocalePath,
  type AppLocale,
} from "#lib/i18n/locales.shared"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { ORBIT_DASHBOARD_SURFACE_SEGMENT_SET } from "#features/planner/planner-dashboard-path.shared"
import { requireOrgSession } from "./tenant-session.server"
import {
  PLATFORM_ADMIN_ALLOWED_SEGMENTS,
  organizationOperatorPath,
} from "#features/platform-admin"
import { organizationOrbitPath } from "#features/planner"

type LegacySurface = "account" | "operator"

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
  if (orbitMatch && ORBIT_DASHBOARD_SURFACE_SEGMENT_SET.has(orbitMatch[1]!)) {
    return organizationOrbitPath(orgSlug, orbitMatch[1] as never)
  }
  return organizationAccountPath(orgSlug)
}

function resolveOperatorAliasPath(orgSlug: string, pathname: string): Route {
  if (pathname === "/operator") {
    return organizationOperatorPath(orgSlug) as Route
  }
  const match = pathname.match(/^\/operator\/([^/]+)$/)
  if (match && PLATFORM_ADMIN_ALLOWED_SEGMENTS.includes(match[1]!)) {
    return organizationOperatorPath(orgSlug, match[1]) as Route
  }
  return organizationOperatorPath(orgSlug) as Route
}

function resolveAliasPath(
  surface: LegacySurface,
  orgSlug: string,
  pathname: string
): Route {
  switch (surface) {
    case "account":
      return resolveAccountAliasPath(orgSlug, pathname)
    case "operator":
      return resolveOperatorAliasPath(orgSlug, pathname)
  }
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

  const target = resolveAliasPath(input.surface, orgSlug, localeInternalPath)

  redirect(
    toLocalePath(
      input.locale,
      withForwardedSearch(target, search) as never
    ) as Route
  )
}
