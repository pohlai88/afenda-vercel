import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { requireOrgSession } from "#lib/auth"

import { buildOffboardingDashboardListSurfaceConfiguration } from "../data/offboarding-list-surface.server"
import { listOffboardingInstancesForOrgDashboard } from "../data/offboarding-org-dashboard.queries.server"
import type { OffboardingSurfaceCapabilities } from "../data/offboarding-capabilities.shared"
import { OffboardingApprovalActions } from "./offboarding-approval-actions"

type OffboardingOrgDashboardPageProps = {
  orgSlug: string
  capabilities: OffboardingSurfaceCapabilities
}

export async function OffboardingOrgDashboardPage({
  orgSlug,
  capabilities,
}: OffboardingOrgDashboardPageProps) {
  const { organizationId } = await requireOrgSession()
  const [t, rows] = await Promise.all([
    getTranslations("Dashboard.Hrm.offboarding"),
    listOffboardingInstancesForOrgDashboard(organizationId),
  ])
  const listConfiguration = buildOffboardingDashboardListSurfaceConfiguration(
    rows,
    orgSlug,
    {
      title: t("dashboardTitle"),
      description: t("dashboardDescription"),
      empty: t("dashboardEmpty"),
      colEmployee: t("colEmployee"),
      colExitType: t("colExitType"),
      colStatus: t("colStatus"),
      colLastWorking: t("colLastWorking"),
      colTasks: t("colTasks"),
      colSettlement: t("colSettlement"),
      emptyValue: t("emptyValue"),
      taskCounts: ({ pending, overdue }) =>
        t("taskCounts", { pending, overdue }),
    }
  )
  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={t("dashboardTitle")}
      description={t("dashboardDescription")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:offboarding:dashboard"
      cardClassName="mt-0"
      forbidden={{
        variant: "forbidden",
        title: t("forbiddenTitle"),
        description: t("forbiddenDescription"),
      }}
      invalid={{
        variant: "error",
        title: t("dashboardLoadFailed"),
      }}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (!row || row.status !== "pending_approval") return null
          return (
            <OffboardingApprovalActions
              orgSlug={orgSlug}
              employeeId={row.employeeId}
              instanceId={row.id}
              capabilities={capabilities}
            />
          )
        },
      }}
    />
  )
}
