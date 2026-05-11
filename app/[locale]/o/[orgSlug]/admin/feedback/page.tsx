import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"

import { organizationAdminPath } from "#features/org-admin"
import { OrgFeedbackList } from "#features/org-feedback"
import {
  listOrgFeedbackEvents,
  parseOrgFeedbackListStateFilter,
} from "#features/org-feedback/server"

import {
  searchParamFirst,
  searchParamPositiveInt,
} from "#lib/app-search-params.shared"
import { requireOrgSession } from "#lib/tenant"

export default async function OrgAdminFeedbackPage({
  searchParams,
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/feedback">) {
  const { orgSlug } = await params
  const orgSession = await requireOrgSession()
  const t = await getTranslations("OrgAdmin.feedback")
  const sp = await searchParams

  const page = searchParamPositiveInt(sp, "page", 1)
  const stateFilter = parseOrgFeedbackListStateFilter(
    searchParamFirst(sp, "state")
  )

  const result = await listOrgFeedbackEvents({
    organizationId: orgSession.organizationId,
    page,
    stateFilter,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <OrgFeedbackList
        orgSlug={orgSlug}
        result={result}
        stateFilter={stateFilter}
      />

      <p className="text-sm text-muted-foreground">
        <Link
          href={organizationAdminPath(orgSlug, "overview")}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("backToWorkbench")}
        </Link>
      </p>
    </div>
  )
}
