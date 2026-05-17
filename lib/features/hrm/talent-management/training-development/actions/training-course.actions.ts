"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { requireErpPermission } from "#features/erp-rbac/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_TRAINING } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmTrainingCategory, hrmTrainingCourse } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import type { OrgSession } from "#lib/auth"

import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import {
  createTrainingCategoryFormSchema,
  createTrainingCourseFormSchema,
  normalizeTrainingCourseCode,
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
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_TRAINING),
    "page"
  )
}

async function requireTrainingPermission(
  formData: FormData,
  fn: "create" | "update" | "search"
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

export async function createTrainingCategoryAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createTrainingCategoryFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid category payload." })
  }

  const { session } = gate
  const code = normalizeTrainingCourseCode(parsed.data.code)
  const organizationId = session.organizationId
  const userId = session.userId
  const sessionId = session.sessionId

  const [row] = await db
    .insert(hrmTrainingCategory)
    .values({
      organizationId,
      code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    .returning({ id: hrmTrainingCategory.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.category.create,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_training_category",
      resourceId: row?.id ?? "",
      metadata: { code },
    })
  )

  revalidateTraining()
  return { ok: true, id: row?.id }
}

export async function createTrainingCourseAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createTrainingCourseFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    deliveryMode: formData.get("deliveryMode") || "classroom",
    defaultDurationHours: formData.get("defaultDurationHours") || undefined,
    defaultCreditUnits: formData.get("defaultCreditUnits") || undefined,
    statutoryFlag: formData.get("statutoryFlag")?.toString(),
    statutoryAuthorityCode: formData.get("statutoryAuthorityCode") || undefined,
    recertificationIntervalMonths:
      formData.get("recertificationIntervalMonths") || undefined,
    defaultRequired: formData.get("defaultRequired")?.toString(),
    grantsSkillId: formData.get("grantsSkillId") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid course payload." })
  }

  const { session } = gate
  const code = normalizeTrainingCourseCode(parsed.data.code)
  const organizationId = session.organizationId
  const userId = session.userId

  const [row] = await db
    .insert(hrmTrainingCourse)
    .values({
      organizationId,
      code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      categoryId: parsed.data.categoryId ?? null,
      deliveryMode: parsed.data.deliveryMode,
      defaultDurationHours: parsed.data.defaultDurationHours ?? null,
      defaultCreditUnits: parsed.data.defaultCreditUnits ?? null,
      statutoryFlag: parsed.data.statutoryFlag,
      statutoryAuthorityCode:
        parsed.data.statutoryAuthorityCode?.trim() || null,
      recertificationIntervalMonths:
        parsed.data.recertificationIntervalMonths ?? null,
      defaultRequired: parsed.data.defaultRequired,
      grantsSkillId: parsed.data.grantsSkillId ?? null,
      state: "active",
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    .returning({ id: hrmTrainingCourse.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.course.create,
      actorUserId: userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_training_course",
      resourceId: row?.id ?? "",
      metadata: { code, deliveryMode: parsed.data.deliveryMode },
    })
  )

  revalidateTraining()
  return { ok: true, id: row?.id }
}

export async function archiveTrainingCourseAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "update")
  if (!gate.ok) return gate.response

  const organizationId = gate.session.organizationId
  const courseId = String(formData.get("courseId") ?? "")
  if (!courseId) {
    return hrmActionFailure({
      form: "Course is required.",
      courseId: "Required",
    })
  }

  const now = new Date()
  await db
    .update(hrmTrainingCourse)
    .set({
      state: "archived",
      updatedAt: now,
      updatedByUserId: gate.session.userId,
    })
    .where(
      and(
        eq(hrmTrainingCourse.organizationId, organizationId),
        eq(hrmTrainingCourse.id, courseId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.course.deprecate,
      actorUserId: gate.session.userId,
      actorSessionId: gate.session.sessionId,
      organizationId,
      resourceType: "hrm_training_course",
      resourceId: courseId,
      metadata: {},
    })
  )

  revalidateTraining()
  return { ok: true, id: courseId }
}

export async function submitCreateTrainingCategory(formData: FormData) {
  await createTrainingCategoryAction(formData)
}

export async function submitCreateTrainingCourse(formData: FormData) {
  await createTrainingCourseAction(formData)
}

export async function submitArchiveTrainingCourse(formData: FormData) {
  await archiveTrainingCourseAction(formData)
}
