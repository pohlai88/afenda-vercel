import { redirect } from "#i18n/navigation"

import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardIndexPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard">) {
  const { orgSlug } = await params
  const locale = await getRequestAppLocale()
  redirect({
    href: organizationDashboardPath(orgSlug, "onething"),
    locale,
  })
}
