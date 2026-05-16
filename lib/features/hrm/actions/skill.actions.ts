"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmEmployeeSkill, hrmSkill } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmPermission } from "../data/hrm-admin-guard.server"
import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import {
  archiveSkillFormSchema,
  assignEmployeeSkillFormSchema,
  createSkillFormSchema,
  removeEmployeeSkillFormSchema,
  updateSkillFormSchema,
  verifyEmployeeSkillFormSchema,
} from "../schemas/skill.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { ContractMutationFormState } from "../types"

function revalidateSkills() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(`${ORG_DASHBOARD_HRM}/skills`),
    "page"
  )
}

export async function createSkillAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const perm = await requireHrmPermission({
    object: "skill",
    function: "create",
  })
  if (!perm.ok) return hrmActionFailure({ form: perm.error })

  const parsed = createSkillFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    code: formData.get("code"),
    label: formData.get("label"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid skill payload." })
  }

  const skillId = crypto.randomUUID()
  const { organizationId, userId, sessionId } = gate.session

  await db.insert(hrmSkill).values({
    id: skillId,
    organizationId,
    categoryId: parsed.data.categoryId?.trim() || null,
    code: parsed.data.code.trim().toLowerCase(),
    label: parsed.data.label.trim(),
    description: parsed.data.description?.trim() || null,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.skill.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_skill",
      resourceId: skillId,
      metadata: { code: parsed.data.code },
    })
  )

  revalidateSkills()
  return { ok: true }
}

export async function updateSkillAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const perm = await requireHrmPermission({
    object: "skill",
    function: "update",
  })
  if (!perm.ok) return hrmActionFailure({ form: perm.error })

  const parsed = updateSkillFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    skillId: formData.get("skillId"),
    label: formData.get("label"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid skill payload." })
  }

  const now = new Date()
  const { organizationId, userId, sessionId } = gate.session

  await db
    .update(hrmSkill)
    .set({
      label: parsed.data.label.trim(),
      description: parsed.data.description?.trim() || null,
      categoryId: parsed.data.categoryId?.trim() || null,
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmSkill.organizationId, organizationId),
        eq(hrmSkill.id, parsed.data.skillId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.skill.update",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_skill",
      resourceId: parsed.data.skillId,
      metadata: {},
    })
  )

  revalidateSkills()
  return { ok: true }
}

export async function archiveSkillAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const perm = await requireHrmPermission({
    object: "skill",
    function: "delete",
  })
  if (!perm.ok) return hrmActionFailure({ form: perm.error })

  const parsed = archiveSkillFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    skillId: formData.get("skillId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid archive payload." })
  }

  const now = new Date()
  const { organizationId, userId, sessionId } = gate.session

  await db
    .update(hrmSkill)
    .set({ archivedAt: now, updatedAt: now })
    .where(
      and(
        eq(hrmSkill.organizationId, organizationId),
        eq(hrmSkill.id, parsed.data.skillId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.skill.archive",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_skill",
      resourceId: parsed.data.skillId,
      metadata: {},
    })
  )

  revalidateSkills()
  return { ok: true }
}

export async function assignEmployeeSkillAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const perm = await requireHrmPermission({
    object: "skill",
    function: "update",
  })
  if (!perm.ok) return hrmActionFailure({ form: perm.error })

  const parsed = assignEmployeeSkillFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    skillId: formData.get("skillId"),
    proficiency: formData.get("proficiency"),
    validityFrom: formData.get("validityFrom"),
    validityTo: formData.get("validityTo"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid assignment payload." })
  }

  const { organizationId, userId, sessionId } = gate.session
  const now = new Date()

  await db
    .insert(hrmEmployeeSkill)
    .values({
      organizationId,
      employeeId: parsed.data.employeeId,
      skillId: parsed.data.skillId,
      proficiency: parsed.data.proficiency,
      validityFrom: parsed.data.validityFrom,
      validityTo: parsed.data.validityTo?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [hrmEmployeeSkill.employeeId, hrmEmployeeSkill.skillId],
      set: {
        proficiency: parsed.data.proficiency,
        validityFrom: parsed.data.validityFrom,
        validityTo: parsed.data.validityTo?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        updatedAt: now,
      },
    })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.skill.assign",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employee_skill",
      resourceId: `${parsed.data.employeeId}:${parsed.data.skillId}`,
      metadata: {
        employeeId: parsed.data.employeeId,
        skillId: parsed.data.skillId,
      },
    })
  )

  revalidateSkills()
  return { ok: true }
}

export async function verifyEmployeeSkillAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const perm = await requireHrmPermission({
    object: "skill",
    function: "update",
  })
  if (!perm.ok) return hrmActionFailure({ form: perm.error })

  const parsed = verifyEmployeeSkillFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    skillId: formData.get("skillId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid verify payload." })
  }

  const now = new Date()
  const { organizationId, userId, sessionId } = gate.session

  await db
    .update(hrmEmployeeSkill)
    .set({
      verifiedByUserId: userId,
      verifiedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmEmployeeSkill.organizationId, organizationId),
        eq(hrmEmployeeSkill.employeeId, parsed.data.employeeId),
        eq(hrmEmployeeSkill.skillId, parsed.data.skillId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.skill.verify",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employee_skill",
      resourceId: `${parsed.data.employeeId}:${parsed.data.skillId}`,
      metadata: {},
    })
  )

  revalidateSkills()
  return { ok: true }
}

export async function removeEmployeeSkillAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const perm = await requireHrmPermission({
    object: "skill",
    function: "delete",
  })
  if (!perm.ok) return hrmActionFailure({ form: perm.error })

  const parsed = removeEmployeeSkillFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    skillId: formData.get("skillId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid remove payload." })
  }

  const { organizationId, userId, sessionId } = gate.session

  await db
    .delete(hrmEmployeeSkill)
    .where(
      and(
        eq(hrmEmployeeSkill.organizationId, organizationId),
        eq(hrmEmployeeSkill.employeeId, parsed.data.employeeId),
        eq(hrmEmployeeSkill.skillId, parsed.data.skillId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.skill.remove",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employee_skill",
      resourceId: `${parsed.data.employeeId}:${parsed.data.skillId}`,
      metadata: {},
    })
  )

  revalidateSkills()
  return { ok: true }
}
