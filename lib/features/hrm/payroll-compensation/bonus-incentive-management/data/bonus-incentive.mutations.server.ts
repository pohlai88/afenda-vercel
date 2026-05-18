import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBonusAdjustment,
  hrmBonusAssignment,
  hrmBonusClawback,
  hrmBonusCycle,
  hrmBonusPayout,
  hrmBonusPlan,
  hrmBonusTarget,
  hrmEmployee,
  hrmPayrollLine,
  hrmPayrollRun,
} from "#lib/db/schema"

import { BONUS_PAYOUT_APPROVAL_SUBJECT_KIND } from "../bonus-incentive.contract"
import {
  calculateBonusPayout,
  evaluateBonusEligibility,
  parseBonusEligibilityRules,
  parseBonusFormulaConfig,
} from "./bonus-incentive-engine.shared"
import {
  getBonusEmployeeSalaryContext,
  listBonusAssignmentsForCycle,
  listBonusTargetsForCycle,
} from "./bonus-incentive.queries.server"
import type {
  BonusEligibilityEmployee,
  BonusFormulaConfig,
  BonusPlanType,
  BonusFormulaType,
} from "./bonus-incentive-types.shared"

export type CreateBonusPlanInput = {
  readonly organizationId: string
  readonly code: string
  readonly name: string
  readonly description: string | null
  readonly planType: BonusPlanType
  readonly payoutFormulaType: BonusFormulaType
  readonly payoutFormulaConfig: BonusFormulaConfig
  readonly eligibilityRules: Record<string, unknown>
  readonly capAmount: string | null
  readonly floorAmount: string | null
  readonly guaranteedAmount: string | null
  readonly defaultCurrency: string
  readonly defaultPayrollLineCode: string
  readonly accountingAllocation: Record<string, unknown> | null
  readonly actorUserId: string
}

export async function createBonusPlanMutation(
  input: CreateBonusPlanInput
): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmBonusPlan).values({
    id,
    organizationId: input.organizationId,
    code: input.code,
    name: input.name,
    description: input.description,
    planType: input.planType,
    payoutFormulaType: input.payoutFormulaType,
    payoutFormulaConfig: input.payoutFormulaConfig,
    eligibilityRules: input.eligibilityRules,
    capAmount: input.capAmount,
    floorAmount: input.floorAmount,
    guaranteedAmount: input.guaranteedAmount,
    defaultCurrency: input.defaultCurrency,
    defaultPayrollLineCode: input.defaultPayrollLineCode,
    accountingAllocation: input.accountingAllocation,
    createdByUserId: input.actorUserId,
    updatedByUserId: input.actorUserId,
  })
  return { id }
}

export async function createBonusCycleMutation(input: {
  readonly organizationId: string
  readonly planId: string
  readonly code: string
  readonly name: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly cutoffDate: string | null
  readonly approvalDate: string | null
  readonly payoutDate: string
  readonly payrollPeriodId: string | null
  readonly actorUserId: string
}): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmBonusCycle).values({
    id,
    organizationId: input.organizationId,
    planId: input.planId,
    code: input.code,
    name: input.name,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    cutoffDate: input.cutoffDate,
    approvalDate: input.approvalDate,
    payoutDate: input.payoutDate,
    payrollPeriodId: input.payrollPeriodId,
    state: "open",
    createdByUserId: input.actorUserId,
    updatedByUserId: input.actorUserId,
  })
  return { id }
}

function monthsBetween(start: Date | null, end = new Date()): number | null {
  if (!start) return null
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())
  )
}

