"use server"

import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { CreateOtmApprovalRouteFormState } from "../../../types"
import { createOtmApprovalRouteFormSchema } from "../schemas/otm.schema"
import { createOtmApprovalRoute } from "../data/otm-approval-route.server"

export async function createOtmApprovalRouteAction(
  _prev: CreateOtmApprovalRouteFormState | undefined,
  formData: FormData
): Promise<CreateOtmApprovalRouteFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: {
      module: "hrm",
      object: "overtime",
      function: "update",
    },
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to manage approval routing rules.",
    })
  }

  const parsed = createOtmApprovalRouteFormSchema.safeParse({
    label: formData.get("label") || null,
    priority: formData.get("priority") ?? 100,
    departmentId: formData.get("departmentId") || null,
    costCenterCode: formData.get("costCenterCode") || null,
    workLocationCode: formData.get("workLocationCode") || null,
    jobGradeId: formData.get("jobGradeId") || null,
    minAmountCents: formData.get("minAmountCents") ?? "",
    maxAmountCents: formData.get("maxAmountCents") ?? "",
    requiresEligibilityException:
      formData.get("requiresEligibilityException") ?? "",
    requiresPolicyException: formData.get("requiresPolicyException") ?? "",
    approverKind: formData.get("approverKind"),
    managerChainDepth: formData.get("managerChainDepth") ?? "",
    targetUserId: formData.get("targetUserId") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
      approverKind: parsed.error.flatten().fieldErrors.approverKind?.[0],
      targetUserId: parsed.error.flatten().fieldErrors.targetUserId?.[0],
    })
  }

  const result = await createOtmApprovalRoute({
    organizationId,
    userId,
    sessionId,
    label: parsed.data.label ?? null,
    priority: parsed.data.priority,
    departmentId: parsed.data.departmentId ?? null,
    costCenterCode: parsed.data.costCenterCode ?? null,
    workLocationCode: parsed.data.workLocationCode ?? null,
    jobGradeId: parsed.data.jobGradeId ?? null,
    minAmountCents: parsed.data.minAmountCents,
    maxAmountCents: parsed.data.maxAmountCents,
    requiresEligibilityException: parsed.data.requiresEligibilityException,
    requiresPolicyException: parsed.data.requiresPolicyException,
    approverKind: parsed.data.approverKind,
    managerChainDepth: parsed.data.managerChainDepth,
    targetUserId: parsed.data.targetUserId ?? null,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.errors.form })
  }

  return { ok: true, routeId: result.routeId }
}
