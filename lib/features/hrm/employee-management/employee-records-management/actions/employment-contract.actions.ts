"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, desc, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireRecentAuthStepUp } from "#lib/auth"
import {
  ORG_APPS_HRM_EMPLOYEE_DETAIL,
  ORG_APPS_HRM_EMPLOYEES,
} from "#lib/org-apps-module-paths"
import { db } from "#lib/db"
import { hrmEmployee, hrmEmploymentContract } from "#lib/db/schema"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import {
  toLocaleOrgAppsRevalidatePattern,
  toLocalePath,
} from "#lib/i18n/locales.shared"

import { organizationHrmEmployeePath } from "../../../constants"
import { seedNewHireBenefitEnrollments } from "../../../payroll-compensation/benefits-administration/data/benefit-employment-bridge.server"
import {
  copyContractCompensationLines,
  ensureDefaultHrmCompensationComponents,
  insertContractCompensationLines,
  listCompensationComponentsForOrg,
  parseAllowanceLineInputsFromForm,
} from "../../../payroll-compensation/compensation-planning-modeling/server"

import { createOnboardingInstanceForContract } from "../../employee-lifecycle-management/data/boarding.mutations.server"
import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { assertOptionalHrmPlacementFkBelongsToOrg } from "../../../_internal-cross-cutting/hrm-org-fk.server"
import {
  calendarDayBeforeIso,
  formatUtcDateOnly,
  isoDateOnlyToUtcDate,
} from "../../../_module-governance/hrm-calendar-dates.server"
import {
  activateContractFormSchema,
  createDraftContractFormSchema,
  salaryRevisionDraftFormSchema,
  terminateContractFormSchema,
} from "../schemas/employment-contract.schema"
import {
  hrmActionFailure,
  hrmTransactionFailure,
} from "../../../_module-governance/hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"
import { HRM_EMPLOYEE_RECORDS_AUDIT } from "../employee-records.contract"
import {
  recordEmployeeLifecycleEvent,
  recordEmployeeRecordChangeHistory,
} from "../data/employee-record-history.server"
import {
  mutableEmployeeRecordErrorMessage,
  requireMutableEmployeeRecord,
} from "../data/employee-record-mutability.server"

async function requireEmploymentContractMutationGate(
  formData: FormData
): Promise<
  | {
      ok: true
      orgSlug: string
      organizationId: string
      userId: string
      sessionId: string
    }
  | { ok: false; response: ContractMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireHrmPermission({
    object: "employee",
    function: "update",
    errorMessage:
      "HRM employee update permission required for employment contract changes.",
  })
  if (!permission.ok) {
    return { ok: false, response: hrmActionFailure({ form: permission.error }) }
  }

  if (permission.session.organizationId !== tenant.session.organizationId) {
    return {
      ok: false,
      response: hrmActionFailure({ form: "Organization context changed." }),
    }
  }

  return {
    ok: true,
    orgSlug: tenant.orgSlug,
    organizationId: tenant.session.organizationId,
    userId: tenant.session.userId,
    sessionId: tenant.session.sessionId,
  }
}

function revalidateHrmEmployeeSurfaces() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEE_DETAIL),
    "page"
  )
}

function readContractPayCurrency(formData: FormData): string {
  const raw = formData.get("baseSalaryCurrency")
  if (typeof raw !== "string") return "MYR"
  const currency = raw.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(currency) ? currency : "MYR"
}

async function parseContractAllowanceLines(input: {
  readonly organizationId: string
  readonly formData: FormData
  readonly currency: string
}): Promise<
  | {
      ok: true
      lines: Array<{
        readonly componentId: string
        readonly amount: string
        readonly currency: string
      }>
    }
  | { ok: false; message: string }
> {
  await ensureDefaultHrmCompensationComponents(input.organizationId)
  const components = await listCompensationComponentsForOrg(
    input.organizationId
  )
  const parsed = parseAllowanceLineInputsFromForm({
    formData: input.formData,
    codeToId: new Map(
      components.map((component) => [component.code, component.id])
    ),
    currency: input.currency,
  })
  if (!parsed.ok) {
    return {
      ok: false,
      message: `Invalid allowance amount for ${parsed.invalidCode}.`,
    }
  }
  return { ok: true, lines: parsed.lines }
}

async function requireMutableContractEmployee(input: {
  organizationId: string
  employeeId: string
}): Promise<ContractMutationFormState | null> {
  const mutable = await requireMutableEmployeeRecord(input)
  return mutable.ok
    ? null
    : hrmActionFailure({ form: mutableEmployeeRecordErrorMessage(mutable) })
}

