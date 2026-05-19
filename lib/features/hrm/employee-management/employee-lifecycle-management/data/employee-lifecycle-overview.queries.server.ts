import "server-only"

import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
} from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBoardingInstance,
  hrmEmployee,
  hrmEmploymentContract,
  hrmLifecycleTransition,
} from "#lib/db/schema"

import {
  formatUtcDateOnly,
  isoDateOnlyToUtcDate,
} from "../../../_module-governance/hrm-calendar-dates.server"
import { CONTRACT_EXPIRY_WARN_DAYS } from "./contract-expiry-watch.shared"
import type { EmployeeLifecycleStage } from "./employee-lifecycle-stage.shared"
import { deriveLifecycleStage } from "./employee-lifecycle-stage.shared"
import type { EmployeeLifecycleReadinessCounts } from "./employee-lifecycle-readiness-counts.shared"

const OPEN_INSTANCE_STATUSES = ["pending", "in_progress", "blocked"] as const
const LIFECYCLE_OVERVIEW_EMPLOYEE_LIMIT = 200

export type EmployeeLifecycleOverviewRow = {
  readonly employeeId: string
  readonly employeeNumber: string
  readonly legalName: string
  readonly employmentStatus: string
  readonly stage: EmployeeLifecycleStage
  readonly effectiveDate: string | null
  readonly pendingTransitionCount: number
  readonly lastWorkingDate: string | null
  readonly reason: string | null
  readonly approvalReference: string | null
}

type PendingTransitionAggregate = {
  count: number
  earliestEffectiveDate: Date | null
  reason: string | null
  approvalReference: string | null
}

function formatDateOnly(value: Date | null): string | null {
  if (!value) return null
  return formatUtcDateOnly(value)
}

async function countOpenBoardingInstances(
  organizationId: string,
  kind: "onboarding" | "offboarding"
): Promise<number> {
  const [row] = await db
    .select({ n: count(hrmBoardingInstance.id) })
    .from(hrmBoardingInstance)
    .where(
      and(
        eq(hrmBoardingInstance.organizationId, organizationId),
        eq(hrmBoardingInstance.kind, kind),
        inArray(hrmBoardingInstance.status, [...OPEN_INSTANCE_STATUSES])
      )
    )
  return Number(row?.n ?? 0)
}

async function countProbationEmployees(
  organizationId: string
): Promise<number> {
  const [row] = await db
    .select({ n: count(hrmEmployee.id) })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt),
        eq(hrmEmployee.employmentStatus, "probation")
      )
    )
  return Number(row?.n ?? 0)
}

async function countContractExpiryDueForOrganization(
  organizationId: string,
  now: Date
): Promise<number> {
  const startIso = formatUtcDateOnly(now)
  const endDate = isoDateOnlyToUtcDate(startIso)
  endDate.setUTCDate(endDate.getUTCDate() + CONTRACT_EXPIRY_WARN_DAYS)

  const [row] = await db
    .select({ n: count(hrmEmploymentContract.id) })
    .from(hrmEmploymentContract)
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmEmploymentContract.employeeId),
        eq(hrmEmployee.organizationId, hrmEmploymentContract.organizationId)
      )
    )
    .where(
      and(
        eq(hrmEmploymentContract.organizationId, organizationId),
        eq(hrmEmploymentContract.state, "active"),
        isNotNull(hrmEmploymentContract.effectiveTo),
        isNull(hrmEmployee.archivedAt),
        gte(hrmEmploymentContract.effectiveTo, isoDateOnlyToUtcDate(startIso)),
        lte(hrmEmploymentContract.effectiveTo, endDate)
      )
    )
  return Number(row?.n ?? 0)
}

async function countPendingLifecycleTransitions(
  organizationId: string
): Promise<number> {
  const [row] = await db
    .select({ n: count(hrmLifecycleTransition.id) })
    .from(hrmLifecycleTransition)
    .where(
      and(
        eq(hrmLifecycleTransition.organizationId, organizationId),
        eq(hrmLifecycleTransition.status, "pending")
      )
    )
  return Number(row?.n ?? 0)
}

