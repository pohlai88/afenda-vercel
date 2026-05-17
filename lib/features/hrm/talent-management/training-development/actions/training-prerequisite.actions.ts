"use server"

import { revalidatePath } from "next/cache"

import { requireErpPermission } from "#features/erp-rbac/server"
import { ORG_DASHBOARD_HRM_TRAINING } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmOrgTenantFromForm } from "../../../hrm-action-guard.server"
import {
  addTrainingPrerequisite,
  removeTrainingPrerequisite,
} from "../data/training-prerequisite.server"
import { setTrainingPrerequisiteFormSchema } from "../schemas/training.schema"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { TrainingMutationFormState } from "../data/training.types.shared"

function revalidateTraining() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_TRAINING),
    "page"
  )
}

export async function setTrainingPrerequisiteAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return tenant.response

  const permission = await requireErpPermission({
    module: "hrm",
    object: "training",
    function: "update",
  })
  if (!permission.ok) {
    return hrmActionFailure({ form: permission.error })
  }

  const parsed = setTrainingPrerequisiteFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    courseId: formData.get("courseId"),
    prerequisiteCourseId: formData.get("prerequisiteCourseId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid prerequisite payload." })
  }

  const result = await addTrainingPrerequisite({
    organizationId: permission.session.organizationId,
    courseId: parsed.data.courseId,
    prerequisiteCourseId: parsed.data.prerequisiteCourseId,
  })
  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  revalidateTraining()
  return { ok: true }
}

export async function removeTrainingPrerequisiteAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return tenant.response

  const permission = await requireErpPermission({
    module: "hrm",
    object: "training",
    function: "update",
  })
  if (!permission.ok) {
    return hrmActionFailure({ form: permission.error })
  }

  const prerequisiteId = (
    formData.get("prerequisiteId") as string | null
  )?.trim()
  if (!prerequisiteId) {
    return hrmActionFailure({ form: "Prerequisite ID is required." })
  }

  await removeTrainingPrerequisite({
    organizationId: permission.session.organizationId,
    prerequisiteId,
  })

  revalidateTraining()
  return { ok: true }
}

export async function submitSetTrainingPrerequisite(formData: FormData) {
  await setTrainingPrerequisiteAction(formData)
}

export async function submitRemoveTrainingPrerequisite(formData: FormData) {
  await removeTrainingPrerequisiteAction(formData)
}
