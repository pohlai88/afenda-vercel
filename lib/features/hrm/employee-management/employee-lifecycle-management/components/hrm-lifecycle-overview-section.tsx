import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildEmployeeLifecycleListSurfaceConfiguration } from "../data/employee-lifecycle-list-surface.server"
import { EMPLOYEE_LIFECYCLE_LIST_SURFACE_IDS } from "../data/employee-lifecycle-list-surface-ids.shared"
import { listEmployeeLifecycleOverviewForOrganization } from "../data/employee-lifecycle-overview.queries.server"
import type { EmployeeLifecycleStage } from "../data/employee-lifecycle-stage.shared"

const LIFECYCLE_STAGE_KEYS = [
  "pre_hire",
  "pre_boarding",
  "onboarding",
  "probation",
  "confirmed",
  "active",
  "suspended",
  "notice_period",
  "offboarding",
  "separated",
  "retired",
  "archived",
] as const satisfies readonly EmployeeLifecycleStage[]

type HrmLifecycleOverviewSectionProps = {
  orgSlug: string
  organizationId: string
  canRead: boolean
}

export async function HrmLifecycleOverviewSection({
  orgSlug,
  organizationId,
  canRead,
}: HrmLifecycleOverviewSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.lifecycle")

  const stageLabels = Object.fromEntries(
    LIFECYCLE_STAGE_KEYS.map((key) => [key, t(`stage.${key}`)])
  ) as Record<string, string>

  const copy = {
    empty: t("tableEmpty"),
    colEmployeeNumber: t("colEmployeeNumber"),
    colLegalName: t("colLegalName"),
    colEmploymentStatus: t("colEmploymentStatus"),
    colStage: t("colStage"),
    colEffectiveDate: t("colEffectiveDate"),
    colPending: t("colPending"),
    colLastWorkingDate: t("colLastWorkingDate"),
    colReason: t("colReason"),
    colApprovalReference: t("colApprovalReference"),
    stageLabels,
    emptyValue: t("emptyValue"),
  }

  let listConfiguration = buildEmployeeLifecycleListSurfaceConfiguration(
    [],
    orgSlug,
    copy
  )
  let surfaceKey: string = EMPLOYEE_LIFECYCLE_LIST_SURFACE_IDS.overview
  let loadError:
    | {
        variant: "error"
        title: string
      }
    | undefined

  if (canRead) {
    try {
      const rows = await listEmployeeLifecycleOverviewForOrganization(
        organizationId
      )
      listConfiguration = buildEmployeeLifecycleListSurfaceConfiguration(
        rows,
        orgSlug,
        copy
      )
    } catch (error) {
      logUnexpectedServerError(
        "hrm-lifecycle-overview-section: query failed",
        error,
        { organizationId }
      )
      surfaceKey = EMPLOYEE_LIFECYCLE_LIST_SURFACE_IDS.overviewError
      loadError = {
        variant: "error",
        title: t("tableLoadFailed"),
      }
    }
  }

  return (
    <GovernedPatternCListSection
      title={t("tableTitle")}
      description={t("tableDescription")}
      listConfiguration={listConfiguration}
      surfaceKey={surfaceKey}
      parentAccessAllowed={canRead}
      loadError={loadError}
      forbidden={{
        variant: "forbidden",
        title: t("forbiddenTitle"),
        description: t("forbiddenDescription"),
      }}
      invalid={{
        variant: "error",
        title: t("invalidConfigTitle"),
        description: t("invalidConfigDescription"),
      }}
    />
  )
}
