"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, isNull } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { canActInOrganization } from "#lib/auth/permission.server"
import { ORG_DASHBOARD_HRM_ORGANIZATION } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmDepartment, hrmJobGrade, hrmPosition } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { assertOptionalHrmPlacementFkBelongsToOrg } from "../data/hrm-org-fk.server"
import {
  countActivePositionsInDepartment,
  countEmployeesUsingDepartment,
  countEmployeesUsingGrade,
  countEmployeesUsingPosition,
  countPositionsUsingDefaultGrade,
} from "../data/org-structure.queries.server"
import {
  archiveDepartmentFormSchema,
  archiveJobGradeFormSchema,
  archivePositionFormSchema,
  createDepartmentFormSchema,
  createJobGradeFormSchema,
  createPositionFormSchema,
} from "../schemas/org-structure.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { OrgStructureFormState } from "../types"

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

function revalidateOrganizationSurface() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_ORGANIZATION),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/employees"),
    "page"
  )
}

export async function createDepartmentAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session
  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parentRaw = formData.get("parentDepartmentId")
  const parsed = createDepartmentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    code: formData.get("code"),
    name: formData.get("name"),
    parentDepartmentId: typeof parentRaw === "string" ? parentRaw : "",
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
      form: fe.orgSlug?.[0] ?? fe.parentDepartmentId?.[0],
    })
  }

  if (parsed.data.parentDepartmentId) {
    const parent = await db.query.hrmDepartment.findFirst({
      where: and(
        eq(hrmDepartment.id, parsed.data.parentDepartmentId),
        eq(hrmDepartment.organizationId, organizationId),
        isNull(hrmDepartment.archivedAt)
      ),
    })
    if (!parent) {
      return hrmActionFailure({ form: "Parent department not found." })
    }
  }

  let row: { id: string }
  try {
    ;[row] = await db
      .insert(hrmDepartment)
      .values({
        organizationId,
        code: parsed.data.code.trim(),
        name: parsed.data.name.trim(),
        parentDepartmentId: parsed.data.parentDepartmentId ?? null,
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      .returning({ id: hrmDepartment.id })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "Department code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not create department." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.department.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_department",
      resourceId: row.id,
      metadata: { code: parsed.data.code.trim() },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function archiveDepartmentAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session
  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = archiveDepartmentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    departmentId: formData.get("departmentId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid request." })
  }

  const existing = await db.query.hrmDepartment.findFirst({
    where: and(
      eq(hrmDepartment.id, parsed.data.departmentId),
      eq(hrmDepartment.organizationId, organizationId)
    ),
  })
  if (!existing || existing.archivedAt) {
    return hrmActionFailure({
      form: "Department not found or already archived.",
    })
  }

  const [nPos, nEmp] = await Promise.all([
    countActivePositionsInDepartment(organizationId, parsed.data.departmentId),
    countEmployeesUsingDepartment(organizationId, parsed.data.departmentId),
  ])
  if (nPos > 0) {
    return hrmActionFailure({
      form: "Archive positions in this department first, or reassign them.",
    })
  }
  if (nEmp > 0) {
    return hrmActionFailure({
      form: "Employees still reference this department.",
    })
  }

  const now = new Date()
  await db
    .update(hrmDepartment)
    .set({
      archivedAt: now,
      updatedAt: now,
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmDepartment.id, parsed.data.departmentId),
        eq(hrmDepartment.organizationId, organizationId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.department.archive",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_department",
      resourceId: parsed.data.departmentId,
      metadata: { code: existing.code },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function createJobGradeAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session
  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = createJobGradeFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    code: formData.get("code"),
    name: formData.get("name"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
      form: fe.orgSlug?.[0],
    })
  }

  let row: { id: string }
  try {
    ;[row] = await db
      .insert(hrmJobGrade)
      .values({
        organizationId,
        code: parsed.data.code.trim(),
        name: parsed.data.name.trim(),
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      .returning({ id: hrmJobGrade.id })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "Job grade code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not create job grade." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.job_grade.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_job_grade",
      resourceId: row.id,
      metadata: { code: parsed.data.code.trim() },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function archiveJobGradeAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session
  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = archiveJobGradeFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    gradeId: formData.get("gradeId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid request." })
  }

  const existing = await db.query.hrmJobGrade.findFirst({
    where: and(
      eq(hrmJobGrade.id, parsed.data.gradeId),
      eq(hrmJobGrade.organizationId, organizationId)
    ),
  })
  if (!existing || existing.archivedAt) {
    return hrmActionFailure({
      form: "Job grade not found or already archived.",
    })
  }

  const [nEmp, nPos] = await Promise.all([
    countEmployeesUsingGrade(organizationId, parsed.data.gradeId),
    countPositionsUsingDefaultGrade(organizationId, parsed.data.gradeId),
  ])
  if (nEmp > 0 || nPos > 0) {
    return hrmActionFailure({
      form: "Employees or positions still reference this job grade.",
    })
  }

  const now = new Date()
  await db
    .update(hrmJobGrade)
    .set({
      archivedAt: now,
      updatedAt: now,
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmJobGrade.id, parsed.data.gradeId),
        eq(hrmJobGrade.organizationId, organizationId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.job_grade.archive",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_job_grade",
      resourceId: parsed.data.gradeId,
      metadata: { code: existing.code },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function createPositionAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session
  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = createPositionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    code: formData.get("code"),
    title: formData.get("title"),
    departmentId: formData.get("departmentId"),
    defaultGradeId: formData.get("defaultGradeId") ?? "",
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      title: fe.title?.[0],
      departmentId: fe.departmentId?.[0],
      form: fe.orgSlug?.[0],
    })
  }

  const fk = await assertOptionalHrmPlacementFkBelongsToOrg(organizationId, {
    departmentId: parsed.data.departmentId,
    gradeId: parsed.data.defaultGradeId,
  })
  if (!fk.ok) {
    return hrmActionFailure({ form: fk.message })
  }

  const dept = await db.query.hrmDepartment.findFirst({
    where: and(
      eq(hrmDepartment.id, parsed.data.departmentId),
      eq(hrmDepartment.organizationId, organizationId)
    ),
  })
  if (!dept || dept.archivedAt) {
    return hrmActionFailure({
      departmentId: "Department is not active.",
    })
  }

  let row: { id: string }
  try {
    ;[row] = await db
      .insert(hrmPosition)
      .values({
        organizationId,
        code: parsed.data.code.trim(),
        title: parsed.data.title.trim(),
        departmentId: parsed.data.departmentId,
        defaultGradeId: parsed.data.defaultGradeId ?? null,
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      .returning({ id: hrmPosition.id })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "Position code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not create position." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.position.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_position",
      resourceId: row.id,
      metadata: {
        code: parsed.data.code.trim(),
        departmentId: parsed.data.departmentId,
      },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function archivePositionAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session
  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = archivePositionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    positionId: formData.get("positionId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid request." })
  }

  const existing = await db.query.hrmPosition.findFirst({
    where: and(
      eq(hrmPosition.id, parsed.data.positionId),
      eq(hrmPosition.organizationId, organizationId)
    ),
  })
  if (!existing || existing.archivedAt) {
    return hrmActionFailure({
      form: "Position not found or already archived.",
    })
  }

  const nEmp = await countEmployeesUsingPosition(
    organizationId,
    parsed.data.positionId
  )
  if (nEmp > 0) {
    return hrmActionFailure({
      form: "Employees still reference this position.",
    })
  }

  const now = new Date()
  await db
    .update(hrmPosition)
    .set({
      archivedAt: now,
      updatedAt: now,
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmPosition.id, parsed.data.positionId),
        eq(hrmPosition.organizationId, organizationId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.position.archive",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_position",
      resourceId: parsed.data.positionId,
      metadata: { code: existing.code },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}
