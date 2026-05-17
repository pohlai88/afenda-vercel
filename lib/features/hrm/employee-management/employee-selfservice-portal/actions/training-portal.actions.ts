"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { completeBoardingTasksForTrainingRecord } from "../../../talent-management/training-development/data/training-boarding-bridge.server"
import { appendTrainingEvent } from "../../../talent-management/training-development/data/training-event-log.server"
import { createTrainingRecordInTransaction } from "../../../talent-management/training-development/data/training-record.mutations.server"
import { linkTrainingCompletionToComplianceEvidence } from "../../../talent-management/training-development/data/training-statutory-bridge.server"
import { grantSkillFromTrainingRecord } from "../../../talent-management/training-development/data/training-skill-bridge.server"
import { updateTrainingRecordFeedback } from "../../../talent-management/training-development/data/training-record.mutations.server"
import {
  completeTrainingRecordFormSchema,
  submitTrainingFeedbackFormSchema,
} from "../../../talent-management/training-development/schemas/training.schema"
import { HRM_TRAINING_AUDIT } from "../../../talent-management/training-development/training.contract"

export type PortalTrainingFormState =
  | { ok: true; id?: string }
  | { ok: false; errors: { form?: string } }

function blobUrlMatchesOrgHrmEmployeePath(
  blobUrl: string,
  organizationId: string,
  employeeId: string
): boolean {
  try {
    const path = decodeURIComponent(new URL(blobUrl).pathname)
    return path.includes(`/orgs/${organizationId}/hrm/${employeeId}/`)
  } catch {
    return false
  }
}

export async function portalSelfAttestTrainingAction(
  formData: FormData
): Promise<PortalTrainingFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return {
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    }
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return {
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    }
  }

  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id

  const parsed = completeTrainingRecordFormSchema.safeParse({
    organizationId,
    orgSlug: context.portal.portalSlug,
    assignmentId: formData.get("assignmentId") || undefined,
    courseId: formData.get("courseId"),
    sessionId: formData.get("sessionId") || undefined,
    employeeId,
    completedAt: formData.get("completedAt"),
    instructor: formData.get("instructor") || undefined,
    hoursCompleted: formData.get("hoursCompleted") || undefined,
    creditUnits: formData.get("creditUnits") || undefined,
    notes: formData.get("notes") || undefined,
    certificateDocumentId: formData.get("certificateDocumentId") || undefined,
    feedbackRating: formData.get("feedbackRating") || undefined,
    feedbackText: formData.get("feedbackText") || undefined,
  })

  if (!parsed.success) {
    return { ok: false, errors: { form: "Invalid training completion." } }
  }

  const blobUrl = formData.get("blobUrl")
  if (
    typeof blobUrl === "string" &&
    blobUrl.trim() !== "" &&
    !blobUrlMatchesOrgHrmEmployeePath(blobUrl, organizationId, employeeId)
  ) {
    return {
      ok: false,
      errors: { form: "Certificate upload path is invalid." },
    }
  }

  const result = await createTrainingRecordInTransaction({
    organizationId,
    assignmentId: parsed.data.assignmentId,
    sessionId: parsed.data.sessionId,
    courseId: parsed.data.courseId,
    employeeId,
    completedAt: parsed.data.completedAt,
    instructor: parsed.data.instructor,
    hoursCompleted: parsed.data.hoursCompleted,
    creditUnits: parsed.data.creditUnits,
    notes: parsed.data.notes,
    certificateDocumentId: parsed.data.certificateDocumentId,
    feedbackRating: parsed.data.feedbackRating,
    feedbackText: parsed.data.feedbackText,
    verificationState: "self_attested",
    actorUserId: context.portal.userId,
  })

  if (!result.ok) {
    return { ok: false, errors: { form: result.message } }
  }

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.record.create,
      actorUserId: context.portal.userId,
      actorSessionId: context.portal.sessionId,
      organizationId,
      resourceType: "hrm_training_record",
      resourceId: result.recordId,
      metadata: { portal: true, courseId: result.courseId },
    })
    await appendTrainingEvent({
      organizationId,
      action: "completed",
      employeeId,
      actorUserId: context.portal.userId,
      assignmentId: parsed.data.assignmentId ?? null,
      recordId: result.recordId,
      sessionId: parsed.data.sessionId ?? null,
      payload: { portal: true },
    })
    await linkTrainingCompletionToComplianceEvidence({
      organizationId,
      recordId: result.recordId,
      actorUserId: context.portal.userId,
    })
    await completeBoardingTasksForTrainingRecord({
      organizationId,
      employeeId,
      courseId: result.courseId,
      actorUserId: context.portal.userId,
      certificateDocumentId: parsed.data.certificateDocumentId,
    })
    await grantSkillFromTrainingRecord({
      organizationId,
      courseId: result.courseId,
      employeeId,
      completedAt: result.completedAt,
      expiresAt: result.expiresAt,
      actorUserId: context.portal.userId,
    })
  })

  revalidatePath(toLocalePortalRevalidatePattern("/employee/training"), "page")
  return { ok: true, id: result.recordId }
}

export async function submitPortalSelfAttestTraining(formData: FormData) {
  await portalSelfAttestTrainingAction(formData)
}

export async function portalSubmitTrainingFeedbackAction(
  formData: FormData
): Promise<PortalTrainingFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return {
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    }
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return {
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    }
  }

  const parsed = submitTrainingFeedbackFormSchema.safeParse({
    organizationId: context.portal.organizationId,
    portalSlug: rawPortalSlug,
    recordId: formData.get("recordId"),
    feedbackRating: formData.get("feedbackRating"),
    feedbackText: formData.get("feedbackText") || undefined,
  })

  if (!parsed.success) {
    return { ok: false, errors: { form: "Invalid feedback." } }
  }

  const result = await updateTrainingRecordFeedback({
    organizationId: parsed.data.organizationId,
    recordId: parsed.data.recordId,
    employeeId: context.employee.id,
    feedbackRating: parsed.data.feedbackRating,
    feedbackText: parsed.data.feedbackText,
    actorUserId: context.portal.userId,
  })

  if (!result.ok) {
    return { ok: false, errors: { form: result.message } }
  }

  revalidatePath(toLocalePortalRevalidatePattern("/employee/training"), "page")
  return { ok: true }
}

export async function submitPortalTrainingFeedback(formData: FormData) {
  await portalSubmitTrainingFeedbackAction(formData)
}
