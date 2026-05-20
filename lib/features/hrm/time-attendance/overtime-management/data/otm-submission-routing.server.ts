import "server-only"

import { and, asc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDepartment, hrmEmployee, hrmOvertimeApprovalRoute } from "#lib/db/schema"

import {
  pickFirstMatchingOtmApprovalRoute,
  type OtmApprovalRoutingContext,
} from "./otm-approval-route-matching.shared"
import {
  managerChainDepthClamped,
  resolveInitialOtmApprovalStage,
} from "./otm-approval-routing.shared"
import type { OtmApprovalStage } from "./otm-approval-snapshot.shared"
import {
  resolveOtmApproverUserId,
  resolveOtmHrApproverUserId,
  resolveOtmManagerChainApproverUserId,
} from "./otm-approver-routing.server"
import { resolveOtmApprovalRoutingContext } from "./otm-routing-facts.server"
import type { OtmPolicyRow } from "./otm-policy.shared"
import type { HrmOtmApproverKind } from "../schemas/otm-approval-route.shared"
import type { HrmOtmTimingKind } from "../schemas/otm.schema"

export type OtmSubmissionApproverResolution = {
  currentApproverUserId: string | null
  approvalStage: OtmApprovalStage
  managerApproverUserId: string | null
  routingRuleId: string | null
  approverKind: HrmOtmApproverKind | "default_fallback" | null
}

async function resolveLinkedUserForEmployee(input: {
  organizationId: string
  employeeId: string
}): Promise<string | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, input.organizationId),
      eq(hrmEmployee.id, input.employeeId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: { linkedUserId: true },
  })
  return row?.linkedUserId ?? null
}

async function resolveDepartmentHeadUserId(input: {
  organizationId: string
  departmentId: string | null
}): Promise<string | null> {
  if (!input.departmentId) return null

  const department = await db.query.hrmDepartment.findFirst({
    where: and(
      eq(hrmDepartment.organizationId, input.organizationId),
      eq(hrmDepartment.id, input.departmentId),
      isNull(hrmDepartment.archivedAt)
    ),
    columns: { headEmployeeId: true },
  })

  if (!department?.headEmployeeId) return null

  return resolveLinkedUserForEmployee({
    organizationId: input.organizationId,
    employeeId: department.headEmployeeId,
  })
}

async function resolveApproverUserIdForRoute(input: {
  organizationId: string
  managerEmployeeId: string | null
  hrOwnerEmployeeId: string | null
  departmentId: string | null
  policy: Pick<OtmPolicyRow, "managerChainMaxDepth">
  route: {
    approverKind: HrmOtmApproverKind
    managerChainDepth: number | null
    targetUserId: string | null
  }
}): Promise<string | null> {
  switch (input.route.approverKind) {
    case "direct_manager":
      if (!input.managerEmployeeId) return null
      return resolveLinkedUserForEmployee({
        organizationId: input.organizationId,
        employeeId: input.managerEmployeeId,
      })
    case "manager_chain":
      return resolveOtmManagerChainApproverUserId({
        organizationId: input.organizationId,
        managerEmployeeId: input.managerEmployeeId,
        maxDepth:
          input.route.managerChainDepth ?? input.policy.managerChainMaxDepth,
      })
    case "department_head":
      return resolveDepartmentHeadUserId({
        organizationId: input.organizationId,
        departmentId: input.departmentId,
      })
    case "hr_owner":
      if (!input.hrOwnerEmployeeId) return null
      return resolveLinkedUserForEmployee({
        organizationId: input.organizationId,
        employeeId: input.hrOwnerEmployeeId,
      })
    case "hr_pool":
      return resolveOtmHrApproverUserId(input.organizationId)
    case "specific_user":
      return input.route.targetUserId
    default:
      return null
  }
}

