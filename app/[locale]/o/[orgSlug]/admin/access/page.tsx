import { getTranslations } from "next-intl/server"

import { GovernedSurface } from "#features/governed-surface"
import { AccessAdminPage } from "#features/erp-rbac"
import { recordOrgAdminPageVisit } from "#features/org-admin/server"
import { requireOrgSession } from "#lib/tenant"

export default async function OrgAdminAccessPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/access">) {
  const { orgSlug } = await params
  const orgSession = await requireOrgSession()
  const t = await getTranslations("OrgAdmin.access")

  await recordOrgAdminPageVisit({
    orgSession,
    orgSlug,
    segment: "access",
  })

  return (
    <GovernedSurface
      header={{
        title: t("title"),
        description: t("description"),
      }}
    >
      <AccessAdminPage organizationId={orgSession.organizationId} />
    </GovernedSurface>
  )
}
