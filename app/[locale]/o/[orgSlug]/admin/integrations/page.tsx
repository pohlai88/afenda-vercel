import type { Route } from "next"

import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"

import {
  IntegrationsEndpointsPanel,
  IntegrationsImportsPanel,
  organizationAdminPath,
} from "#features/org-admin"

import { requireOrgSession } from "#lib/tenant"

export default async function OrgAdminIntegrationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const t = await getTranslations("OrgAdmin.integrations")
  const orgSession = await requireOrgSession()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <section className="space-y-3">
        <header>
          <h3 className="text-lg font-semibold tracking-tight">
            {t("sectionEndpointsTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("sectionEndpointsDescription")}
          </p>
        </header>
        <IntegrationsEndpointsPanel
          organizationId={orgSession.organizationId}
        />
      </section>

      <section className="space-y-3">
        <header>
          <h3 className="text-lg font-semibold tracking-tight">
            {t("sectionImportsTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("sectionImportsDescription")}
          </p>
        </header>
        <IntegrationsImportsPanel organizationId={orgSession.organizationId} />
      </section>

      <p className="text-sm text-muted-foreground">
        <Link
          href={organizationAdminPath(orgSlug, "overview") as Route}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("backAdmin")}
        </Link>
      </p>
    </div>
  )
}
