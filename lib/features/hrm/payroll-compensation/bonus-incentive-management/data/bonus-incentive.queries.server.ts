import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBonusAssignment,
  hrmBonusClawback,
  hrmBonusCycle,
  hrmBonusPayout,
  hrmBonusPlan,
  hrmBonusTarget,
  hrmEmployee,
  hrmEmploymentContract,
  hrmPayrollPeriod,
} from "#lib/db/schema"

import type { BonusPayrollProjectionInput } from "./bonus-incentive-types.shared"

export type BonusPlanRow = {
  id: string
  organizationId: string
  code: string
  name: string
  description: string | null
  planType: string
  payoutFormulaType: string
  payoutFormulaConfig: Record<string, unknown>
  eligibilityRules: Record<string, unknown>
  targetType: string
  capAmount: string | null
  floorAmount: string | null
  guaranteedAmount: string | null
  defaultCurrency: string
  defaultPayrollLineCode: string
  accountingAllocation: Record<string, unknown> | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type BonusCycleRow = {
  id: string
  organizationId: string
  planId: string
  planName: string
  planCode: string
  code: string
  name: string
  periodStart: string
  periodEnd: string
  cutoffDate: string | null
  approvalDate: string | null
  payoutDate: string
  payrollPeriodId: string | null
  payrollPeriodLabel: string | null
  state: string
  createdAt: Date
  updatedAt: Date
}

export type BonusAssignmentRow = {
  id: string
  organizationId: string
  planId: string
  cycleId: string
  employeeId: string
  employeeNumber: string
  employeeLegalName: string
  eligibilityState: string
  eligibilitySnapshot: Record<string, unknown> | null
}

export type BonusTargetRow = {
  id: string
  organizationId: string
  cycleId: string
  assignmentId: string | null
  employeeId: string | null
  targetScope: string
  targetMetric: string
  targetValue: string
  actualValue: string | null
  achievementPercent: string | null
  weight: string | null
}

export type BonusPayoutRow = {
  id: string
  organizationId: string
  planId: string
  cycleId: string
  assignmentId: string | null
  employeeId: string
  employeeNumber: string
  employeeLegalName: string
  planName: string
  cycleName: string
  payoutNumber: string | null
  state: string
  targetAmount: string
  achievementPercent: string
  calculatedAmount: string
  adjustedAmount: string | null
  approvedAmount: string | null
  currency: string
  validationFlags: Array<{ code: string; message: string }>
  currentApprovalId: string | null
  payrollPeriodId: string | null
  paidByPayrollLineId: string | null
  paidAt: Date | null
  lockedAt: Date | null
}

export type BonusClawbackRow = {
  id: string
  organizationId: string
  payoutId: string
  payoutNumber: string | null
  employeeLegalName: string
  clawbackType: string
  amount: string
  currency: string
  reason: string
  recoveryState: string
  recoveryReference: string | null
  createdAt: Date
}

export type BonusReportSnapshot = {
  readonly planCount: number
  readonly activePlanCount: number
  readonly cycleCount: number
  readonly payoutCount: number
  readonly pendingApprovalCount: number
  readonly approvedAmount: string
  readonly exportedAmount: string
  readonly clawbackAmount: string
}

export type BonusEmployeeChoice = {
  readonly id: string
  readonly employeeNumber: string
  readonly legalName: string
  readonly employmentStatus: string
}

export type BonusPayrollPeriodChoice = {
  readonly id: string
  readonly label: string
}

function toMoneyNumber(value: string | null): number {
  if (!value) return 0
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number): string {
  return value.toFixed(2)
}

function periodLabel(row: {
  periodStart: string | Date | null
  periodEnd: string | Date | null
}): string | null {
  if (!row.periodStart || !row.periodEnd) return null
  const start =
    typeof row.periodStart === "string"
      ? row.periodStart.slice(0, 10)
      : row.periodStart.toISOString().slice(0, 10)
  const end =
    typeof row.periodEnd === "string"
      ? row.periodEnd.slice(0, 10)
      : row.periodEnd.toISOString().slice(0, 10)
  return `${start} - ${end}`
}

export async function listBonusPlansForOrganization(
  organizationId: string,
  limit = 200
): Promise<BonusPlanRow[]> {
  return db
    .select()
    .from(hrmBonusPlan)
    .where(eq(hrmBonusPlan.organizationId, organizationId))
    .orderBy(desc(hrmBonusPlan.createdAt))
    .limit(limit)
}

export async function listBonusCyclesForOrganization(
  organizationId: string,
  limit = 200
): Promise<BonusCycleRow[]> {
  const rows = await db
    .select({
      id: hrmBonusCycle.id,
      organizationId: hrmBonusCycle.organizationId,
      planId: hrmBonusCycle.planId,
      planName: hrmBonusPlan.name,
      planCode: hrmBonusPlan.code,
      code: hrmBonusCycle.code,
      name: hrmBonusCycle.name,
      periodStart: hrmBonusCycle.periodStart,
      periodEnd: hrmBonusCycle.periodEnd,
      cutoffDate: hrmBonusCycle.cutoffDate,
      approvalDate: hrmBonusCycle.approvalDate,
      payoutDate: hrmBonusCycle.payoutDate,
      payrollPeriodId: hrmBonusCycle.payrollPeriodId,
      payrollPeriodStart: hrmPayrollPeriod.periodStart,
      payrollPeriodEnd: hrmPayrollPeriod.periodEnd,
      state: hrmBonusCycle.state,
      createdAt: hrmBonusCycle.createdAt,
      updatedAt: hrmBonusCycle.updatedAt,
    })
    .from(hrmBonusCycle)
    .innerJoin(hrmBonusPlan, eq(hrmBonusPlan.id, hrmBonusCycle.planId))
    .leftJoin(
      hrmPayrollPeriod,
      eq(hrmPayrollPeriod.id, hrmBonusCycle.payrollPeriodId)
    )
    .where(eq(hrmBonusCycle.organizationId, organizationId))
    .orderBy(desc(hrmBonusCycle.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    ...row,
    payrollPeriodLabel: periodLabel({
      periodStart: row.payrollPeriodStart,
      periodEnd: row.payrollPeriodEnd,
    }),
  }))
}

