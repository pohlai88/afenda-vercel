"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, desc, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL,
  ORG_DASHBOARD_HRM_EMPLOYEES,
} from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmEmployee, hrmEmploymentContract } from "#lib/db/schema"
import {
  toLocaleOrgDashboardRevalidatePattern,
} from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { assertOptionalHrmPlacementFkBelongsToOrg } from "../data/hrm-org-fk.server"
import { validateHrmOrgSlugMatchesSession } from "../data/hrm-tenant-form.server"
import {
  calendarDayBeforeIso,
  formatUtcDateOnly,
  isoDateOnlyToUtcDate,
} from "../data/hrm-calendar-dates.server"
import {
  activateContractFormSchema,
  createDraftContractFormSchema,
  terminateContractFormSchema,
} from "../schemas/employment-contract.schema"
import type { ContractMutationFormState } from "../types"

function revalidateHrmEmployeeSurfaces() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
    "page"
  )
}

export async function createDraftContractAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const tenant = await validateHrmOrgSlugMatchesSession(formData, organizationId)
  if (!tenant.ok) {
    return { ok: false, errors: { form: tenant.message } }
  }

  const parsed = createDraftContractFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    contractType: formData.get("contractType"),
    effectiveFrom: formData.get("effectiveFrom"),
    departmentId: formData.get("departmentId"),
    positionId: formData.get("positionId"),
    jobGradeId: formData.get("jobGradeId"),
    baseSalaryAmount: formData.get("baseSalaryAmount"),
    payFrequency: formData.get("payFrequency"),
    normalWorkingHoursPerWeek: formData.get("normalWorkingHoursPerWeek"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        form: fe.effectiveFrom?.[0] ?? fe.contractType?.[0],
        effectiveFrom: fe.effectiveFrom?.[0],
      },
    }
  }

  const d = parsed.data
  const deptId =
    d.departmentId && d.departmentId.length > 0 ? d.departmentId : undefined
  const posId =
    d.positionId && d.positionId.length > 0 ? d.positionId : undefined
  const gradeId =
    d.jobGradeId && d.jobGradeId.length > 0 ? d.jobGradeId : undefined

  const fk = await assertOptionalHrmPlacementFkBelongsToOrg(organizationId, {
    departmentId: deptId,
    positionId: posId,
    gradeId: gradeId,
  })
  if (!fk.ok) {
    return { ok: false, errors: { form: fk.message } }
  }

  const [emp] = await db
    .select({
      id: hrmEmployee.id,
      archivedAt: hrmEmployee.archivedAt,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, d.employeeId)
      )
    )
    .limit(1)

  if (!emp) {
    return { ok: false, errors: { form: "Employee not found." } }
  }
  if (emp.archivedAt) {
    return {
      ok: false,
      errors: { form: "Archived employees cannot receive new draft contracts." },
    }
  }

  const baseSalary =
    d.baseSalaryAmount && d.baseSalaryAmount.length > 0
      ? d.baseSalaryAmount
      : null
  const hours =
    d.normalWorkingHoursPerWeek && d.normalWorkingHoursPerWeek.length > 0
      ? d.normalWorkingHoursPerWeek
      : null

  const { contractId, versionNumber } = await db.transaction(async (tx) => {
    const [last] = await tx
      .select({ vn: hrmEmploymentContract.versionNumber })
      .from(hrmEmploymentContract)
      .where(
        and(
          eq(hrmEmploymentContract.organizationId, organizationId),
          eq(hrmEmploymentContract.employeeId, d.employeeId)
        )
      )
      .orderBy(desc(hrmEmploymentContract.versionNumber))
      .limit(1)

    const versionNumber = (last?.vn ?? 0) + 1
    const id = crypto.randomUUID()

    await tx.insert(hrmEmploymentContract).values({
      id,
      organizationId,
      employeeId: d.employeeId,
      versionNumber,
      contractType: d.contractType,
      state: "draft",
      effectiveFrom: isoDateOnlyToUtcDate(d.effectiveFrom),
      departmentId: deptId ?? null,
      positionId: posId ?? null,
      jobGradeId: gradeId ?? null,
      baseSalaryAmount: baseSalary,
      payFrequency: d.payFrequency ?? "monthly",
      normalWorkingHoursPerWeek: hours,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    return { contractId: id, versionNumber }
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.contract.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employment_contract",
      resourceId: contractId,
      metadata: {
        employeeId: d.employeeId,
        versionNumber,
        contractType: d.contractType,
        state: "draft",
      },
    })
  )

  revalidateHrmEmployeeSurfaces()
  return { ok: true }
}

