import { getTranslations } from "next-intl/server"

import {
  GovernedSurface,
  parsePageHeaderData,
} from "#features/governed-surface"
import { organizationAdminPath } from "#features/org-admin"
import { OrgFeedbackList } from "#features/org-feedback"
import {
  listOrgFeedbackEvents,
  resolveOrgFeedbackInboxSearchParams,
} from "#features/org-feedback/server"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAdminFeedbackPage({
  searchParams,
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/feedback">) {
  const { orgSlug } = await params
  const orgSession = await getOrgTenantContext()
  const t = await getTranslations("OrgAdmin.feedback")

  const { page, stateFilter } =
    await resolveOrgFeedbackInboxSearchParams(searchParams)

  const result = await listOrgFeedbackEvents({
    organizationId: orgSession.organizationId,
    page,
    stateFilter,
  })

  const headerParsed = parsePageHeaderData({
    title: t("title"),
    description: t("description"),
    backHref: organizationAdminPath(orgSlug, "overview"),
    backLabel: t("backToAdminOverview"),
  })
  if (!headerParsed.success) {
    throw new Error(
      "OrgAdminFeedbackPage: invalid governed page header payload"
    )
  }

  return (
    <GovernedSurface header={headerParsed.data}>
      <OrgFeedbackList
        orgSlug={orgSlug}
        result={result}
        stateFilter={stateFilter}
      />
    </GovernedSurface>
  )
}