export async function assignBonusEmployeeMutation(input: {
  readonly organizationId: string
  readonly planId: string
  readonly cycleId: string
  readonly employeeId: string
  readonly actorUserId: string
}): Promise<{ id: string; eligibilityState: string }> {
  const [planRows, employeeRows] = await Promise.all([
    db
      .select()
      .from(hrmBonusPlan)
      .where(
        and(
          eq(hrmBonusPlan.organizationId, input.organizationId),
          eq(hrmBonusPlan.id, input.planId)
        )
      )
      .limit(1),
    db
      .select({
        id: hrmEmployee.id,
        currentDepartmentId: hrmEmployee.currentDepartmentId,
        currentJobGradeId: hrmEmployee.currentJobGradeId,
        currentPositionId: hrmEmployee.currentPositionId,
        employmentType: hrmEmployee.employmentType,
        employmentStatus: hrmEmployee.employmentStatus,
        employmentStartDate: hrmEmployee.employmentStartDate,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, input.organizationId),
          eq(hrmEmployee.id, input.employeeId)
        )
      )
      .limit(1),
  ])
  const plan = planRows[0]
  const employee = employeeRows[0]
  if (!plan || !employee) {
    throw new Error("Bonus plan or employee not found.")
  }

  const rules = parseBonusEligibilityRules(plan.eligibilityRules)
  const eligibilityEmployee: BonusEligibilityEmployee = {
    employeeId: employee.id,
    departmentId: employee.currentDepartmentId,
    gradeId: employee.currentJobGradeId,
    jobRoleId: employee.currentPositionId,
    employmentType: employee.employmentType,
    employeeStatus: employee.employmentStatus,
    tenureMonths: monthsBetween(employee.employmentStartDate),
  }
  const eligibility = evaluateBonusEligibility({
    employee: eligibilityEmployee,
    rules,
  })

  const id = crypto.randomUUID()
  await db.insert(hrmBonusAssignment).values({
    id,
    organizationId: input.organizationId,
    planId: input.planId,
    cycleId: input.cycleId,
    employeeId: input.employeeId,
    eligibilityState: eligibility.eligible ? "eligible" : "ineligible",
    eligibilitySnapshot: {
      rules,
      employee: eligibilityEmployee,
      reasons: eligibility.reasons,
    },
    assignedByUserId: input.actorUserId,
  })

  return {
    id,
    eligibilityState: eligibility.eligible ? "eligible" : "ineligible",
  }
}

export async function upsertBonusTargetMutation(input: {
  readonly organizationId: string
  readonly cycleId: string
  readonly assignmentId: string | null
  readonly employeeId: string | null
  readonly targetScope: string
  readonly targetMetric: string
  readonly targetValue: string
  readonly actualValue: string | null
  readonly weight: string | null
  readonly actorUserId: string
}): Promise<{ id: string; achievementPercent: string | null }> {
  const target = Number.parseFloat(input.targetValue)
  const actual = input.actualValue ? Number.parseFloat(input.actualValue) : null
  const achievementPercent =
    actual != null && Number.isFinite(actual) && target > 0
      ? ((actual / target) * 100).toFixed(4)
      : null

  const id = crypto.randomUUID()
  await db.insert(hrmBonusTarget).values({
    id,
    organizationId: input.organizationId,
    cycleId: input.cycleId,
    assignmentId: input.assignmentId,
    employeeId: input.employeeId,
    targetScope: input.targetScope,
    targetMetric: input.targetMetric,
    targetValue: input.targetValue,
    actualValue: input.actualValue,
    achievementPercent,
    weight: input.weight ?? "1",
    enteredByUserId: input.actorUserId,
    enteredAt: new Date(),
  })

  return { id, achievementPercent }
}

