import { getTranslations } from "next-intl/server"

import {
  PlatformAdminOrganizationsTable,
  listOrganizationsForPlatformAdmin,
} from "#features/platform-admin"
import { requireGlobalAdminSession } from "#lib/tenant"

export default async function OrganizationPlatformAdminOrganizationsPage() {
  await requireGlobalAdminSession()

  const t = await getTranslations("PlatformAdmin.organizations")
  const organizations = await listOrganizationsForPlatformAdmin()

  return (
    <div className="p-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t("countLabel", { count: organizations.length })}
        </p>

        <PlatformAdminOrganizationsTable organizations={organizations} />
      </section>
    </div>
  )
}
