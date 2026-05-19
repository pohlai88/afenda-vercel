import { getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildFwaEligibilityRulesListSurfaceConfiguration } from "../data/fwa-surface-builders.server"
import { listFwaEligibilityRulesForOrg } from "../data/fwa-eligibility.server"
import type { FwaArrangementTypeChoiceRow } from "../data/fwa.types.shared"
import { FwaEligibilityCreateDialog } from "./fwa-eligibility-create-dialog.client"

export async function FwaEligibilityRulesSection({
  organizationId,
  arrangementTypes,
  canManage,
}: {
  organizationId: string
  arrangementTypes: FwaArrangementTypeChoiceRow[]
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.flexibleWork")
  const rows = await listFwaEligibilityRulesForOrg(organizationId)

  const listConfiguration = buildFwaEligibilityRulesListSurfaceConfiguration(
    rows,
    {
      empty: t("eligibilityEmpty"),
      colType: t("colType"),
      colDepartment: t("colDepartment"),
      colGrade: t("colGrade"),
      colEmployment: t("colEmployment"),
      colCountry: t("colCountry"),
      colLocation: t("colLocation"),
      colScope: t("colScope"),
      colException: t("colException"),
      colActive: t("colActive"),
      yesNo: (value) => (value ? t("yes") : t("no")),
      anyLabel: t("anyCriteria"),
      formatScope: (row) => {
        const parts: string[] = []
        if (row.legalEntityCode) {
          parts.push(`${t("scopeLegalEntity")}: ${row.legalEntityCode}`)
        }
        if (row.positionId) {
          parts.push(`${t("scopeRole")}: ${row.positionId}`)
        }
        if (row.workerCategory) {
          parts.push(`${t("scopeWorkerCategory")}: ${row.workerCategory}`)
        }
        if (row.policyGroupCode) {
          parts.push(`${t("scopePolicyGroup")}: ${row.policyGroupCode}`)
        }
        return parts.length > 0 ? parts.join(" · ") : t("anyCriteria")
      },
    }
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("eligibilityTitle")}</CardTitle>
        <CardDescription>{t("eligibilityDescriptionExtended")}</CardDescription>
        {canManage ? (
          <CardAction>
            <FwaEligibilityCreateDialog arrangementTypes={arrangementTypes} />
          </CardAction>
        ) : null}
      </CardHeader>
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        description=""
        surfaceKey="hrm:flexible-work:eligibility"
        listConfiguration={listConfiguration}
      />
    </Card>
  )
}
