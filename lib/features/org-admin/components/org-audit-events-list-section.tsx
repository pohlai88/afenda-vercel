import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import type { OrganizationIamAuditRow } from "#lib/auth"

import { buildOrgAuditListSurfaceConfiguration } from "../data/org-audit-list-surface.server"

type OrgAuditEventsListSectionProps = {
  rows: readonly OrganizationIamAuditRow[]
}

export async function OrgAuditEventsListSection({
  rows,
}: OrgAuditEventsListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("OrgAdmin.audit.events"),
    getFormatter(),
  ])

  const listConfiguration = buildOrgAuditListSurfaceConfiguration(rows, {
    empty: t("empty"),
    colWhen: t("headerWhen"),
    colOrigin: t("headerOrigin"),
    colAction: t("headerAction"),
    colActor: t("headerActor"),
    colResource: t("headerResource"),
    colDetails: t("headerDetails"),
    noValue: t("noValue"),
    formatWhen: (date) =>
      format.dateTime(date, {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
  })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="org-admin:audit-events"
      resolveConfiguredPermission={false}
    />
  )
}