export async function getEmployeeLifecycleReadinessCounts(
  organizationId: string,
  now: Date = new Date()
): Promise<EmployeeLifecycleReadinessCounts> {
  const [
    onboardingOpen,
    offboardingOpen,
    probationDue,
    contractExpiryDue,
    pendingTransitions,
  ] = await Promise.all([
    countOpenBoardingInstances(organizationId, "onboarding"),
    countOpenBoardingInstances(organizationId, "offboarding"),
    countProbationEmployees(organizationId),
    countContractExpiryDueForOrganization(organizationId, now),
    countPendingLifecycleTransitions(organizationId),
  ])

  return {
    onboardingOpen,
    offboardingOpen,
    probationDue,
    contractExpiryDue,
    pendingTransitions,
  }
}

export async function listEmployeeLifecycleOverviewForOrganization(
  organizationId: string
): Promise<readonly EmployeeLifecycleOverviewRow[]> {
  const [employees, openBoardingRows, pendingTransitionRows] =
    await Promise.all([
      db
        .select({
          id: hrmEmployee.id,
          employeeNumber: hrmEmployee.employeeNumber,
          legalName: hrmEmployee.legalName,
          employmentStatus: hrmEmployee.employmentStatus,
          archivedAt: hrmEmployee.archivedAt,
          lastWorkingDate: hrmEmployee.lastWorkingDate,
        })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, organizationId),
            isNull(hrmEmployee.archivedAt)
          )
        )
        .orderBy(desc(hrmEmployee.updatedAt))
        .limit(LIFECYCLE_OVERVIEW_EMPLOYEE_LIMIT),
      db
        .select({
          employeeId: hrmBoardingInstance.employeeId,
          kind: hrmBoardingInstance.kind,
        })
        .from(hrmBoardingInstance)
        .where(
          and(
            eq(hrmBoardingInstance.organizationId, organizationId),
            inArray(hrmBoardingInstance.status, [...OPEN_INSTANCE_STATUSES])
          )
        ),
      db
        .select({
          employeeId: hrmLifecycleTransition.employeeId,
          effectiveDate: hrmLifecycleTransition.effectiveDate,
          reason: hrmLifecycleTransition.reason,
          approvalReference: hrmLifecycleTransition.approvalReference,
        })
        .from(hrmLifecycleTransition)
        .where(
          and(
            eq(hrmLifecycleTransition.organizationId, organizationId),
            eq(hrmLifecycleTransition.status, "pending")
          )
        ),
    ])

  const openOnboardingByEmployee = new Set<string>()
  const openOffboardingByEmployee = new Set<string>()
  for (const row of openBoardingRows) {
    if (row.kind === "onboarding") openOnboardingByEmployee.add(row.employeeId)
    if (row.kind === "offboarding")
      openOffboardingByEmployee.add(row.employeeId)
  }

  const pendingByEmployee = new Map<string, PendingTransitionAggregate>()
  for (const row of pendingTransitionRows) {
    const existing = pendingByEmployee.get(row.employeeId)
    const effectiveDate =
      row.effectiveDate instanceof Date ? row.effectiveDate : null
    if (!existing) {
      pendingByEmployee.set(row.employeeId, {
        count: 1,
        earliestEffectiveDate: effectiveDate,
        reason: row.reason,
        approvalReference: row.approvalReference,
      })
      continue
    }
    existing.count += 1
    if (
      effectiveDate &&
      (!existing.earliestEffectiveDate ||
        effectiveDate < existing.earliestEffectiveDate)
    ) {
      existing.earliestEffectiveDate = effectiveDate
      existing.reason = row.reason
      existing.approvalReference = row.approvalReference
    }
  }

  return employees.map((employee) => {
    const pending = pendingByEmployee.get(employee.id)
    const hasOpenOnboarding = openOnboardingByEmployee.has(employee.id)
    const hasOpenOffboarding = openOffboardingByEmployee.has(employee.id)
    const stage = deriveLifecycleStage({
      archivedAt: employee.archivedAt,
      employmentStatus: employee.employmentStatus,
      hasOpenOnboarding,
      hasOpenOffboarding,
    })

    return {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      legalName: employee.legalName,
      employmentStatus: employee.employmentStatus,
      stage,
      effectiveDate: formatDateOnly(pending?.earliestEffectiveDate ?? null),
      pendingTransitionCount: pending?.count ?? 0,
      lastWorkingDate: formatDateOnly(
        employee.lastWorkingDate instanceof Date
          ? employee.lastWorkingDate
          : null
      ),
      reason: pending?.reason ?? null,
      approvalReference: pending?.approvalReference ?? null,
    }
  })
}