export async function listBonusAssignmentsForCycle(
  organizationId: string,
  cycleId: string
): Promise<BonusAssignmentRow[]> {
  return db
    .select({
      id: hrmBonusAssignment.id,
      organizationId: hrmBonusAssignment.organizationId,
      planId: hrmBonusAssignment.planId,
      cycleId: hrmBonusAssignment.cycleId,
      employeeId: hrmBonusAssignment.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeLegalName: hrmEmployee.legalName,
      eligibilityState: hrmBonusAssignment.eligibilityState,
      eligibilitySnapshot: hrmBonusAssignment.eligibilitySnapshot,
    })
    .from(hrmBonusAssignment)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmBonusAssignment.employeeId))
    .where(
      and(
        eq(hrmBonusAssignment.organizationId, organizationId),
        eq(hrmBonusAssignment.cycleId, cycleId)
      )
    )
    .orderBy(hrmEmployee.legalName)
}

export async function listBonusTargetsForCycle(
  organizationId: string,
  cycleId: string
): Promise<BonusTargetRow[]> {
  return db
    .select({
      id: hrmBonusTarget.id,
      organizationId: hrmBonusTarget.organizationId,
      cycleId: hrmBonusTarget.cycleId,
      assignmentId: hrmBonusTarget.assignmentId,
      employeeId: hrmBonusTarget.employeeId,
      targetScope: hrmBonusTarget.targetScope,
      targetMetric: hrmBonusTarget.targetMetric,
      targetValue: hrmBonusTarget.targetValue,
      actualValue: hrmBonusTarget.actualValue,
      achievementPercent: hrmBonusTarget.achievementPercent,
      weight: hrmBonusTarget.weight,
    })
    .from(hrmBonusTarget)
    .where(
      and(
        eq(hrmBonusTarget.organizationId, organizationId),
        eq(hrmBonusTarget.cycleId, cycleId)
      )
    )
}

