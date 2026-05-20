import "server-only"

import { asc, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmOvertimeApprovalRoute } from "#lib/db/schema"

import { HRM_OTM_AUDIT } from "../otm.contract"
import { managerChainDepthClamped } from "./otm-approval-routing.shared"
import {
  hrmOtmApproverKindSchema,
  type HrmOtmApproverKind,
} from "../schemas/otm-approval-route.shared"
import type { OtmApprovalRouteRow } from "./otm.types.shared"
import { revalidateOtmSurfaces } from "./otm-revalidate.server"

export type { OtmApprovalRouteRow } from "./otm.types.shared"

function mapApprovalRouteRow(
  row: typeof hrmOvertimeApprovalRoute.$inferSelect
): OtmApprovalRouteRow {
  const parsedKind = hrmOtmApproverKindSchema.safeParse(row.approverKind)
  return {
    id: row.id,
    label: row.label,
    priority: row.priority,
    departmentId: row.departmentId,
    costCenterCode: row.costCenterCode,
    workLocationCode: row.workLocationCode,
    jobGradeId: row.jobGradeId,
    minAmountCents: row.minAmountCents,
    maxAmountCents: row.maxAmountCents,
    requiresEligibilityException: row.requiresEligibilityException,
    requiresPolicyException: row.requiresPolicyException,
    approverKind: parsedKind.success ? parsedKind.data : "hr_pool",
    managerChainDepth: row.managerChainDepth,
    targetUserId: row.targetUserId,
    isActive: row.isActive,
  }
}

export async function listOtmApprovalRoutesForOrg(
  organizationId: string
): Promise<OtmApprovalRouteRow[]> {
  const rows = await db
    .select()
    .from(hrmOvertimeApprovalRoute)
    .where(eq(hrmOvertimeApprovalRoute.organizationId, organizationId))
    .orderBy(asc(hrmOvertimeApprovalRoute.priority))

  return rows.map(mapApprovalRouteRow)
}

export async function createOtmApprovalRoute(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  label: string | null
  priority: number
  departmentId: string | null
  costCenterCode: string | null
  workLocationCode: string | null
  jobGradeId: string | null
  minAmountCents: number | null
  maxAmountCents: number | null
  requiresEligibilityException: boolean | null
  requiresPolicyException: boolean | null
  approverKind: HrmOtmApproverKind
  managerChainDepth: number | null
  targetUserId: string | null
}): Promise<
  { ok: true; routeId: string } | { ok: false; errors: { form?: string } }
> {
  if (input.approverKind === "specific_user" && !input.targetUserId?.trim()) {
    return {
      ok: false,
      errors: { form: "Target user is required for a specific-user route." },
    }
  }

  if (
    (input.approverKind === "manager_chain" ||
      input.approverKind === "direct_manager") &&
    input.managerChainDepth != null
  ) {
    managerChainDepthClamped(input.managerChainDepth)
  }

  const id = crypto.randomUUID()

  await db.insert(hrmOvertimeApprovalRoute).values({
    id,
    organizationId: input.organizationId,
    label: input.label?.trim() || null,
    priority: input.priority,
    departmentId: input.departmentId,
    costCenterCode: input.costCenterCode?.trim() || null,
    workLocationCode: input.workLocationCode?.trim() || null,
    jobGradeId: input.jobGradeId,
    minAmountCents: input.minAmountCents,
    maxAmountCents: input.maxAmountCents,
    requiresEligibilityException: input.requiresEligibilityException,
    requiresPolicyException: input.requiresPolicyException,
    approverKind: input.approverKind,
    managerChainDepth:
      input.approverKind === "manager_chain" && input.managerChainDepth != null
        ? managerChainDepthClamped(input.managerChainDepth)
        : input.managerChainDepth,
    targetUserId: input.targetUserId?.trim() || null,
    createdByUserId: input.userId,
    updatedByUserId: input.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.approvalRouteCreate,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_overtime_approval_route",
    resourceId: id,
    metadata: {
      approverKind: input.approverKind,
      priority: input.priority,
    },
  })

  revalidateOtmSurfaces()
  return { ok: true, routeId: id }
}
