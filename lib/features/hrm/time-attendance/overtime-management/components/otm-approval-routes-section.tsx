import { getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildOtmApprovalRoutesListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { listOtmApprovalRoutesForOrg } from "../data/otm-approval-route.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import type { OtmApprovalRouteRow } from "../data/otm.types.shared"
import {
  HRM_OTM_APPROVER_KINDS,
  type HrmOtmApproverKind,
} from "../schemas/otm-approval-route.shared"
import { OtmApprovalRouteCreateDialog } from "./otm-approval-route-create-dialog.client"

function formatExceptionFlags(
  row: OtmApprovalRouteRow,
  copy: {
    any: string
    eligibility: string
    policy: string
  }
): string {
  const parts: string[] = []
  if (row.requiresEligibilityException === true) {
    parts.push(copy.eligibility)
  }
  if (row.requiresPolicyException === true) {
    parts.push(copy.policy)
  }
  return parts.length > 0 ? parts.join(" · ") : copy.any
}

export async function OtmApprovalRoutesSection({
  organizationId,
  canManage,
}: {
  organizationId: string
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  const rows = await listOtmApprovalRoutesForOrg(organizationId)

  const listConfiguration = buildOtmApprovalRoutesListSurfaceConfiguration(
    rows,
    {
      empty: t("approvalRoutesEmpty"),
      colPriority: t("colRoutePriority"),
      colLabel: t("colRouteLabel"),
      colDepartment: t("colDepartment"),
      colCostCenter: t("colCostCenter"),
      colLocation: t("colLocation"),
      colGrade: t("colGrade"),
      colAmount: t("colRouteAmount"),
      colException: t("colRouteException"),
      colApprover: t("colRouteApprover"),
      colActive: t("colActive"),
      anyLabel: t("anyCriteria"),
      yesNo: (value) => (value ? t("yes") : t("no")),
      formatApproverKind: (kind) => {
        if (HRM_OTM_APPROVER_KINDS.includes(kind as HrmOtmApproverKind)) {
          return t(`approverKindLabels.${kind as HrmOtmApproverKind}`)
        }
        return kind
      },
      formatExceptionFlags: (row) =>
        formatExceptionFlags(row, {
          any: t("anyCriteria"),
          eligibility: t("routeExceptionEligibility"),
          policy: t("routeExceptionPolicy"),
        }),
    }
  )

  if (!canManage) return null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("approvalRoutesTitle")}</CardTitle>
        <CardDescription>{t("approvalRoutesDescription")}</CardDescription>
        <CardAction>
          <OtmApprovalRouteCreateDialog />
        </CardAction>
      </CardHeader>
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        description=""
        surfaceKey={OTM_LIST_SURFACE_IDS.approvalRoutes}
        listConfiguration={listConfiguration}
      />
    </Card>
  )
}