export async function createDraftContractAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmploymentContractMutationGate(formData)
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

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
    return hrmActionFailure({
      form: fe.effectiveFrom?.[0] ?? fe.contractType?.[0],
      effectiveFrom: fe.effectiveFrom?.[0],
    })
  }

  const d = parsed.data
  const mutableFailure = await requireMutableContractEmployee({
    organizationId,
    employeeId: d.employeeId,
  })
  if (mutableFailure) return mutableFailure

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
    return hrmActionFailure({ form: fk.message })
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
    return hrmActionFailure({ form: "Employee not found." })
  }
  if (emp.archivedAt) {
    return hrmActionFailure({
      form: "Archived employees cannot receive new draft contracts.",
    })
  }

  const baseSalary =
    d.baseSalaryAmount && d.baseSalaryAmount.length > 0
      ? d.baseSalaryAmount
      : null
  const payCurrency = readContractPayCurrency(formData)
  const hours =
    d.normalWorkingHoursPerWeek && d.normalWorkingHoursPerWeek.length > 0
      ? d.normalWorkingHoursPerWeek
      : null
  const allowanceParse = await parseContractAllowanceLines({
    organizationId,
    formData,
    currency: payCurrency,
  })
  if (!allowanceParse.ok) {
    return hrmActionFailure({ form: allowanceParse.message })
  }

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
      baseSalaryCurrency: payCurrency,
      payFrequency: d.payFrequency ?? "monthly",
      normalWorkingHoursPerWeek: hours,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await insertContractCompensationLines(
      organizationId,
      id,
      allowanceParse.lines,
      tx
    )

    await recordEmployeeRecordChangeHistory(
      {
        organizationId,
        employeeId: d.employeeId,
        changedByUserId: userId,
        changes: [
          {
            fieldName: "contract.versionNumber",
            oldValue: null,
            newValue: versionNumber,
          },
          {
            fieldName: "contract.state",
            oldValue: null,
            newValue: "draft",
          },
          {
            fieldName: "contract.effectiveFrom",
            oldValue: null,
            newValue: d.effectiveFrom,
          },
        ],
        meta: {
          effectiveDate: isoDateOnlyToUtcDate(d.effectiveFrom),
          reason: "Draft employment contract",
        },
      },
      tx
    )

    return { contractId: id, versionNumber }
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.contract.create,
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

export async function createSalaryRevisionDraftAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmploymentContractMutationGate(formData)
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = salaryRevisionDraftFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    newBaseSalaryAmount: formData.get("newBaseSalaryAmount"),
    effectiveFrom: formData.get("effectiveFrom"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: fe.newBaseSalaryAmount?.[0] ?? fe.effectiveFrom?.[0],
      effectiveFrom: fe.effectiveFrom?.[0],
    })
  }

  const d = parsed.data
  const mutableFailure = await requireMutableContractEmployee({
    organizationId,
    employeeId: d.employeeId,
  })
  if (mutableFailure) return mutableFailure

  const [emp] = await db
    .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, d.employeeId)
      )
    )
    .limit(1)

  if (!emp) {
    return hrmActionFailure({ form: "Employee not found." })
  }
  if (emp.archivedAt) {
    return hrmActionFailure({
      form: "Archived employees cannot receive new contracts.",
    })
  }

  const result = await db.transaction(async (tx) => {
    const [active] = await tx
      .select()
      .from(hrmEmploymentContract)
      .where(
        and(
          eq(hrmEmploymentContract.organizationId, organizationId),
          eq(hrmEmploymentContract.employeeId, d.employeeId),
          eq(hrmEmploymentContract.state, "active")
        )
      )
      .limit(1)

    if (!active) {
      return hrmTransactionFailure(
        "An active contract is required before recording a salary change."
      )
    }

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
      contractType: active.contractType,
      state: "draft",
      effectiveFrom: isoDateOnlyToUtcDate(d.effectiveFrom),
      effectiveTo: null,
      probationEndDate: null,
      confirmationDate: null,
      terminationDate: null,
      terminationReason: null,
      terminationNoticeDays: null,
      positionId: active.positionId,
      departmentId: active.departmentId,
      jobGradeId: active.jobGradeId,
      workingPatternId: active.workingPatternId,
      baseSalaryAmount: d.newBaseSalaryAmount,
      baseSalaryCurrency: active.baseSalaryCurrency,
      payFrequency: active.payFrequency,
      normalWorkingHoursPerWeek: active.normalWorkingHoursPerWeek,
      signedDocumentId: null,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await ensureDefaultHrmCompensationComponents(organizationId, tx)
    await copyContractCompensationLines(organizationId, active.id, id, tx)

    await recordEmployeeRecordChangeHistory(
      {
        organizationId,
        employeeId: d.employeeId,
        changedByUserId: userId,
        changes: [
          {
            fieldName: "contract.versionNumber",
            oldValue: active.versionNumber,
            newValue: versionNumber,
          },
          {
            fieldName: "contract.baseSalaryAmount",
            oldValue: active.baseSalaryAmount,
            newValue: d.newBaseSalaryAmount,
          },
          {
            fieldName: "contract.effectiveFrom",
            oldValue: null,
            newValue: d.effectiveFrom,
          },
        ],
        meta: {
          effectiveDate: isoDateOnlyToUtcDate(d.effectiveFrom),
          reason: "Salary revision draft",
        },
      },
      tx
    )

    return {
      ok: true as const,
      contractId: id,
      versionNumber,
      priorVersionNumber: active.versionNumber,
      contractType: active.contractType,
    }
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.contract.create,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employment_contract",
      resourceId: result.contractId,
      metadata: {
        employeeId: d.employeeId,
        versionNumber: result.versionNumber,
        contractType: result.contractType,
        state: "draft",
        revisionKind: "salary_change",
        priorContractVersion: result.priorVersionNumber,
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
  const gate = await requireEmploymentContractMutationGate(formData)
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = activateContractFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    contractId: formData.get("contractId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      contractId: parsed.error.flatten().fieldErrors.contractId?.[0],
    })
  }

  const { contractId } = parsed.data

  const [pre] = await db
    .select({ employeeId: hrmEmploymentContract.employeeId })
    .from(hrmEmploymentContract)
    .where(
      and(
        eq(hrmEmploymentContract.organizationId, organizationId),
        eq(hrmEmploymentContract.id, contractId)
      )
    )
    .limit(1)

  if (!pre) {
    return hrmActionFailure({ form: "Contract not found." })
  }
  const mutableFailure = await requireMutableContractEmployee({
    organizationId,
    employeeId: pre.employeeId,
  })
  if (mutableFailure) return mutableFailure

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
      return hrmTransactionFailure("Contract not found.")
    }
    if (row.state !== "draft") {
      return hrmTransactionFailure("Only draft contracts can be activated.")
    }
    if (!row.signedDocumentId) {
      return hrmTransactionFailure(
        "Attach and link a signed document before activation."
      )
    }

    const [emp] = await tx
      .select({
        archivedAt: hrmEmployee.archivedAt,
        currentEmploymentContractId: hrmEmployee.currentEmploymentContractId,
        employmentStatus: hrmEmployee.employmentStatus,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          eq(hrmEmployee.id, row.employeeId)
        )
      )
      .limit(1)

    if (!emp) {
      return hrmTransactionFailure("Employee not found.")
    }
    if (emp.archivedAt) {
      return hrmTransactionFailure(
        "Cannot activate a contract for an archived employee."
      )
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
        return hrmTransactionFailure(
          "Activate a contract that starts on or after the current active effective-from date."
        )
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

    await recordEmployeeLifecycleEvent(
      {
        organizationId,
        employeeId: row.employeeId,
        kind: "contract_activate",
        previousStatus: emp.employmentStatus,
        newStatus: emp.employmentStatus,
        effectiveDate: row.effectiveFrom,
        metadata: { contractId: row.id, versionNumber: row.versionNumber },
        actorUserId: userId,
        isEffectiveDated: true,
      },
      tx
    )
    await recordEmployeeRecordChangeHistory(
      {
        organizationId,
        employeeId: row.employeeId,
        changedByUserId: userId,
        changes: [
          {
            fieldName: "currentEmploymentContractId",
            oldValue: emp.currentEmploymentContractId,
            newValue: row.id,
          },
          {
            fieldName: "contract.state",
            oldValue: row.state,
            newValue: "active",
          },
        ],
        meta: { effectiveDate: row.effectiveFrom },
      },
      tx
    )

    await createOnboardingInstanceForContract(tx, {
      organizationId,
      employeeId: row.employeeId,
      contractId: row.id,
      startDate: row.effectiveFrom,
      actorUserId: userId,
    })

    return {
      ok: true as const,
      employeeId: row.employeeId,
      versionNumber: row.versionNumber,
      effectiveFrom: row.effectiveFrom,
    }
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  after(async () => {
    await seedNewHireBenefitEnrollments({
      organizationId,
      employeeId: result.employeeId,
      effectiveFrom: result.effectiveFrom,
      createdByUserId: userId,
    })
    await writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.contract.update,
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
  })

  revalidateHrmEmployeeSurfaces()
  return { ok: true }
}