export async function listBonusPayoutsForOrganization(
  organizationId: string,
  limit = 500
): Promise<BonusPayoutRow[]> {
  return db
    .select({
      id: hrmBonusPayout.id,
      organizationId: hrmBonusPayout.organizationId,
      planId: hrmBonusPayout.planId,
      cycleId: hrmBonusPayout.cycleId,
      assignmentId: hrmBonusPayout.assignmentId,
      employeeId: hrmBonusPayout.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeLegalName: hrmEmployee.legalName,
      planName: hrmBonusPlan.name,
      cycleName: hrmBonusCycle.name,
      payoutNumber: hrmBonusPayout.payoutNumber,
      state: hrmBonusPayout.state,
      targetAmount: hrmBonusPayout.targetAmount,
      achievementPercent: hrmBonusPayout.achievementPercent,
      calculatedAmount: hrmBonusPayout.calculatedAmount,
      adjustedAmount: hrmBonusPayout.adjustedAmount,
      approvedAmount: hrmBonusPayout.approvedAmount,
      currency: hrmBonusPayout.currency,
      validationFlags: hrmBonusPayout.validationFlags,
      currentApprovalId: hrmBonusPayout.currentApprovalId,
      payrollPeriodId: hrmBonusPayout.payrollPeriodId,
      paidByPayrollLineId: hrmBonusPayout.paidByPayrollLineId,
      paidAt: hrmBonusPayout.paidAt,
      lockedAt: hrmBonusPayout.lockedAt,
    })
    .from(hrmBonusPayout)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmBonusPayout.employeeId))
    .innerJoin(hrmBonusPlan, eq(hrmBonusPlan.id, hrmBonusPayout.planId))
    .innerJoin(hrmBonusCycle, eq(hrmBonusCycle.id, hrmBonusPayout.cycleId))
    .where(eq(hrmBonusPayout.organizationId, organizationId))
    .orderBy(desc(hrmBonusPayout.createdAt))
    .limit(limit)
}

export async function listBonusClawbacksForOrganization(
  organizationId: string,
  limit = 300
): Promise<BonusClawbackRow[]> {
  return db
    .select({
      id: hrmBonusClawback.id,
      organizationId: hrmBonusClawback.organizationId,
      payoutId: hrmBonusClawback.payoutId,
      payoutNumber: hrmBonusPayout.payoutNumber,
      employeeLegalName: hrmEmployee.legalName,
      clawbackType: hrmBonusClawback.clawbackType,
      amount: hrmBonusClawback.amount,
      currency: hrmBonusClawback.currency,
      reason: hrmBonusClawback.reason,
      recoveryState: hrmBonusClawback.recoveryState,
      recoveryReference: hrmBonusClawback.recoveryReference,
      createdAt: hrmBonusClawback.createdAt,
    })
    .from(hrmBonusClawback)
    .innerJoin(hrmBonusPayout, eq(hrmBonusPayout.id, hrmBonusClawback.payoutId))
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmBonusPayout.employeeId))
    .where(eq(hrmBonusClawback.organizationId, organizationId))
    .orderBy(desc(hrmBonusClawback.createdAt))
    .limit(limit)
}

export async function listBonusEmployeeChoices(
  organizationId: string
): Promise<BonusEmployeeChoice[]> {
  return db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      employmentStatus: hrmEmployee.employmentStatus,
    })
    .from(hrmEmployee)
    .where(eq(hrmEmployee.organizationId, organizationId))
    .orderBy(hrmEmployee.legalName)
}

export async function listBonusPayrollPeriodChoices(
  organizationId: string
): Promise<BonusPayrollPeriodChoice[]> {
  const rows = await db
    .select({
      id: hrmPayrollPeriod.id,
      periodStart: hrmPayrollPeriod.periodStart,
      periodEnd: hrmPayrollPeriod.periodEnd,
      state: hrmPayrollPeriod.state,
    })
    .from(hrmPayrollPeriod)
    .where(eq(hrmPayrollPeriod.organizationId, organizationId))
    .orderBy(desc(hrmPayrollPeriod.periodStart))
    .limit(100)
  return rows.map((row) => ({
    id: row.id,
    label: `${periodLabel(row) ?? row.id} (${row.state})`,
  }))
}

export async function getBonusPayoutForOrganization(
  organizationId: string,
  payoutId: string
): Promise<BonusPayoutRow | null> {
  const rows = await listBonusPayoutsForOrganization(organizationId, 1000)
  return rows.find((row) => row.id === payoutId) ?? null
}

