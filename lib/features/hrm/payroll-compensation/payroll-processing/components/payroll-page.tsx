import "server-only"
import { ErpAccessDenied } from "#features/erp-rbac/client"

import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { requireOrgSession } from "#lib/auth"
import { resolvePayrollSurfaceCapabilities } from "../data/payroll-capabilities.server"

import { PayrollConsolePage } from "./payroll-console"
import { PayrollCloseChecklistListSection } from "./payroll-close-checklist-list-section"
import { PayrollRunListSection } from "./payroll-run-list-section"
import { PayrollTraceabilityListSection } from "./payroll-traceability-list-section"
import {
  getPendingPayrollPeriodLockApprovalId,
  hasApprovedPayrollPeriodLockApproval,
  isAttendancePayrollReadyForPeriod,
  listPayrollPeriodsForOrg,
  listPayrollRunsForPeriod,
  type PayrollPeriodRow,
  type PayrollRunRow,
} from "../data/payroll.queries.server"
import {
  derivePayrollTraceability,
  type PayrollPeriodTraceability,
} from "../data/payroll-engine.server"
import type { PayrollCloseSnapshot } from "../data/payroll-close.shared"
import { buildPayrollCloseSnapshot } from "../data/payroll-close.server"
import type { PayrollPostingRecord } from "../data/payroll-posting.shared"
import { getPayrollPostingRecord } from "../data/payroll-posting.server"
import {
  countApprovedUnpaidApClaimsForOrg,
  listApprovedUnpaidClaimsForPeriod,
} from "../../expenses-reimbursement/data/claim.queries.server"
import { CountryPayrollConfigPanel } from "../../multi-country-payroll/components/country-payroll-config-panel"
import { CrossCountryPayrollSummaryPanel } from "../../multi-country-payroll/components/cross-country-payroll-summary-panel"
import type {
  PayrollConsolePeriod,
  PayrollConsoleProps,
  PayrollConsoleRun,
  PayrollPeriodConsoleView,
} from "../data/payroll-console-view.shared"

function toIsoDateTime(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function serializePeriod(period: PayrollPeriodRow): PayrollConsolePeriod {
  return {
    ...period,
    lockedAt: toIsoDateTime(period.lockedAt),
    postedAt: toIsoDateTime(period.postedAt),
    createdAt: period.createdAt.toISOString(),
    updatedAt: period.updatedAt.toISOString(),
  }
}

function serializeRun(run: PayrollRunRow): PayrollConsoleRun {
  return {
    ...run,
    computedAt: toIsoDateTime(run.computedAt),
  }
}

function getPayrollReportRange(
  periods: readonly PayrollPeriodRow[]
): { periodStart: string; periodEnd: string } | null {
  if (periods.length === 0) {
    return null
  }

  return periods.reduce(
    (range, period) => ({
      periodStart:
        period.periodStart < range.periodStart
          ? period.periodStart
          : range.periodStart,
      periodEnd:
        period.periodEnd > range.periodEnd ? period.periodEnd : range.periodEnd,
    }),
    {
      periodStart: periods[0].periodStart,
      periodEnd: periods[0].periodEnd,
    }
  )
}

async function buildPeriodConsoleView(input: {
  organizationId: string
  period: PayrollPeriodRow
}): Promise<PayrollPeriodConsoleView> {
  const runs = await listPayrollRunsForPeriod(
    input.organizationId,
    input.period.id
  )

  const [
    attendanceComplete,
    approvalExists,
    pendingLockApprovalId,
    approvedUnpaidPayrollClaims,
    approvedUnpaidApClaimCount,
    closeSnapshot,
    postingRecord,
  ] = await Promise.all([
    isAttendancePayrollReadyForPeriod({
      organizationId: input.organizationId,
      periodStart: input.period.periodStart,
      periodEnd: input.period.periodEnd,
    }),
    hasApprovedPayrollPeriodLockApproval(input.organizationId, input.period.id),
    getPendingPayrollPeriodLockApprovalId(
      input.organizationId,
      input.period.id
    ),
    listApprovedUnpaidClaimsForPeriod(
      input.organizationId,
      input.period.periodStart,
      input.period.periodEnd
    ),
    countApprovedUnpaidApClaimsForOrg(input.organizationId),
    buildPayrollCloseSnapshot({
      organizationId: input.organizationId,
      periodId: input.period.id,
    }),
    getPayrollPostingRecord({
      organizationId: input.organizationId,
      periodId: input.period.id,
    }),
  ])

  const traceability: PayrollPeriodTraceability = derivePayrollTraceability({
    runs,
    attendanceComplete,
    rulePackVersion: input.period.rulePackVersion,
    approvalExists,
    approvedUnpaidClaimCount: approvedUnpaidPayrollClaims.length,
    approvedUnpaidApClaimCount,
  })

  const serializedRuns = runs.map(serializeRun)
  const showRunsList =
    (input.period.state === "preparing" || input.period.state !== "open") &&
    serializedRuns.length > 0

  return {
    period: serializePeriod(input.period),
    runs: serializedRuns,
    runsList: showRunsList ? (
      <PayrollRunListSection runs={serializedRuns} />
    ) : null,
    closeChecklistList: closeSnapshot ? (
      <PayrollCloseChecklistListSection items={closeSnapshot.checklist} />
    ) : null,
    traceabilityList: (
      <PayrollTraceabilityListSection traceability={traceability} />
    ),
    traceability,
    closeSnapshot: closeSnapshot as PayrollCloseSnapshot | null,
    postingRecord: postingRecord as PayrollPostingRecord | null,
    pendingLockApprovalId,
  }
}

export async function PayrollPage() {
  const [capabilities, session, t] = await Promise.all([
    resolvePayrollSurfaceCapabilities(),
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.payroll"),
  ])

  if (!capabilities.canSearch) {
    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  const periods = await listPayrollPeriodsForOrg(session.organizationId)
  const reportRange = getPayrollReportRange(periods)
  const periodViews = await Promise.all(
    periods.map((period) =>
      buildPeriodConsoleView({
        organizationId: session.organizationId,
        period,
      })
    )
  )

  const props: PayrollConsoleProps = {
    capabilities,
    periods: periodViews,
  }

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <CountryPayrollConfigPanel />
        {reportRange ? (
          <CrossCountryPayrollSummaryPanel
            organizationId={session.organizationId}
            periodStart={reportRange.periodStart}
            periodEnd={reportRange.periodEnd}
          />
        ) : null}
      </div>
      <PayrollConsolePage {...props} />
    </div>
  )
}
