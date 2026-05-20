import { getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildOtmEligibilityRulesListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { listOtmEligibilityRulesForOrg } from "../data/otm-eligibility.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import type { OtmTypeChoiceRow } from "../data/otm.types.shared"
import { OtmEligibilityCreateDialog } from "./otm-eligibility-create-dialog.client"

export async function OtmEligibilitySection({
  organizationId,
  overtimeTypes,
  canManage,
}: {
  organizationId: string
  overtimeTypes: OtmTypeChoiceRow[]
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  const rows = await listOtmEligibilityRulesForOrg(organizationId)

  const listConfiguration = buildOtmEligibilityRulesListSurfaceConfiguration(
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
        <CardDescription>{t("eligibilityDescription")}</CardDescription>
        {canManage && overtimeTypes.length > 0 ? (
          <CardAction>
            <OtmEligibilityCreateDialog overtimeTypes={overtimeTypes} />
          </CardAction>
        ) : null}
      </CardHeader>
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        description=""
        surfaceKey={OTM_LIST_SURFACE_IDS.eligibility}
        listConfiguration={listConfiguration}
      />
    </Card>
  )
}
