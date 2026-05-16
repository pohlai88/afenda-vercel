"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { requireErpPermission } from "#features/erp-rbac/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_TRAINING } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmTrainingAssignment, hrmTrainingSession } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import type { OrgSession } from "#lib/tenant"
import { and, eq } from "drizzle-orm"

import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { completeBoardingTasksForTrainingRecord } from "../data/training-boarding-bridge.server"
import { closeTrainingSessionInTransaction } from "../data/training-session.mutations.server"
import { linkTrainingCompletionToComplianceEvidence } from "../data/training-statutory-bridge.server"
import {
  closeTrainingSessionFormSchema,
  createTrainingSessionFormSchema,
  normalizeTrainingCourseCode,
  recordSessionAttendanceFormSchema,
} from "../schemas/training.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import { HRM_TRAINING_AUDIT } from "../training.contract"
import type { TrainingMutationFormState } from "../data/training.types.shared"

const TRAINING_PERMISSION = {
  module: "hrm",
  object: "training",
} as const

function revalidateTraining() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_TRAINING),
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

function parseDateTime(value: string): Date {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid datetime")
  }
  return parsed
}

export async function createTrainingSessionAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createTrainingSessionFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    courseId: formData.get("courseId"),
    code: formData.get("code"),
    title: formData.get("title"),
    scheduledStartAt: formData.get("scheduledStartAt"),
    scheduledEndAt: formData.get("scheduledEndAt"),
    location: formData.get("location"),
    meetingUrl: formData.get("meetingUrl") || undefined,
    trainerName: formData.get("trainerName") || undefined,
    trainerEmail: formData.get("trainerEmail") || undefined,
    vendorOrgId: formData.get("vendorOrgId") || undefined,
    capacity: formData.get("capacity") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid session payload." })
  }

  let scheduledStartAt: Date
  let scheduledEndAt: Date
  try {
    scheduledStartAt = parseDateTime(parsed.data.scheduledStartAt)
    scheduledEndAt = parseDateTime(parsed.data.scheduledEndAt)
  } catch {
    return hrmActionFailure({ form: "Invalid session schedule." })
  }
  if (scheduledEndAt <= scheduledStartAt) {
    return hrmActionFailure({ form: "End time must be after start time." })
  }

  const { session } = gate
  const organizationId = session.organizationId
  const userId = session.userId

  const [row] = await db
    .insert(hrmTrainingSession)
    .values({
      organizationId,
      courseId: parsed.data.courseId,
      code: normalizeTrainingCourseCode(parsed.data.code),
      title: parsed.data.title,
      scheduledStartAt,
      scheduledEndAt,
      location: parsed.data.location,
      meetingUrl: parsed.data.meetingUrl?.trim() || null,
      trainerName: parsed.data.trainerName?.trim() || null,
      trainerEmail: parsed.data.trainerEmail?.trim() || null,
      vendorOrgId: parsed.data.vendorOrgId?.trim() || null,
      capacity: parsed.data.capacity ?? null,
      state: "scheduled",
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    .returning({ id: hrmTrainingSession.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.session.create,
      actorUserId: userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_training_session",
      resourceId: row?.id ?? "",
      metadata: { courseId: parsed.data.courseId },
    })
  )

  revalidateTraining()
  return { ok: true, id: row?.id }
}

export async function recordSessionAttendanceAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = recordSessionAttendanceFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    assignmentId: formData.get("assignmentId"),
    attendance: formData.get("attendance"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid attendance payload." })
  }

  await db
    .update(hrmTrainingAssignment)
    .set({
      attendance: parsed.data.attendance,
      updatedAt: new Date(),
      updatedByUserId: gate.session.userId,
    })
    .where(
      and(
        eq(hrmTrainingAssignment.organizationId, gate.session.organizationId),
        eq(hrmTrainingAssignment.id, parsed.data.assignmentId)
      )
    )

  revalidateTraining()
  return { ok: true, id: parsed.data.assignmentId }
}

export async function submitCreateTrainingSession(formData: FormData) {
  await createTrainingSessionAction(formData)
}

export async function submitRecordSessionAttendance(formData: FormData) {
  await recordSessionAttendanceAction(formData)
}

export async function submitCloseTrainingSession(formData: FormData) {
  await closeTrainingSessionAction(formData)
}

export async function closeTrainingSessionAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "audit")
  if (!gate.ok) return gate.response

  const parsed = closeTrainingSessionFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    sessionId: formData.get("sessionId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid close session payload." })
  }

  const result = await closeTrainingSessionInTransaction({
    organizationId: gate.session.organizationId,
    sessionId: parsed.data.sessionId,
    actorUserId: gate.session.userId,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  const organizationId = gate.session.organizationId
  const userId = gate.session.userId
  const sessionId = gate.session.sessionId

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.session.audit,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_training_session",
      resourceId: result.sessionId,
      metadata: {
        recordCount: result.recordIds.length,
        skippedAbsent: result.skippedAbsent,
      },
    })

    for (const outcome of result.recordOutcomes) {
      await linkTrainingCompletionToComplianceEvidence({
        organizationId,
        recordId: outcome.recordId,
        actorUserId: userId,
      })
      await completeBoardingTasksForTrainingRecord({
        organizationId,
        employeeId: outcome.employeeId,
        courseId: outcome.courseId,
        actorUserId: userId,
        certificateDocumentId: outcome.certificateDocumentId,
      })
    }
  })

  revalidateTraining()
  return { ok: true, id: result.sessionId }
}
