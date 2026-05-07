import { notFound } from "next/navigation"

import { redirect } from "#i18n/navigation"

import { legacyDashboardSegmentsToTail } from "#lib/dashboard-org-path.shared"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { getOrganizationSlugById } from "#lib/org-slug.server"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function LegacyDashboardRedirectPage({
  params,
}: {
  params: Promise<{ segments?: string[] }>
}) {
  const { segments } = await params
  const org = await requireOrgSession()
  const slug = await getOrganizationSlugById(org.organizationId)
  if (!slug) {
    notFound()
  }
  const tail = legacyDashboardSegmentsToTail(segments)
  const locale = await getRequestAppLocale()
  redirect({ href: `/o/${slug}/dashboard${tail}`, locale })
}
