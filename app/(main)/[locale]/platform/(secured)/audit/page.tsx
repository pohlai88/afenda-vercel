import { getTranslations } from "next-intl/server"

import {
  GovernedSection,
  GovernedSurface,
  parsePageHeaderData,
} from "#features/governed-surface"
import { platformPath } from "#features/platform-admin"

export default async function PlatformAdminAuditPage() {
  const t = await getTranslations("PlatformAdmin.audit")

  const headerParsed = parsePageHeaderData({
    eyebrow: t("eyebrow"),
    title: t("title"),
    description: t("description"),
    backHref: platformPath(),
    backLabel: t("backToOperator"),
  })
  if (!headerParsed.success) {
    throw new Error(
      "PlatformAdminAuditPage: invalid governed page header payload"
    )
  }

  return (
    <div className="p-6">
      <GovernedSurface header={headerParsed.data}>
        <GovernedSection title={t("cardTitle")}>
          <p className="text-sm text-muted-foreground">{t("cardBody")}</p>
        </GovernedSection>
      </GovernedSurface>
    </div>
  )
}
