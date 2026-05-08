import { notFound } from "next/navigation"

import { redirect } from "#i18n/navigation"

import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { getOrganizationSlugById } from "#lib/org-slug.server"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

/**
 * Canonical org resolver — `/{locale}/o` → `/{locale}/o/{slug}/dashboard`.
 * Requires a session with an active org; redirects to the tenant's ERP dashboard.
 */
export default async function OrgResolverPage() {
  const org = await requireOrgSession()
  const slug = await getOrganizationSlugById(org.organizationId)
  if (!slug) {
    notFound()
  }
  const locale = await getRequestAppLocale()
  redirect({ href: `/o/${slug}/dashboard`, locale })
}
