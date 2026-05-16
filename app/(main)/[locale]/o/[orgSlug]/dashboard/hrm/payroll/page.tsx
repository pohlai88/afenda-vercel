import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { requireOrgSession } from "#lib/tenant"

import {
  buildPayrollCloseSnapshot,
  derivePayrollTraceability,
  getPayrollPostingRecord,
  getPendingPayrollPeriodLockApprovalId,
  hasApprovedPayrollPeriodLockApproval,
  isAttendancePayrollReadyForPeriod,
  listApprovedUnpaidClaimsForPeriod,
  listPayrollPeriodsForOrg,
  listPayrollRunsForPeriod,
} from "#features/hrm/server"
import type {
  PayrollPeriodRow,
  PayrollPeriodTraceability,
  PayrollPostingRecord,
  PayrollRunRow,
  PayrollCloseSnapshot,
} from "#features/hrm/server"
import { PayrollConsolePage } from "#features/hrm/client"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmPayrollPage() {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "payroll",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Payroll"
        description="This HRM surface requires Payroll search access."
      />
    )
  }
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.payroll")

  const periods: PayrollPeriodRow[] = await listPayrollPeriodsForOrg(
    session.organizationId
  )

  // Build per-period runs + traceability maps
  const periodRuns = new Map<string, PayrollRunRow[]>()
  const periodTraceability = new Map<string, PayrollPeriodTraceability>()
  const periodCloseSnapshots = new Map<string, PayrollCloseSnapshot | null>()
  const periodPostingRecords = new Map<string, PayrollPostingRecord | null>()
  const periodPendingLockApprovalIds = new Map<string, string | null>()

  await Promise.all(
    periods.map(async (period) => {
      const runs = await listPayrollRunsForPeriod(
        session.organizationId,
        period.id
      )
      periodRuns.set(period.id, runs)

      const [
        attendanceComplete,
        approvalExists,
        pendingLockApprovalId,
        approvedUnpaidClaims,
        closeSnapshot,
        postingRecord,
      ] = await Promise.all([
        isAttendancePayrollReadyForPeriod({
          organizationId: session.organizationId,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
        }),
        hasApprovedPayrollPeriodLockApproval(session.organizationId, period.id),
        getPendingPayrollPeriodLockApprovalId(
          session.organizationId,
          period.id
        ),
        listApprovedUnpaidClaimsForPeriod(
          session.organizationId,
          period.periodStart,
          period.periodEnd
        ),
        buildPayrollCloseSnapshot({
          organizationId: session.organizationId,
          periodId: period.id,
        }),
        getPayrollPostingRecord({
          organizationId: session.organizationId,
          periodId: period.id,
        }),
      ])

      periodPendingLockApprovalIds.set(period.id, pendingLockApprovalId)
      periodCloseSnapshots.set(period.id, closeSnapshot)
      periodPostingRecords.set(period.id, postingRecord)

      periodTraceability.set(
        period.id,
        derivePayrollTraceability({
          runs,
          attendanceComplete,
          rulePackVersion: period.rulePackVersion,
          approvalExists,
          approvedUnpaidClaimCount: approvedUnpaidClaims.length,
        })
      )
    })
  )

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />
      <PayrollConsolePage
        periods={periods}
        periodRuns={periodRuns}
        periodTraceability={periodTraceability}
        periodCloseSnapshots={periodCloseSnapshots}
        periodPostingRecords={periodPostingRecords}
        periodPendingLockApprovalIds={periodPendingLockApprovalIds}
      />
    </div>
  )
}