export async function resolveOtmSubmissionApprovers(input: {
  organizationId: string
  employeeId: string
  managerEmployeeId: string | null
  hrOwnerEmployeeId: string | null
  policy: OtmPolicyRow
  workDate: string
  durationMinutes: number
  timingKind: HrmOtmTimingKind
  overtimeTypeId: string | null
  hasEligibilityException: boolean
  routingContext?: OtmApprovalRoutingContext
}): Promise<OtmSubmissionApproverResolution> {
  const routingContext =
    input.routingContext ??
    (await resolveOtmApprovalRoutingContext({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      workDate: input.workDate,
      durationMinutes: input.durationMinutes,
      timingKind: input.timingKind,
      overtimeTypeId: input.overtimeTypeId,
      hasEligibilityException: input.hasEligibilityException,
    }))

  const routes = await db
    .select({
      id: hrmOvertimeApprovalRoute.id,
      label: hrmOvertimeApprovalRoute.label,
      priority: hrmOvertimeApprovalRoute.priority,
      departmentId: hrmOvertimeApprovalRoute.departmentId,
      costCenterCode: hrmOvertimeApprovalRoute.costCenterCode,
      workLocationCode: hrmOvertimeApprovalRoute.workLocationCode,
      jobGradeId: hrmOvertimeApprovalRoute.jobGradeId,
      minAmountCents: hrmOvertimeApprovalRoute.minAmountCents,
      maxAmountCents: hrmOvertimeApprovalRoute.maxAmountCents,
      requiresEligibilityException:
        hrmOvertimeApprovalRoute.requiresEligibilityException,
      requiresPolicyException: hrmOvertimeApprovalRoute.requiresPolicyException,
      approverKind: hrmOvertimeApprovalRoute.approverKind,
      managerChainDepth: hrmOvertimeApprovalRoute.managerChainDepth,
      targetUserId: hrmOvertimeApprovalRoute.targetUserId,
      isActive: hrmOvertimeApprovalRoute.isActive,
    })
    .from(hrmOvertimeApprovalRoute)
    .where(
      and(
        eq(hrmOvertimeApprovalRoute.organizationId, input.organizationId),
        eq(hrmOvertimeApprovalRoute.isActive, true)
      )
    )
    .orderBy(asc(hrmOvertimeApprovalRoute.priority))

  const matched = pickFirstMatchingOtmApprovalRoute(
    routes.map((row) => ({
      ...row,
      approverKind: row.approverKind as HrmOtmApproverKind,
    })),
    routingContext
  )

  const managerApproverUserId = await resolveOtmManagerChainApproverUserId({
    organizationId: input.organizationId,
    managerEmployeeId: input.managerEmployeeId,
    maxDepth: input.policy.managerChainMaxDepth,
  })

  if (matched) {
    const routedUserId = await resolveApproverUserIdForRoute({
      organizationId: input.organizationId,
      managerEmployeeId: input.managerEmployeeId,
      hrOwnerEmployeeId: input.hrOwnerEmployeeId,
      departmentId: routingContext.departmentId,
      policy: input.policy,
      route: matched,
    })

    const currentApproverUserId =
      routedUserId ??
      (await resolveOtmApproverUserId({
        organizationId: input.organizationId,
        managerEmployeeId: input.managerEmployeeId,
        managerChainMaxDepth: input.policy.managerChainMaxDepth,
      }))

    const approvalStage = resolveInitialOtmApprovalStage({
      policy: input.policy,
      managerApproverUserId:
        matched.approverKind === "direct_manager" ||
        matched.approverKind === "manager_chain"
          ? (currentApproverUserId ?? managerApproverUserId)
          : managerApproverUserId,
    })

    return {
      currentApproverUserId,
      approvalStage,
      managerApproverUserId,
      routingRuleId: matched.id,
      approverKind: matched.approverKind,
    }
  }

  const hrApproverUserId = await resolveOtmHrApproverUserId(input.organizationId)
  const approvalStage = resolveInitialOtmApprovalStage({
    policy: input.policy,
    managerApproverUserId,
  })
  const currentApproverUserId =
    approvalStage === "manager"
      ? managerApproverUserId
      : (hrApproverUserId ??
        (await resolveOtmApproverUserId({
          organizationId: input.organizationId,
          managerEmployeeId: input.managerEmployeeId,
          managerChainMaxDepth: input.policy.managerChainMaxDepth,
        })))

  return {
    currentApproverUserId,
    approvalStage,
    managerApproverUserId,
    routingRuleId: null,
    approverKind: "default_fallback",
  }
}

export { managerChainDepthClamped }