export async function terminateContractAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmploymentContractMutationGate(formData)
  if (!gate.ok) return gate.response
  const { orgSlug, organizationId, userId, sessionId } = gate

  const parsed = terminateContractFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    contractId: formData.get("contractId"),
    terminationDate: formData.get("terminationDate"),
    terminationReason: formData.get("terminationReason"),
    terminationNoticeDays: formData.get("terminationNoticeDays"),
    offboardingStepKey: formData.get("offboardingStepKey"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      terminationDate: fe.terminationDate?.[0],
      form: fe.contractId?.[0],
    })
  }

  const {
    contractId,
    terminationDate,
    terminationReason,
    terminationNoticeDays,
    offboardingStepKey,
  } = parsed.data

  const [pre] = await db
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

  if (!pre) {
    return hrmActionFailure({ form: "Contract not found." })
  }
  if (pre.state !== "active") {
    return hrmActionFailure({
      form: "Only active contracts can be terminated.",
    })
  }
  const mutableFailure = await requireMutableContractEmployee({
    organizationId,
    employeeId: pre.employeeId,
  })
  if (mutableFailure) return mutableFailure

  const locale = await getRequestAppLocale()
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(
      locale,
      organizationHrmEmployeePath(orgSlug, pre.employeeId)
    ),
  })

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
      return hrmTransactionFailure("Contract not found.")
    }
    if (row.state !== "active") {
      return hrmTransactionFailure("Only active contracts can be terminated.")
    }

    const [emp] = await tx
      .select({
        archivedAt: hrmEmployee.archivedAt,
        currentEmploymentContractId: hrmEmployee.currentEmploymentContractId,
        employmentStatus: hrmEmployee.employmentStatus,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          eq(hrmEmployee.id, row.employeeId)
        )
      )
      .limit(1)

    if (!emp) return hrmTransactionFailure("Employee not found.")
    if (emp.archivedAt) {
      return hrmTransactionFailure(
        "Cannot terminate a contract for an archived employee."
      )
    }

    const term = isoDateOnlyToUtcDate(terminationDate)
    const isCurrentContract = emp.currentEmploymentContractId === row.id

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
        ...(isCurrentContract ? { employmentStatus: "terminated" } : {}),
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

    await recordEmployeeLifecycleEvent(
      {
        organizationId,
        employeeId: row.employeeId,
        kind: "contract_terminate",
        previousStatus: emp.employmentStatus,
        newStatus: isCurrentContract ? "terminated" : emp.employmentStatus,
        effectiveDate: term,
        reason: terminationReason ?? null,
        metadata: { contractId: row.id },
        actorUserId: userId,
        isEffectiveDated: true,
      },
      tx
    )
    await recordEmployeeRecordChangeHistory(
      {
        organizationId,
        employeeId: row.employeeId,
        changedByUserId: userId,
        changes: [
          {
            fieldName: "contract.state",
            oldValue: "active",
            newValue: "terminated",
          },
          {
            fieldName: "contractEndDate",
            oldValue: null,
            newValue: terminationDate,
          },
          {
            fieldName: "contract.terminationReason",
            oldValue: null,
            newValue: terminationReason ?? null,
          },
          {
            fieldName: "currentEmploymentContractId",
            oldValue: isCurrentContract
              ? row.id
              : emp.currentEmploymentContractId,
            newValue: isCurrentContract
              ? null
              : emp.currentEmploymentContractId,
          },
          {
            fieldName: "employmentStatus",
            oldValue: emp.employmentStatus,
            newValue: isCurrentContract ? "terminated" : emp.employmentStatus,
          },
        ],
        meta: {
          effectiveDate: term,
          reason: terminationReason ?? null,
        },
      },
      tx
    )

    return { ok: true as const, employeeId: row.employeeId }
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.contract.deprecate,
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

  if (offboardingStepKey) {
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: "erp.hrm.onboarding.offboarding.step.complete",
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_employment_contract",
        resourceId: contractId,
        metadata: {
          stepKey: offboardingStepKey,
          employeeId: result.employeeId,
        },
      })
    )
  }

  revalidateHrmEmployeeSurfaces()
  return { ok: true }
}