export async function activateContractAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const tenant = await validateHrmOrgSlugMatchesSession(formData, organizationId)
  if (!tenant.ok) {
    return { ok: false, errors: { form: tenant.message } }
  }

  const parsed = activateContractFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    contractId: formData.get("contractId"),
  })
  if (!parsed.success) {
    return {
      ok: false,
      errors: { contractId: parsed.error.flatten().fieldErrors.contractId?.[0] },
    }
  }

  const { contractId } = parsed.data

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: hrmEmploymentContract.id,
        employeeId: hrmEmploymentContract.employeeId,
        state: hrmEmploymentContract.state,
        signedDocumentId: hrmEmploymentContract.signedDocumentId,
        effectiveFrom: hrmEmploymentContract.effectiveFrom,
        versionNumber: hrmEmploymentContract.versionNumber,
      })
      .from(hrmEmploymentContract)
      .where(
        and(
          eq(hrmEmploymentContract.organizationId, organizationId),
          eq(hrmEmploymentContract.id, contractId)
        )
      )
      .limit(1)

    if (!row) {
      return { ok: false as const, message: "Contract not found." }
    }
    if (row.state !== "draft") {
      return { ok: false as const, message: "Only draft contracts can be activated." }
    }
    if (!row.signedDocumentId) {
      return {
        ok: false as const,
        message: "Attach and link a signed document before activation.",
      }
    }

    const [emp] = await tx
      .select({ archivedAt: hrmEmployee.archivedAt })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          eq(hrmEmployee.id, row.employeeId)
        )
      )
      .limit(1)

    if (!emp) {
      return { ok: false as const, message: "Employee not found." }
    }
    if (emp.archivedAt) {
      return {
        ok: false as const,
        message: "Cannot activate a contract for an archived employee.",
      }
    }

    const [active] = await tx
      .select({
        id: hrmEmploymentContract.id,
        effectiveFrom: hrmEmploymentContract.effectiveFrom,
      })
      .from(hrmEmploymentContract)
      .where(
        and(
          eq(hrmEmploymentContract.organizationId, organizationId),
          eq(hrmEmploymentContract.employeeId, row.employeeId),
          eq(hrmEmploymentContract.state, "active")
        )
      )
      .limit(1)

    if (active) {
      if (active.effectiveFrom.getTime() > row.effectiveFrom.getTime()) {
        return {
          ok: false as const,
          message:
            "Activate a contract that starts on or after the current active effective-from date.",
        }
      }
      const newStartIso = formatUtcDateOnly(row.effectiveFrom)
      const supersedeEndIso =
        formatUtcDateOnly(active.effectiveFrom) === newStartIso
          ? newStartIso
          : calendarDayBeforeIso(newStartIso)
      await tx
        .update(hrmEmploymentContract)
        .set({
          state: "superseded",
          effectiveTo: isoDateOnlyToUtcDate(supersedeEndIso),
          updatedAt: new Date(),
          updatedByUserId: userId,
        })
        .where(eq(hrmEmploymentContract.id, active.id))
    }

    await tx
      .update(hrmEmploymentContract)
      .set({
        state: "active",
        updatedAt: new Date(),
        updatedByUserId: userId,
      })
      .where(eq(hrmEmploymentContract.id, row.id))

    await tx
      .update(hrmEmployee)
      .set({
        currentEmploymentContractId: row.id,
        updatedAt: new Date(),
        updatedByUserId: userId,
      })
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          eq(hrmEmployee.id, row.employeeId)
        )
      )

    return {
      ok: true as const,
      employeeId: row.employeeId,
      versionNumber: row.versionNumber,
    }
  })

  if (!result.ok) {
    return { ok: false, errors: { form: result.message } }
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.contract.activate",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employment_contract",
      resourceId: contractId,
      metadata: {
        employeeId: result.employeeId,
        versionNumber: result.versionNumber,
      },
    })
  )

  revalidateHrmEmployeeSurfaces()
  return { ok: true }
}

export async function terminateContractAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const tenant = await validateHrmOrgSlugMatchesSession(formData, organizationId)
  if (!tenant.ok) {
    return { ok: false, errors: { form: tenant.message } }
  }

  const parsed = terminateContractFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    contractId: formData.get("contractId"),
    terminationDate: formData.get("terminationDate"),
    terminationReason: formData.get("terminationReason"),
    terminationNoticeDays: formData.get("terminationNoticeDays"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        terminationDate: fe.terminationDate?.[0],
        form: fe.contractId?.[0],
      },
    }
  }

  const { contractId, terminationDate, terminationReason, terminationNoticeDays } =
    parsed.data

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: hrmEmploymentContract.id,
        employeeId: hrmEmploymentContract.employeeId,
        state: hrmEmploymentContract.state,
      })
      .from(hrmEmploymentContract)
      .where(
        and(
          eq(hrmEmploymentContract.organizationId, organizationId),
          eq(hrmEmploymentContract.id, contractId)
        )
      )
      .limit(1)

    if (!row) {
      return { ok: false as const, message: "Contract not found." }
    }
    if (row.state !== "active") {
      return {
        ok: false as const,
        message: "Only active contracts can be terminated.",
      }
    }

    const term = isoDateOnlyToUtcDate(terminationDate)

    await tx
      .update(hrmEmploymentContract)
      .set({
        state: "terminated",
        terminationDate: term,
        effectiveTo: term,
        terminationReason: terminationReason ?? null,
        terminationNoticeDays: terminationNoticeDays ?? null,
        updatedAt: new Date(),
        updatedByUserId: userId,
      })
      .where(eq(hrmEmploymentContract.id, row.id))

    await tx
      .update(hrmEmployee)
      .set({
        currentEmploymentContractId: null,
        updatedAt: new Date(),
        updatedByUserId: userId,
      })
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          eq(hrmEmployee.id, row.employeeId),
          eq(hrmEmployee.currentEmploymentContractId, row.id)
        )
      )

    return { ok: true as const, employeeId: row.employeeId }
  })

  if (!result.ok) {
    return { ok: false, errors: { form: result.message } }
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.contract.terminate",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employment_contract",
      resourceId: contractId,
      metadata: {
        employeeId: result.employeeId,
      },
    })
  )

  revalidateHrmEmployeeSurfaces()
  return { ok: true }
}