export async function calculateBonusCyclePayoutsMutation(input: {
  readonly organizationId: string
  readonly cycleId: string
  readonly actorUserId: string
}): Promise<{ payoutCount: number }> {
  const cycleRows = await db
    .select({
      id: hrmBonusCycle.id,
      planId: hrmBonusCycle.planId,
      payoutDate: hrmBonusCycle.payoutDate,
      payrollPeriodId: hrmBonusCycle.payrollPeriodId,
      planFormulaType: hrmBonusPlan.payoutFormulaType,
      planFormulaConfig: hrmBonusPlan.payoutFormulaConfig,
      planCurrency: hrmBonusPlan.defaultCurrency,
      capAmount: hrmBonusPlan.capAmount,
      floorAmount: hrmBonusPlan.floorAmount,
      guaranteedAmount: hrmBonusPlan.guaranteedAmount,
      accountingAllocation: hrmBonusPlan.accountingAllocation,
    })
    .from(hrmBonusCycle)
    .innerJoin(hrmBonusPlan, eq(hrmBonusPlan.id, hrmBonusCycle.planId))
    .where(
      and(
        eq(hrmBonusCycle.organizationId, input.organizationId),
        eq(hrmBonusCycle.id, input.cycleId)
      )
    )
    .limit(1)
  const cycle = cycleRows[0]
  if (!cycle) throw new Error("Bonus cycle not found.")

  const [assignments, targets] = await Promise.all([
    listBonusAssignmentsForCycle(input.organizationId, input.cycleId),
    listBonusTargetsForCycle(input.organizationId, input.cycleId),
  ])
  const formulaConfig = parseBonusFormulaConfig(cycle.planFormulaConfig)
  let payoutCount = 0

  for (const assignment of assignments.filter(
    (row) => row.eligibilityState === "eligible"
  )) {
    const salaryContext = await getBonusEmployeeSalaryContext({
      organizationId: input.organizationId,
      employeeId: assignment.employeeId,
    })
    const targetRows = targets.filter(
      (target) =>
        target.assignmentId === assignment.id ||
        target.employeeId === assignment.employeeId
    )
    const primaryTarget = targetRows[0]
    const targetAmount = primaryTarget
      ? Number.parseFloat(primaryTarget.targetValue)
      : 0
    const actualAmount = primaryTarget?.actualValue
      ? Number.parseFloat(primaryTarget.actualValue)
      : 0
    const result = calculateBonusPayout({
      formulaType: cycle.planFormulaType as BonusFormulaType,
      formulaConfig,
      baseSalaryAmount: salaryContext
        ? Number.parseFloat(salaryContext.baseSalaryAmount)
        : 0,
      targetAmount,
      actualAmount,
      capAmount: cycle.capAmount ? Number.parseFloat(cycle.capAmount) : null,
      floorAmount: cycle.floorAmount
        ? Number.parseFloat(cycle.floorAmount)
        : null,
      guaranteedAmount: cycle.guaranteedAmount
        ? Number.parseFloat(cycle.guaranteedAmount)
        : null,
      prorationFactor: 1,
    })
    const payoutId = crypto.randomUUID()
    const payoutNumber = `BON-${input.cycleId.slice(0, 8)}-${String(
      payoutCount + 1
    ).padStart(4, "0")}`

    await db
      .insert(hrmBonusPayout)
      .values({
        id: payoutId,
        organizationId: input.organizationId,
        planId: cycle.planId,
        cycleId: input.cycleId,
        assignmentId: assignment.id,
        employeeId: assignment.employeeId,
        payoutNumber,
        state: result.flags.length > 0 ? "draft" : "calculated",
        targetAmount: result.targetAmount,
        achievementPercent: result.achievementPercent,
        calculatedAmount: result.calculatedAmount,
        approvedAmount: null,
        currency: cycle.planCurrency,
        calculationSnapshot: result.snapshot,
        validationFlags: [...result.flags],
        prorationFactor: result.prorationFactor,
        accountingAllocation: cycle.accountingAllocation,
        payrollPeriodId: cycle.payrollPeriodId,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      .onConflictDoUpdate({
        target: [
          hrmBonusPayout.organizationId,
          hrmBonusPayout.cycleId,
          hrmBonusPayout.employeeId,
        ],
        set: {
          state: result.flags.length > 0 ? "draft" : "calculated",
          targetAmount: result.targetAmount,
          achievementPercent: result.achievementPercent,
          calculatedAmount: result.calculatedAmount,
          calculationSnapshot: result.snapshot,
          validationFlags: [...result.flags],
          updatedAt: new Date(),
          updatedByUserId: input.actorUserId,
        },
      })
    payoutCount += 1
  }

  await db
    .update(hrmBonusCycle)
    .set({
      state: "calculated",
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(eq(hrmBonusCycle.id, input.cycleId))

  return { payoutCount }
}

export async function adjustBonusPayoutMutation(input: {
  readonly organizationId: string
  readonly payoutId: string
  readonly adjustmentType: string
  readonly amount: string
  readonly reason: string
  readonly approvalReference: string | null
  readonly actorUserId: string
}): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmBonusAdjustment).values({
    id,
    organizationId: input.organizationId,
    payoutId: input.payoutId,
    adjustmentType: input.adjustmentType,
    amount: input.amount,
    reason: input.reason,
    approvalReference: input.approvalReference,
    adjustedByUserId: input.actorUserId,
  })
  await db
    .update(hrmBonusPayout)
    .set({
      adjustedAmount: input.amount,
      approvedAmount: input.amount,
      state: "calculated",
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmBonusPayout.organizationId, input.organizationId),
        eq(hrmBonusPayout.id, input.payoutId)
      )
    )
  return { id }
}

export async function setBonusPayoutApprovalRequested(input: {
  readonly organizationId: string
  readonly payoutId: string
  readonly approvalId: string
  readonly actorUserId: string
}): Promise<void> {
  await db
    .update(hrmBonusPayout)
    .set({
      state: "pending_approval",
      currentApprovalId: input.approvalId,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmBonusPayout.organizationId, input.organizationId),
        eq(hrmBonusPayout.id, input.payoutId)
      )
    )
}

