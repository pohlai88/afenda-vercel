import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import {
  buildBonusClawbacksListSurfaceConfiguration,
  buildBonusCyclesListSurfaceConfiguration,
  buildBonusPayoutsListSurfaceConfiguration,
  buildBonusPlansListSurfaceConfiguration,
  buildBonusReportsListSurfaceConfiguration,
} from "../data/bonus-incentive-list-surface.server"
import type {
  BonusClawbackRow,
  BonusCycleRow,
  BonusEmployeeChoice,
  BonusPayrollPeriodChoice,
  BonusPayoutRow,
  BonusPlanRow,
  BonusReportSnapshot,
} from "../data/bonus-incentive.queries.server"

import {
  BonusCycleActionPanel,
  BonusPayoutActionPanel,
} from "./bonus-incentive-forms"

export async function BonusPlansSection({
  rows,
}: {
  readonly rows: readonly BonusPlanRow[]
}) {
  const t = await getTranslations("Dashboard.Hrm.bonusIncentives.tables")
  return (
    <GovernedPatternCListSection
      title={t("plansTitle")}
      description={t("plansDescription")}
      surfaceKey="hrm:bonus-incentives:plans"
      listConfiguration={buildBonusPlansListSurfaceConfiguration(rows, {
        empty: t("plansEmpty"),
        colCode: t("colCode"),
        colName: t("colName"),
        colType: t("colType"),
        colFormula: t("colFormula"),
        colStatus: t("colStatus"),
        active: t("active"),
        inactive: t("inactive"),
      })}
    />
  )
}

export async function BonusCyclesSection({
  rows,
  employees,
}: {
  readonly rows: readonly BonusCycleRow[]
  readonly employees: readonly BonusEmployeeChoice[]
}) {
  const t = await getTranslations("Dashboard.Hrm.bonusIncentives.tables")
  const rowById = new Map(rows.map((row) => [row.id, row]))
  return (
    <GovernedPatternCListSection
      title={t("cyclesTitle")}
      description={t("cyclesDescription")}
      surfaceKey="hrm:bonus-incentives:cycles"
      listConfiguration={buildBonusCyclesListSurfaceConfiguration(rows, {
        empty: t("cyclesEmpty"),
        colCode: t("colCode"),
        colPlan: t("colPlan"),
        colPeriod: t("colPeriod"),
        colPayout: t("colPayout"),
        colState: t("colState"),
      })}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          const trailingAction = surfaceRow.trailingAction
          if (!row || !isListSurfaceTrailingActionRenderable(trailingAction)) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <BonusCycleActionPanel cycle={row} employees={employees} />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}

export async function BonusPayoutsSection({
  rows,
  payrollPeriods,
}: {
  readonly rows: readonly BonusPayoutRow[]
  readonly payrollPeriods: readonly BonusPayrollPeriodChoice[]
}) {
  const t = await getTranslations("Dashboard.Hrm.bonusIncentives.tables")
  const rowById = new Map(rows.map((row) => [row.id, row]))
  return (
    <GovernedPatternCListSection
      title={t("payoutsTitle")}
      description={t("payoutsDescription")}
      surfaceKey="hrm:bonus-incentives:payouts"
      listConfiguration={buildBonusPayoutsListSurfaceConfiguration(rows, {
        empty: t("payoutsEmpty"),
        colEmployee: t("colEmployee"),
        colPlan: t("colPlan"),
        colCalculated: t("colCalculated"),
        colApproved: t("colApproved"),
        colState: t("colState"),
        colFlags: t("colFlags"),
      })}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          const trailingAction = surfaceRow.trailingAction
          if (!row || !isListSurfaceTrailingActionRenderable(trailingAction)) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <BonusPayoutActionPanel
                payout={row}
                payrollPeriods={payrollPeriods}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}

export async function BonusClawbacksSection({
  rows,
}: {
  readonly rows: readonly BonusClawbackRow[]
}) {
  const t = await getTranslations("Dashboard.Hrm.bonusIncentives.tables")
  return (
    <GovernedPatternCListSection
      title={t("clawbacksTitle")}
      description={t("clawbacksDescription")}
      surfaceKey="hrm:bonus-incentives:clawbacks"
      listConfiguration={buildBonusClawbacksListSurfaceConfiguration(rows, {
        empty: t("clawbacksEmpty"),
        colEmployee: t("colEmployee"),
        colType: t("colType"),
        colAmount: t("colAmount"),
        colReason: t("colReason"),
        colState: t("colState"),
      })}
    />
  )
}

export async function BonusReportsSection({
  snapshot,
}: {
  readonly snapshot: BonusReportSnapshot
}) {
  const t = await getTranslations("Dashboard.Hrm.bonusIncentives.tables")
  return (
    <GovernedPatternCListSection
      title={t("reportsTitle")}
      description={t("reportsDescription")}
      surfaceKey="hrm:bonus-incentives:reports"
      listConfiguration={buildBonusReportsListSurfaceConfiguration(snapshot, {
        colMetric: t("colMetric"),
        colValue: t("colValue"),
        activePlans: t("activePlans"),
        cycles: t("cycles"),
        payouts: t("payouts"),
        pendingApproval: t("pendingApproval"),
        approvedAmount: t("approvedAmount"),
        exportedAmount: t("exportedAmount"),
        clawbackAmount: t("clawbackAmount"),
      })}
    />
  )
}
