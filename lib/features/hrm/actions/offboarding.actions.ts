"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { canActInOrganization } from "#lib/auth/permission.server"
import { db } from "#lib/db"
import { hrmOffboardingInstance } from "#lib/db/schema"
import {
  ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL,
  ORG_DASHBOARD_HRM_EMPLOYEES,
} from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { organizationHrmEmployeePath } from "../constants"
import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import type { OffboardingChecklistTask } from "../data/offboarding-defaults.shared"
import { completeOffboardingTaskFormSchema } from "../schemas/offboarding.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { ContractMutationFormState } from "../types"

export async function completeOffboardingTaskAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session, orgSlug } = gate
  const { organizationId, userId, user, sessionId } = session

  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = completeOffboardingTaskFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    taskKey: formData.get("taskKey"),
    employeeId: formData.get("employeeId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid offboarding fields." })
  }

  const { instanceId, taskKey, employeeId } = parsed.data

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
    return hrmActionFailure({ form: "Offboarding instance not found." })
  }

  const list = (row.checklist as OffboardingChecklistTask[]) ?? []
  const next = list.map((t) =>
    t.taskKey === taskKey ? { ...t, completedAt: new Date().toISOString() } : t
  )

  const allDone = next.every((t) => t.completedAt !== null)

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
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_offboarding_instance",
      resourceId: instanceId,
      metadata: {
        taskKey,
        checklistStatus: allDone ? "completed" : "open",
      },
    })
  )

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
    "page"
  )
  revalidatePath(organizationHrmEmployeePath(orgSlug, employeeId), "page")
  return { ok: true }
}

export async function completeOffboardingTaskFormAction(
  formData: FormData
): Promise<void> {
  void (await completeOffboardingTaskAction(undefined, formData))
}
