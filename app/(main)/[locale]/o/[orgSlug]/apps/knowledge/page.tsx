import { redirect } from "#i18n/navigation"

import { organizationAppsPath } from "#lib/org-apps-module-paths"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"

export default async function OrgAppsKnowledgePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/knowledge">) {
  const { orgSlug } = await params
  const locale = await getRequestAppLocale()
  redirect({
    href: organizationAppsPath(orgSlug, "lynx"),
    locale,
  })
}
