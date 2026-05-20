"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/auth"
import { db } from "#lib/db"
import { hrmOvertimeRequest } from "#lib/db/schema"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { MarkOtmPayrollReadyFormState } from "../../../types"
import { HRM_OTM_AUDIT } from "../otm.contract"
import { markOtmPayrollReadySchema } from "../schemas/otm.schema"
import { revalidateOtmSurfaces } from "../data/otm-revalidate.server"
import { notifyOtmEmployeeLifecycle } from "../data/otm-notification.server"

export async function markOtmPayrollReadyAction(
  _prev: MarkOtmPayrollReadyFormState | undefined,
  formData: FormData
): Promise<MarkOtmPayrollReadyFormState> {
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
      form: "You are not authorized to mark overtime payroll-ready.",
    })
  }

  const parsed = markOtmPayrollReadySchema.safeParse({
    requestId: formData.get("requestId"),
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const { requestId } = parsed.data

  const req = await db.query.hrmOvertimeRequest.findFirst({
    where: and(
      eq(hrmOvertimeRequest.id, requestId),
      eq(hrmOvertimeRequest.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      payableMinutes: true,
      employeeId: true,
      workDate: true,
    },
  })

  if (!req) {
    return hrmActionFailure({ form: "Overtime request not found." })
  }

  if (req.state !== "approved") {
    return hrmActionFailure({
      form: `Only approved requests can be marked payroll-ready (current: ${req.state}).`,
    })
  }

  if (req.payableMinutes == null) {
    return hrmActionFailure({
      form: "Request has no payable minutes; re-approve after policy is configured.",
    })
  }

  await db
    .update(hrmOvertimeRequest)
    .set({
      state: "payroll_ready",
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmOvertimeRequest.id, requestId),
        eq(hrmOvertimeRequest.organizationId, organizationId)
      )
    )

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.payrollExport,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_overtime_request",
    resourceId: requestId,
    metadata: {
      payableMinutes: req.payableMinutes,
      transition: "payroll_ready",
    },
  })

  await notifyOtmEmployeeLifecycle({
    organizationId,
    employeeId: req.employeeId,
    requestId,
    event: "payroll_ready",
    workDate: req.workDate,
  })

  revalidateOtmSurfaces()
  return { ok: true, requestId }
}
