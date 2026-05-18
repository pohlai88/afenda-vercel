import { getTranslations } from "next-intl/server"

import {
  PlatformAdminOrganizationsListSection,
  listOrganizationsForPlatformAdmin,
} from "#features/platform-admin"

export default async function PlatformAdminOrganizationsPage() {
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

        <PlatformAdminOrganizationsListSection organizations={organizations} />
      </section>
    </div>
  )
}
