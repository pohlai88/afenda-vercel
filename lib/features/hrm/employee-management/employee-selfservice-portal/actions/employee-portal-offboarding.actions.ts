"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { withEmployeePortalActionSpan } from "../data/portal-mutation-tracing.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { HRM_ESS_AUDIT } from "../ess.contract"
import { transitionOffboardingTaskMutation } from "../../offboarding-exit-management/data/offboarding.mutations.server"
import { completeOffboardingTaskFormSchema } from "../../offboarding-exit-management/schemas/offboarding.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
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

  return withEmployeePortalActionSpan(
    context,
    "offboarding",
    "task.complete",
    async () => {
      const result = await transitionOffboardingTaskMutation({
        organizationId,
        instanceId,
        employeeId,
        taskKey,
        transition: "complete",
        actorUserId: userId,
        allowedOwnerRoles: ["employee"],
      })
      if (!result.ok) return hrmActionFailure({ form: result.message })

      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: HRM_ESS_AUDIT.offboarding.completeTask,
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
