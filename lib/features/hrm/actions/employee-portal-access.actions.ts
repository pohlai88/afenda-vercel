"use server"

import { revalidatePath } from "next/cache"
import { and, eq, ne } from "drizzle-orm"
import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { organizationPortalAccess } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { requireHrmPermission } from "../data/hrm-admin-guard.server"
import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import {
  ensureEmployeePortalForOrganization,
  getActiveEmployeePortalAccessForEmployee,
  getEmployeePortalSubject,
} from "../data/employee-portal-access.server"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { EmployeePortalAccessFormState } from "../types"

const employeePortalAccessFormSchema = z.object({
  employeeId: z.string().uuid(),
})

type EmployeePortalAccessGate =
  | {
      ok: true
      orgSlug: string
      organizationId: string
      userId: string
      sessionId: string
      employee: NonNullable<
        Awaited<ReturnType<typeof getEmployeePortalSubject>>
      >
    }
  | { ok: false; response: EmployeePortalAccessFormState }

async function requireEmployeePortalAccessGate(
  formData: FormData
): Promise<EmployeePortalAccessGate> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) {
    return { ok: false, response: tenant.response }
  }

  const permission = await requireHrmPermission({
    object: "employee",
    function: "update",
    errorMessage: "HRM employee update permission required.",
  })
  if (!permission.ok) {
    return {
      ok: false,
      response: hrmActionFailure({ form: permission.error }),
    }
  }

  if (permission.session.organizationId !== tenant.session.organizationId) {
    return {
      ok: false,
      response: hrmActionFailure({ form: "Organization context changed." }),
    }
  }

  const parsed = employeePortalAccessFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
  })
  if (!parsed.success) {
    return {
      ok: false,
      response: hrmActionFailure({
        employeeId: parsed.error.issues[0]?.message,
      }),
    }
  }

  const employee = await getEmployeePortalSubject({
    organizationId: tenant.session.organizationId,
    employeeId: parsed.data.employeeId,
  })
  if (!employee) {
    return {
      ok: false,
      response: hrmActionFailure({ employeeId: "Employee not found." }),
    }
  }
  if (employee.archivedAt) {
    return {
      ok: false,
      response: hrmActionFailure({
        form: "Cannot grant portal access to an archived employee.",
      }),
    }
  }

  return {
    ok: true,
    orgSlug: tenant.orgSlug,
    organizationId: tenant.session.organizationId,
    userId: tenant.session.userId,
    sessionId: tenant.session.sessionId,
    employee,
  }
}

function revalidateEmployeePortalAccess(): void {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
    "page"
  )
  revalidatePath(toLocalePortalRevalidatePattern("/employee/leave"), "page")
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  )
}

type EmployeePortalAccessGrantInput = {
  portalId: string
  organizationId: string
  actorUserId: string
  employeeId: string
  linkedUserId: string
}

async function writeEmployeePortalAccessGrant(
  input: EmployeePortalAccessGrantInput
): Promise<{ id: string }> {
  const now = new Date()
  const [access] = await db.transaction(async (tx) => {
    await tx
      .update(organizationPortalAccess)
      .set({
        status: "revoked",
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(organizationPortalAccess.portalId, input.portalId),
          eq(organizationPortalAccess.audience, "employee"),
          eq(organizationPortalAccess.subjectId, input.employeeId),
          eq(organizationPortalAccess.status, "active"),
          ne(organizationPortalAccess.userId, input.linkedUserId)
        )
      )

    return tx
      .insert(organizationPortalAccess)
      .values({
        id: crypto.randomUUID(),
        portalId: input.portalId,
        organizationId: input.organizationId,
        userId: input.linkedUserId,
        audience: "employee",
        subjectId: input.employeeId,
        status: "active",
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      .onConflictDoUpdate({
        target: [
          organizationPortalAccess.portalId,
          organizationPortalAccess.userId,
          organizationPortalAccess.audience,
        ],
        set: {
          organizationId: input.organizationId,
          subjectId: input.employeeId,
          status: "active",
          updatedAt: now,
          updatedByUserId: input.actorUserId,
        },
      })
      .returning({ id: organizationPortalAccess.id })
  })

  if (!access) {
    throw new Error("Employee portal access grant did not return a row.")
  }

  return access
}

async function writeEmployeePortalAccessGrantWithRetry(
  input: EmployeePortalAccessGrantInput
): Promise<{ id: string }> {
  try {
    return await writeEmployeePortalAccessGrant(input)
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error
    }
  }

  return writeEmployeePortalAccessGrant(input)
}

export async function grantEmployeePortalAccessAction(
  _prev: EmployeePortalAccessFormState | undefined,
  formData: FormData
): Promise<EmployeePortalAccessFormState> {
  const gate = await requireEmployeePortalAccessGate(formData)
  if (!gate.ok) return gate.response

  if (!gate.employee.linkedUserId) {
    return hrmActionFailure({
      form: "Link this employee to an IAM user before granting portal access.",
    })
  }
  const linkedUserId = gate.employee.linkedUserId

  const portal = await ensureEmployeePortalForOrganization({
    organizationId: gate.organizationId,
    orgSlug: gate.orgSlug,
    actorUserId: gate.userId,
  })

  const access = await writeEmployeePortalAccessGrantWithRetry({
    portalId: portal.id,
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    employeeId: gate.employee.id,
    linkedUserId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "iam.portal.access.grant",
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    resourceType: "organization_portal_access",
    resourceId: access.id,
    metadata: {
      portalId: portal.id,
      portalSlug: portal.slug,
      portalCreated: portal.created,
      audience: "employee",
      subjectId: gate.employee.id,
      targetUserId: linkedUserId,
    },
  })

  revalidateEmployeePortalAccess()
  return { ok: true, portalSlug: portal.slug, status: "active" }
}

export async function revokeEmployeePortalAccessAction(
  _prev: EmployeePortalAccessFormState | undefined,
  formData: FormData
): Promise<EmployeePortalAccessFormState> {
  const gate = await requireEmployeePortalAccessGate(formData)
  if (!gate.ok) return gate.response

  const access = await getActiveEmployeePortalAccessForEmployee({
    organizationId: gate.organizationId,
    employeeId: gate.employee.id,
  })
  if (!access) {
    return hrmActionFailure({
      form: "No active employee portal access exists.",
    })
  }

  await db
    .update(organizationPortalAccess)
    .set({
      status: "revoked",
      updatedAt: new Date(),
      updatedByUserId: gate.userId,
    })
    .where(eq(organizationPortalAccess.id, access.accessId))

  await writeIamAuditEventFromNextHeaders({
    action: "iam.portal.access.revoke",
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    resourceType: "organization_portal_access",
    resourceId: access.accessId,
    metadata: {
      portalId: access.portalId,
      portalSlug: access.portalSlug,
      audience: "employee",
      subjectId: gate.employee.id,
      targetUserId: access.accessUserId,
    },
  })

  revalidateEmployeePortalAccess()
  return { ok: true, portalSlug: access.portalSlug, status: "revoked" }
}
