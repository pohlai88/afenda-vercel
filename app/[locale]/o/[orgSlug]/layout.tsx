import type { ReactNode } from "react"

import type { Route } from "next"
import { notFound, permanentRedirect } from "next/navigation"

import { localePrefixedOrgDashboardRedirect } from "#lib/dashboard-org-redirect.server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"
import {
  getOrganizationIdBySlug,
  getOrganizationSlugById,
} from "#lib/org-slug.server"
import { requireOrgSession } from "#lib/tenant"

export default async function OrgSlugLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug: orgSlugRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const orgSlug = normalizeOrgSlugParam(orgSlugRaw)
  if (!orgSlug) {
    notFound()
  }

  const resolvedOrgId = await getOrganizationIdBySlug(orgSlug)
  if (!resolvedOrgId) {
    notFound()
  }

  const session = await requireOrgSession()
  const canonicalSlug = await getOrganizationSlugById(session.organizationId)
  if (!canonicalSlug) {
    notFound()
  }

  if (resolvedOrgId !== session.organizationId) {
    const target = await localePrefixedOrgDashboardRedirect(
      locale,
      canonicalSlug
    )
    permanentRedirect(target as Route)
  }

  return children
}