export async function approveBonusPayoutMutation(input: {
  readonly organizationId: string
  readonly payoutId: string
  readonly actorUserId: string
}): Promise<void> {
  await db
    .update(hrmBonusPayout)
    .set({
      state: "approved",
      approvedAmount: sql`coalesce(${hrmBonusPayout.adjustedAmount}, ${hrmBonusPayout.calculatedAmount})`,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmBonusPayout.organizationId, input.organizationId),
        eq(hrmBonusPayout.id, input.payoutId)
      )
    )
}

export async function rejectBonusPayoutMutation(input: {
  readonly organizationId: string
  readonly payoutId: string
  readonly reason: string
  readonly actorUserId: string
}): Promise<void> {
  await db
    .update(hrmBonusPayout)
    .set({
      state: "rejected",
      rejectionReason: input.reason,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmBonusPayout.organizationId, input.organizationId),
        eq(hrmBonusPayout.id, input.payoutId)
      )
    )
}

export async function returnBonusPayoutMutation(input: {
  readonly organizationId: string
  readonly payoutId: string
  readonly reason: string
  readonly actorUserId: string
}): Promise<void> {
  await db
    .update(hrmBonusPayout)
    .set({
      state: "returned",
      returnedReason: input.reason,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmBonusPayout.organizationId, input.organizationId),
        eq(hrmBonusPayout.id, input.payoutId)
      )
    )
}

export async function lockBonusPayoutMutation(input: {
  readonly organizationId: string
  readonly payoutId: string
  readonly actorUserId: string
}): Promise<void> {
  await db
    .update(hrmBonusPayout)
    .set({
      state: "locked",
      lockedAt: new Date(),
      lockedByUserId: input.actorUserId,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmBonusPayout.organizationId, input.organizationId),
        eq(hrmBonusPayout.id, input.payoutId),
        eq(hrmBonusPayout.state, "approved")
      )
    )
}

export async function exportBonusPayoutToPayrollMutation(input: {
  readonly organizationId: string
  readonly payoutId: string
  readonly payrollPeriodId: string
  readonly actorUserId: string
}): Promise<void> {
  await db
    .update(hrmBonusPayout)
    .set({
      state: "exported_to_payroll",
      payrollPeriodId: input.payrollPeriodId,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmBonusPayout.organizationId, input.organizationId),
        eq(hrmBonusPayout.id, input.payoutId)
      )
    )
}

export async function recordBonusClawbackMutation(input: {
  readonly organizationId: string
  readonly payoutId: string
  readonly clawbackType: string
  readonly amount: string
  readonly reason: string
  readonly recoveryReference: string | null
  readonly actorUserId: string
}): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmBonusClawback).values({
    id,
    organizationId: input.organizationId,
    payoutId: input.payoutId,
    clawbackType: input.clawbackType,
    amount: input.amount,
    reason: input.reason,
    recoveryReference: input.recoveryReference,
    recordedByUserId: input.actorUserId,
  })
  return { id }
}

export async function markBonusPayoutsPaidForPayrollPeriod(input: {
  readonly organizationId: string
  readonly periodId: string
  readonly actorUserId: string
}): Promise<ReadonlyArray<{ payoutId: string; payrollLineId: string }>> {
  const linkedRows = await db
    .select({
      lineId: hrmPayrollLine.id,
      payoutId: hrmPayrollLine.bonusPayoutId,
    })
    .from(hrmPayrollLine)
    .innerJoin(hrmPayrollRun, eq(hrmPayrollRun.id, hrmPayrollLine.runId))
    .where(
      and(
        eq(hrmPayrollLine.organizationId, input.organizationId),
        eq(hrmPayrollRun.periodId, input.periodId)
      )
    )

  const entries = linkedRows.filter(
    (row): row is { lineId: string; payoutId: string } =>
      typeof row.payoutId === "string" && row.payoutId.length > 0
  )
  const paidAt = new Date()
  for (const entry of entries) {
    await db
      .update(hrmBonusPayout)
      .set({
        state: "paid",
        paidByPayrollLineId: entry.lineId,
        paidAt,
        updatedAt: paidAt,
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(hrmBonusPayout.organizationId, input.organizationId),
          eq(hrmBonusPayout.id, entry.payoutId),
          eq(hrmBonusPayout.state, "exported_to_payroll")
        )
      )
  }
  return entries.map((entry) => ({
    payoutId: entry.payoutId,
    payrollLineId: entry.lineId,
  }))
}

export { BONUS_PAYOUT_APPROVAL_SUBJECT_KIND }
