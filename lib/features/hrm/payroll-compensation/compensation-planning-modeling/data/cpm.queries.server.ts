import "server-only"

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmCompensationBudgetPool,
  hrmCompensationCycle,
  hrmCompensationCycleParticipant,
  hrmEmployee,
  hrmEmploymentContract,
  hrmJobGrade,
} from "#lib/db/schema"

import {
  evaluateCompensationEligibility,
  hrmCompensationEligibilityRulesSchema,
} from "../schemas/compensation-planning.shared"

export type CompensationCycleRow = {
  id: string
  code: string
  name: string
  cycleType: string
  effectiveDate: string
  state: string
  createdAt: Date
}

export type CompensationBudgetPoolRow = {
  id: string
  cycleId: string
  scopeType: string
  scopeId: string
  allocatedAmount: string
  usedAmount: string
  currency: string
}

export type CompensationParticipantRow = {
  id: string
  cycleId: string
  employeeId: string
  employeeNumber: string | null
  employeeName: string
  eligible: boolean
  eligibilitySummary: string
  currentSalaryAmount: string | null
  salaryCurrency: string
  bandMinimum: string | null
  bandMidpoint: string | null
  bandMaximum: string | null
}

function decimalOrNull(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function computeTenureDays(startDate: Date | string | null): number | null {
  if (!startDate) return null
  const start =
    startDate instanceof Date
      ? startDate
      : new Date(`${startDate}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) return null
  const diffMs = Date.now() - start.getTime()
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
}

export async function listCompensationCyclesForOrg(
  organizationId: string
): Promise<CompensationCycleRow[]> {
  return db
    .select({
      id: hrmCompensationCycle.id,
      code: hrmCompensationCycle.code,
      name: hrmCompensationCycle.name,
      cycleType: hrmCompensationCycle.cycleType,
      effectiveDate: hrmCompensationCycle.effectiveDate,
      state: hrmCompensationCycle.state,
      createdAt: hrmCompensationCycle.createdAt,
    })
    .from(hrmCompensationCycle)
    .where(eq(hrmCompensationCycle.organizationId, organizationId))
    .orderBy(
      desc(hrmCompensationCycle.effectiveDate),
      desc(hrmCompensationCycle.createdAt)
    )
}

export async function listCompensationBudgetPoolsForCycle(
  organizationId: string,
  cycleId: string
): Promise<CompensationBudgetPoolRow[]> {
  return db
    .select({
      id: hrmCompensationBudgetPool.id,
      cycleId: hrmCompensationBudgetPool.cycleId,
      scopeType: hrmCompensationBudgetPool.scopeType,
      scopeId: hrmCompensationBudgetPool.scopeId,
      allocatedAmount: hrmCompensationBudgetPool.allocatedAmount,
      usedAmount: hrmCompensationBudgetPool.usedAmount,
      currency: hrmCompensationBudgetPool.currency,
    })
    .from(hrmCompensationBudgetPool)
    .where(
      and(
        eq(hrmCompensationBudgetPool.organizationId, organizationId),
        eq(hrmCompensationBudgetPool.cycleId, cycleId)
      )
    )
    .orderBy(asc(hrmCompensationBudgetPool.scopeType), asc(hrmCompensationBudgetPool.scopeId))
}

export async function listCompensationParticipantsForCycle(
  organizationId: string,
  cycleId: string
): Promise<CompensationParticipantRow[]> {
  const rows = await db
    .select({
      id: hrmCompensationCycleParticipant.id,
      cycleId: hrmCompensationCycleParticipant.cycleId,
      employeeId: hrmCompensationCycleParticipant.employeeId,
      eligible: hrmCompensationCycleParticipant.eligible,
      eligibilityReasons: hrmCompensationCycleParticipant.eligibilityReasons,
      currentSalaryAmount: hrmCompensationCycleParticipant.currentSalaryAmount,
      salaryCurrency: hrmCompensationCycleParticipant.salaryCurrency,
      bandMinimum: hrmCompensationCycleParticipant.bandMinimum,
      bandMidpoint: hrmCompensationCycleParticipant.bandMidpoint,
      bandMaximum: hrmCompensationCycleParticipant.bandMaximum,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      preferredName: hrmEmployee.preferredName,
    })
    .from(hrmCompensationCycleParticipant)
    .innerJoin(
      hrmEmployee,
      eq(hrmCompensationCycleParticipant.employeeId, hrmEmployee.id)
    )
    .where(
      and(
        eq(hrmCompensationCycleParticipant.organizationId, organizationId),
        eq(hrmCompensationCycleParticipant.cycleId, cycleId)
      )
    )
    .orderBy(asc(hrmEmployee.legalName))

  return rows.map((row) => {
    const reasons = row.eligibilityReasons ?? []
    const eligibilitySummary = row.eligible
      ? "Eligible"
      : reasons.length > 0
        ? reasons.map((r) => r.message).join("; ")
        : "Ineligible"

    return {
      id: row.id,
      cycleId: row.cycleId,
      employeeId: row.employeeId,
      employeeNumber: row.employeeNumber,
      employeeName: row.preferredName ?? row.legalName,
      eligible: row.eligible,
      eligibilitySummary,
      currentSalaryAmount: row.currentSalaryAmount,
      salaryCurrency: row.salaryCurrency,
      bandMinimum: row.bandMinimum,
      bandMidpoint: row.bandMidpoint,
      bandMaximum: row.bandMaximum,
    }
  })
}

export async function getCompensationCycleForOrg(
  organizationId: string,
  cycleId: string
): Promise<CompensationCycleRow | null> {
  const [row] = await db
    .select({
      id: hrmCompensationCycle.id,
      code: hrmCompensationCycle.code,
      name: hrmCompensationCycle.name,
      cycleType: hrmCompensationCycle.cycleType,
      effectiveDate: hrmCompensationCycle.effectiveDate,
      state: hrmCompensationCycle.state,
      createdAt: hrmCompensationCycle.createdAt,
    })
    .from(hrmCompensationCycle)
    .where(
      and(
        eq(hrmCompensationCycle.organizationId, organizationId),
        eq(hrmCompensationCycle.id, cycleId)
      )
    )
    .limit(1)
  return row ?? null
}

export async function syncCompensationCycleParticipants(
  organizationId: string,
  cycleId: string
): Promise<{ processed: number }> {
  const [cycle] = await db
    .select({
      eligibilityRules: hrmCompensationCycle.eligibilityRules,
    })
    .from(hrmCompensationCycle)
    .where(
      and(
        eq(hrmCompensationCycle.organizationId, organizationId),
        eq(hrmCompensationCycle.id, cycleId)
      )
    )
    .limit(1)

  if (!cycle) {
    return { processed: 0 }
  }

  const rulesParsed = hrmCompensationEligibilityRulesSchema.safeParse(
    cycle.eligibilityRules ?? {}
  )
  const rules = rulesParsed.success ? rulesParsed.data : {}

  const employees = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      employmentType: hrmEmployee.employmentType,
      employmentStatus: hrmEmployee.employmentStatus,
      employmentStartDate: hrmEmployee.employmentStartDate,
      currentJobGradeId: hrmEmployee.currentJobGradeId,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      managerEmployeeId: hrmEmployee.managerEmployeeId,
      employeeLevel: hrmEmployee.employeeLevel,
      archivedAt: hrmEmployee.archivedAt,
      contractId: hrmEmployee.currentEmploymentContractId,
      baseSalaryAmount: hrmEmploymentContract.baseSalaryAmount,
      baseSalaryCurrency: hrmEmploymentContract.baseSalaryCurrency,
      contractEffectiveDate: hrmEmploymentContract.effectiveFrom,
      gradeMin: hrmJobGrade.minSalaryAmount,
      gradeMax: hrmJobGrade.maxSalaryAmount,
    })
    .from(hrmEmployee)
    .leftJoin(
      hrmEmploymentContract,
      eq(hrmEmployee.currentEmploymentContractId, hrmEmploymentContract.id)
    )
    .leftJoin(
      hrmJobGrade,
      eq(hrmEmployee.currentJobGradeId, hrmJobGrade.id)
    )
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt)
      )
    )

  for (const employee of employees) {
    const eligibility = evaluateCompensationEligibility({
      employee: {
        employeeId: employee.id,
        employmentType: employee.employmentType,
        employmentStatus: employee.employmentStatus,
        tenureDays: computeTenureDays(employee.employmentStartDate),
        gradeId: employee.currentJobGradeId,
        jobLevelId: employee.employeeLevel,
        departmentId: employee.currentDepartmentId,
        legalEntityId: null,
        performanceRating: null,
      },
      rules,
    })

    const min = decimalOrNull(employee.gradeMin)
    const max = decimalOrNull(employee.gradeMax)
    const midpoint =
      min !== null && max !== null ? (min + max) / 2 : null

    const values = {
      organizationId,
      cycleId,
      employeeId: employee.id,
      eligible: eligibility.eligible,
      eligibilityReasons: eligibility.reasons,
      currentSalaryAmount: employee.baseSalaryAmount,
      salaryCurrency: employee.baseSalaryCurrency ?? "MYR",
      salaryEffectiveDate:
        employee.contractEffectiveDate instanceof Date
          ? employee.contractEffectiveDate.toISOString().slice(0, 10)
          : employee.contractEffectiveDate
            ? String(employee.contractEffectiveDate)
            : null,
      gradeId: employee.currentJobGradeId,
      jobLevelId: employee.employeeLevel,
      departmentId: employee.currentDepartmentId,
      managerEmployeeId: employee.managerEmployeeId,
      bandMinimum: employee.gradeMin,
      bandMidpoint:
        midpoint !== null ? String(midpoint.toFixed(2)) : null,
      bandMaximum: employee.gradeMax,
      updatedAt: new Date(),
    }

    await db
      .insert(hrmCompensationCycleParticipant)
      .values(values)
      .onConflictDoUpdate({
        target: [
          hrmCompensationCycleParticipant.cycleId,
          hrmCompensationCycleParticipant.employeeId,
        ],
        set: {
          eligible: sql`excluded.eligible`,
          eligibilityReasons: sql`excluded."eligibilityReasons"`,
          currentSalaryAmount: sql`excluded."currentSalaryAmount"`,
          salaryCurrency: sql`excluded."salaryCurrency"`,
          salaryEffectiveDate: sql`excluded."salaryEffectiveDate"`,
          gradeId: sql`excluded."gradeId"`,
          jobLevelId: sql`excluded."jobLevelId"`,
          departmentId: sql`excluded."departmentId"`,
          managerEmployeeId: sql`excluded."managerEmployeeId"`,
          bandMinimum: sql`excluded."bandMinimum"`,
          bandMidpoint: sql`excluded."bandMidpoint"`,
          bandMaximum: sql`excluded."bandMaximum"`,
          updatedAt: sql`excluded."updatedAt"`,
        },
      })
  }

  return { processed: employees.length }
}

export async function loadCompensationPlanningPageData(
  organizationId: string
) {
  const cycles = await listCompensationCyclesForOrg(organizationId)
  const primaryCycleId = cycles[0]?.id ?? null

  const [budgetPools, participants] = primaryCycleId
    ? await Promise.all([
        listCompensationBudgetPoolsForCycle(organizationId, primaryCycleId),
        listCompensationParticipantsForCycle(organizationId, primaryCycleId),
      ])
    : [[], []]

  return {
    cycles,
    primaryCycleId,
    budgetPools,
    participants,
  }
}
