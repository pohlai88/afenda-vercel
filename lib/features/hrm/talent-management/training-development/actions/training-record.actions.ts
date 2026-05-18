"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { requireErpPermission } from "#features/erp-rbac/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_APPS_HRM_TRAINING } from "#lib/org-apps-module-paths"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import type { OrgSession } from "#lib/auth"

import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import { completeBoardingTasksForTrainingRecord } from "../data/training-boarding-bridge.server"
import { appendTrainingEvent } from "../data/training-event-log.server"
import {
  createTrainingRecordInTransaction,
  verifyTrainingRecordInTransaction,
} from "../data/training-record.mutations.server"
import { notifyTrainingRecordVerified } from "../data/training-notification.server"
import { getTrainingRecordById } from "../data/training.queries.server"
import { grantSkillFromTrainingRecord } from "../data/training-skill-bridge.server"
import { linkTrainingCompletionToComplianceEvidence } from "../data/training-statutory-bridge.server"
import {
  completeTrainingRecordFormSchema,
  verifyTrainingRecordFormSchema,
} from "../schemas/training.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_TRAINING_AUDIT } from "../training.contract"
import type { TrainingMutationFormState } from "../data/training.types.shared"

const TRAINING_PERMISSION = {
  module: "hrm",
  object: "training",
} as const

function revalidateTraining() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_TRAINING),
    "page"
  )
}

async function requireTrainingPermission(
  formData: FormData,
  fn: "create" | "update" | "audit"
): Promise<
  | { ok: true; session: OrgSession; orgSlug: string }
  | { ok: false; response: TrainingMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireErpPermission({
    ...TRAINING_PERMISSION,
    function: fn,
  })
  if (!permission.ok) {
    return { ok: false, response: hrmActionFailure({ form: permission.error }) }
  }

  return { ok: true, session: permission.session, orgSlug: tenant.orgSlug }
}

export async function completeTrainingRecordAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = completeTrainingRecordFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    assignmentId: formData.get("assignmentId") || undefined,
    courseId: formData.get("courseId"),
    sessionId: formData.get("sessionId") || undefined,
    employeeId: formData.get("employeeId"),
    completedAt: formData.get("completedAt"),
    instructor: formData.get("instructor") || undefined,
    hoursCompleted: formData.get("hoursCompleted") || undefined,
    creditUnits: formData.get("creditUnits") || undefined,
    costAmount: formData.get("costAmount") || undefined,
    costCurrency: formData.get("costCurrency") || "MYR",
    notes: formData.get("notes") || undefined,
    certificateDocumentId: formData.get("certificateDocumentId") || undefined,
    feedbackRating: formData.get("feedbackRating") || undefined,
    feedbackText: formData.get("feedbackText") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid completion payload." })
  }

  const result = await createTrainingRecordInTransaction({
    organizationId: gate.session.organizationId,
    assignmentId: parsed.data.assignmentId,
    sessionId: parsed.data.sessionId,
    courseId: parsed.data.courseId,
    employeeId: parsed.data.employeeId,
    completedAt: parsed.data.completedAt,
    instructor: parsed.data.instructor,
    hoursCompleted: parsed.data.hoursCompleted,
    creditUnits: parsed.data.creditUnits,
    costAmount: parsed.data.costAmount,
    costCurrency: parsed.data.costCurrency,
    notes: parsed.data.notes,
    certificateDocumentId: parsed.data.certificateDocumentId,
    feedbackRating: parsed.data.feedbackRating,
    feedbackText: parsed.data.feedbackText,
    verificationState: "hr_verified",
    actorUserId: gate.session.userId,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  const organizationId = gate.session.organizationId
  const userId = gate.session.userId

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.record.create,
      actorUserId: userId,
      actorSessionId: gate.session.sessionId,
      organizationId,
      resourceType: "hrm_training_record",
      resourceId: result.recordId,
      metadata: {
        courseId: result.courseId,
        employeeId: result.employeeId,
      },
    })
    await appendTrainingEvent({
      organizationId,
      action: "completed",
      employeeId: result.employeeId,
      actorUserId: userId,
      assignmentId: parsed.data.assignmentId ?? null,
      recordId: result.recordId,
      sessionId: parsed.data.sessionId ?? null,
    })
    await linkTrainingCompletionToComplianceEvidence({
      organizationId,
      recordId: result.recordId,
      actorUserId: userId,
    })
    await completeBoardingTasksForTrainingRecord({
      organizationId,
      employeeId: result.employeeId,
      courseId: result.courseId,
      actorUserId: userId,
      certificateDocumentId: parsed.data.certificateDocumentId,
    })
    await grantSkillFromTrainingRecord({
      organizationId,
      courseId: result.courseId,
      employeeId: result.employeeId,
      completedAt: result.completedAt,
      expiresAt: result.expiresAt,
      actorUserId: userId,
    })
  })

  revalidateTraining()
  return { ok: true, id: result.recordId }
}

export async function verifyTrainingRecordAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "audit")
  if (!gate.ok) return gate.response

  const parsed = verifyTrainingRecordFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    recordId: formData.get("recordId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid verify payload." })
  }

  const result = await verifyTrainingRecordInTransaction({
    organizationId: gate.session.organizationId,
    recordId: parsed.data.recordId,
    actorUserId: gate.session.userId,
  })
  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.record.audit,
      actorUserId: gate.session.userId,
      actorSessionId: gate.session.sessionId,
      organizationId: gate.session.organizationId,
      resourceType: "hrm_training_record",
      resourceId: parsed.data.recordId,
      metadata: {},
    })
    const record = await getTrainingRecordById(
      gate.session.organizationId,
      parsed.data.recordId
    )
    if (record) {
      notifyTrainingRecordVerified({
        organizationId: gate.session.organizationId,
        employeeId: record.employeeId,
        courseName: record.courseName,
      })
    }
  })

  revalidateTraining()
  return { ok: true, id: parsed.data.recordId }
}

export async function submitCompleteTrainingRecord(formData: FormData) {
  await completeTrainingRecordAction(formData)
}

export async function submitVerifyTrainingRecord(formData: FormData) {
  await verifyTrainingRecordAction(formData)
}
