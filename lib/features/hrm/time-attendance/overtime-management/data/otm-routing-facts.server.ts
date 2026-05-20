import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmDepartment,
  hrmEmployee,
  hrmEmployeeAssignment,
} from "#lib/db/schema"

import { detectOtmPolicyExceptions } from "./otm-exception-detect.server"
import {
  computeOtmAmountCents,
  resolveOtmHourlyRateForEmployee,
} from "./otm-payroll-amount.server"
import { resolveOtmRateMultiplierHundredths } from "./otm-rate.server"
import { resolveOtmEligibilityEmployeeFacts } from "./otm-eligibility-facts.server"
import type { OtmApprovalRoutingContext } from "./otm-approval-route-matching.shared"
import type { HrmOtmTimingKind } from "../schemas/otm.schema"

export async function resolveOtmEstimatedAmountCents(input: {
  organizationId: string
  employeeId: string
  workDate: string
  durationMinutes: number
  overtimeTypeId: string | null
}): Promise<number | null> {
  if (!input.overtimeTypeId || input.durationMinutes <= 0) return null

  const [hourly, facts] = await Promise.all([
    resolveOtmHourlyRateForEmployee({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
    }),
    resolveOtmEligibilityEmployeeFacts({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
    }),
  ])
  if (!hourly) return null

  const { multiplierHundredths } = await resolveOtmRateMultiplierHundredths({
    organizationId: input.organizationId,
    overtimeTypeId: input.overtimeTypeId,
    workDate: input.workDate,
    countryCode: facts.countryCode,
    workerCategory: facts.workerCategory,
  })

  return computeOtmAmountCents({
    payableMinutes: input.durationMinutes,
    multiplierHundredths,
    hourlyRate: hourly.hourlyRate,
  })
}

export async function resolveOtmApprovalRoutingContext(input: {
  organizationId: string
  employeeId: string
  workDate: string
  durationMinutes: number
  timingKind: HrmOtmTimingKind
  overtimeTypeId: string | null
  hasEligibilityException: boolean
}): Promise<OtmApprovalRoutingContext> {
  const [facts, assignment, employee, estimatedAmountCents, policyExceptions] =
    await Promise.all([
      resolveOtmEligibilityEmployeeFacts({
        organizationId: input.organizationId,
        employeeId: input.employeeId,
      }),
      db.query.hrmEmployeeAssignment.findFirst({
        where: and(
          eq(hrmEmployeeAssignment.organizationId, input.organizationId),
          eq(hrmEmployeeAssignment.employeeId, input.employeeId),
          eq(hrmEmployeeAssignment.status, "active"),
          isNull(hrmEmployeeAssignment.effectiveTo)
        ),
        columns: { costCenterCode: true, departmentId: true },
        orderBy: [desc(hrmEmployeeAssignment.effectiveFrom)],
      }),
      db.query.hrmEmployee.findFirst({
        where: and(
          eq(hrmEmployee.organizationId, input.organizationId),
          eq(hrmEmployee.id, input.employeeId)
        ),
        columns: { currentDepartmentId: true },
      }),
      resolveOtmEstimatedAmountCents({
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        workDate: input.workDate,
        durationMinutes: input.durationMinutes,
        overtimeTypeId: input.overtimeTypeId,
      }),
      detectOtmPolicyExceptions({
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        workDate: input.workDate,
        durationMinutes: input.durationMinutes,
        timingKind: input.timingKind,
      }),
    ])

  const departmentId =
    facts.departmentId ??
    assignment?.departmentId ??
    employee?.currentDepartmentId ??
    null

  let costCenterCode = assignment?.costCenterCode?.trim() || null
  if (!costCenterCode && departmentId) {
    const department = await db.query.hrmDepartment.findFirst({
      where: and(
        eq(hrmDepartment.organizationId, input.organizationId),
        eq(hrmDepartment.id, departmentId)
      ),
      columns: { costCenterCode: true },
    })
    costCenterCode = department?.costCenterCode?.trim() || null
  }

  return {
    departmentId,
    jobGradeId: facts.jobGradeId,
    workLocationCode: facts.workLocationCode,
    costCenterCode,
    estimatedAmountCents,
    hasEligibilityException: input.hasEligibilityException,
    hasPolicyException: policyExceptions.length > 0,
  }
}
