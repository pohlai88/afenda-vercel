import { getTranslations } from "next-intl/server"

import { GovernedSurface } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import { buildGovernedToolsWorkbenchHeader } from "../../_module-governance/tools-governed-page-header.server"
import { listRecentImportSessions } from "../data/hrm-import.queries.server"

import { HrmImportWizard } from "./hrm-import-wizard"
import { HrmImportsListSection } from "./hrm-imports-list-section"

type HrmImportsPageProps = {
  orgSlug: string
}

export async function HrmImportsPage({ orgSlug }: HrmImportsPageProps) {
  const { organizationId } = await requireOrgSession()
  const [t, sessions, header] = await Promise.all([
    getTranslations("Dashboard.Hrm.imports"),
    listRecentImportSessions(organizationId),
    buildGovernedToolsWorkbenchHeader(orgSlug, "Dashboard.Hrm.imports", {
      eyebrow: "eyebrow",
      title: "title",
      description: "description",
    }),
  ])

  return (
    <GovernedSurface header={header} className="flex flex-col gap-6 p-6">
      <HrmImportWizard orgSlug={orgSlug} />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("recentTitle")}</CardTitle>
          <CardDescription>{t("recentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <HrmImportsListSection orgSlug={orgSlug} sessions={sessions} />
        </CardContent>
      </Card>
    </GovernedSurface>
  )
}
