import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"

import { KnowledgeSourcesAdminPanel } from "#features/knowledge"
import { organizationAdminPath } from "#features/org-admin"

import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAdminKnowledgeSourcesPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/knowledge/sources">) {
  const { orgSlug } = await params
  const t = await getTranslations("OrgAdmin.knowledge")
  const session = await getOrgTenantContext()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <KnowledgeSourcesAdminPanel
        organizationId={session.organizationId}
        orgSlug={orgSlug}
      />

      <p className="text-sm text-muted-foreground">
        <Link
          href={organizationAdminPath(orgSlug, "overview")}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("backAdmin")}
        </Link>
      </p>
    </div>
  )
}