export async function getBonusEmployeeSalaryContext(input: {
  readonly organizationId: string
  readonly employeeId: string
}): Promise<{
  readonly baseSalaryAmount: string
  readonly employmentStartDate: Date | null
  readonly employmentStatus: string
  readonly employmentType: string | null
  readonly departmentId: string | null
  readonly gradeId: string | null
} | null> {
  const rows = await db
    .select({
      employmentStartDate: hrmEmployee.employmentStartDate,
      employmentStatus: hrmEmployee.employmentStatus,
      employmentType: hrmEmployee.employmentType,
      departmentId: hrmEmployee.currentDepartmentId,
      gradeId: hrmEmployee.currentJobGradeId,
      baseSalaryAmount: hrmEmploymentContract.baseSalaryAmount,
    })
    .from(hrmEmployee)
    .leftJoin(
      hrmEmploymentContract,
      eq(hrmEmploymentContract.id, hrmEmployee.currentEmploymentContractId)
    )
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return {
    baseSalaryAmount: row.baseSalaryAmount ?? "0",
    employmentStartDate: row.employmentStartDate,
    employmentStatus: row.employmentStatus,
    employmentType: row.employmentType,
    departmentId: row.departmentId,
    gradeId: row.gradeId,
  }
}

export async function getBonusReportSnapshot(
  organizationId: string
): Promise<BonusReportSnapshot> {
  const [plans, cycles, payouts, clawbacks] = await Promise.all([
    listBonusPlansForOrganization(organizationId, 1000),
    listBonusCyclesForOrganization(organizationId, 1000),
    listBonusPayoutsForOrganization(organizationId, 2000),
    listBonusClawbacksForOrganization(organizationId, 2000),
  ])

  const approvedAmount = payouts
    .filter((row) => row.state === "approved" || row.state === "locked")
    .reduce(
      (sum, row) =>
        sum + toMoneyNumber(row.approvedAmount ?? row.calculatedAmount),
      0
    )
  const exportedAmount = payouts
    .filter(
      (row) => row.state === "exported_to_payroll" || row.state === "paid"
    )
    .reduce(
      (sum, row) =>
        sum + toMoneyNumber(row.approvedAmount ?? row.calculatedAmount),
      0
    )
  const clawbackAmount = clawbacks.reduce(
    (sum, row) => sum + toMoneyNumber(row.amount),
    0
  )

  return {
    planCount: plans.length,
    activePlanCount: plans.filter((row) => row.isActive).length,
    cycleCount: cycles.length,
    payoutCount: payouts.length,
    pendingApprovalCount: payouts.filter(
      (row) => row.state === "pending_approval"
    ).length,
    approvedAmount: formatMoney(approvedAmount),
    exportedAmount: formatMoney(exportedAmount),
    clawbackAmount: formatMoney(clawbackAmount),
  }
}

export async function listApprovedBonusPayoutPayrollInputsForPeriod(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly payrollPeriodId: string
}): Promise<BonusPayrollProjectionInput[]> {
  const rows = await db
    .select({
      payoutId: hrmBonusPayout.id,
      payoutNumber: hrmBonusPayout.payoutNumber,
      amount: hrmBonusPayout.approvedAmount,
      fallbackAmount: hrmBonusPayout.calculatedAmount,
      currency: hrmBonusPayout.currency,
      planName: hrmBonusPlan.name,
      payrollLineCode: hrmBonusPlan.defaultPayrollLineCode,
    })
    .from(hrmBonusPayout)
    .innerJoin(hrmBonusPlan, eq(hrmBonusPlan.id, hrmBonusPayout.planId))
    .where(
      and(
        eq(hrmBonusPayout.organizationId, input.organizationId),
        eq(hrmBonusPayout.employeeId, input.employeeId),
        eq(hrmBonusPayout.payrollPeriodId, input.payrollPeriodId),
        eq(hrmBonusPayout.state, "exported_to_payroll"),
        isNull(hrmBonusPayout.paidByPayrollLineId)
      )
    )

  return rows.map((row) => ({
    payoutId: row.payoutId,
    payrollLineCode: row.payrollLineCode,
    description: row.payoutNumber
      ? `${row.planName} (${row.payoutNumber})`
      : row.planName,
    amount: row.amount ?? row.fallbackAmount,
    currency: row.currency,
  }))
}
