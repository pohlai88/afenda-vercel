"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmOffboardingInstance } from "#lib/db/schema"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { withEmployeePortalActionSpan } from "../data/portal-mutation-tracing.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import type { OffboardingChecklistTask } from "../../offboarding-exit-management/data/offboarding-defaults.shared"
import { completeOffboardingTaskFormSchema } from "../../offboarding-exit-management/schemas/offboarding.schema"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"

function revalidatePortalOffboarding() {
  revalidatePath(
    toLocalePortalRevalidatePattern("/employee/offboarding"),
    "page"
  )
}

export async function completePortalOffboardingTaskAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const parsed = completeOffboardingTaskFormSchema.safeParse({
    orgSlug: formData.get("orgSlug") ?? "portal",
    instanceId: formData.get("instanceId"),
    taskKey: formData.get("taskKey"),
    employeeId: context.employee.id,
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid offboarding fields." })
  }

  const { instanceId, taskKey, employeeId } = parsed.data
  const organizationId = context.portal.organizationId
  const userId = context.portal.userId

  const [row] = await db
    .select({
      id: hrmOffboardingInstance.id,
      checklist: hrmOffboardingInstance.checklist,
      status: hrmOffboardingInstance.status,
    })
    .from(hrmOffboardingInstance)
    .where(
      and(
        eq(hrmOffboardingInstance.organizationId, organizationId),
        eq(hrmOffboardingInstance.id, instanceId),
        eq(hrmOffboardingInstance.employeeId, employeeId)
      )
    )
    .limit(1)

  if (!row || row.status !== "open") {
    return hrmActionFailure({ form: "Offboarding checklist is not open." })
  }

  const list = (row.checklist as OffboardingChecklistTask[]) ?? []
  const next = list.map((task) =>
    task.taskKey === taskKey
      ? { ...task, completedAt: new Date().toISOString() }
      : task
  )
  const allDone = next.every((task) => task.completedAt !== null)

  return withEmployeePortalActionSpan(
    context,
    "offboarding",
    "task.complete",
    async () => {
      await db
        .update(hrmOffboardingInstance)
        .set({
          checklist: next,
          status: allDone ? "completed" : "open",
          updatedAt: new Date(),
          updatedByUserId: userId,
        })
        .where(eq(hrmOffboardingInstance.id, instanceId))

      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: "erp.hrm.employee.offboarding.task.complete",
          actorUserId: userId,
          actorSessionId: context.portal.sessionId,
          organizationId,
          resourceType: "hrm_offboarding_instance",
          resourceId: instanceId,
          metadata: { taskKey, surface: "employee_portal" },
        })
      )

      revalidatePortalOffboarding()
      return { ok: true }
    }
  )
}
