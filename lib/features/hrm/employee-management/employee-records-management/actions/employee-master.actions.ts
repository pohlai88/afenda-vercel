"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, isNull, ne } from "drizzle-orm"

import {
  ORG_APPS_HRM_EMPLOYEE_DETAIL,
  ORG_APPS_HRM_EMPLOYEES,
} from "#lib/org-apps-module-paths"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeChangeHistory,
  hrmEmployeeContactProfile,
  hrmEmployeeIdentityDocument,
  hrmEmployeePersonalProfile,
  hrmEmployeeWorkAuthorization,
  hrmEmploymentContract,
  hrmPayrollProfile,
} from "#lib/db/schema"
import { neonAuthMember } from "#lib/db/schema-neon-auth"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  buildEmployeeMasterChangeRows,
  isEmployeeMasterSensitiveField,
} from "../data/employee-master-history.shared"
import { upsertEmployeeEffectiveAssignment } from "../data/employee-assignment-command.server"
import { recordEmployeeLifecycleEvent } from "../data/employee-record-history.server"
import {
  calendarDayBeforeIso,
  isoDateOnlyToUtcDate,
} from "../../../_module-governance/hrm-calendar-dates.server"
import { requireEmployeeRecordMutationGate } from "../data/employee-record-action-guard.server"
import {
  assertNoEmployeeDuplicates,
  duplicateMatchErrorMessage,
} from "../data/employee-duplicate-check.server"
import {
  mutableEmployeeRecordErrorMessage,
  requireMutableEmployeeRecord,
} from "../data/employee-record-mutability.server"
import { assertOptionalHrmPlacementFkBelongsToOrg } from "../../../_internal-cross-cutting/hrm-org-fk.server"
import {
  employeeContactFormSchema,
  employeeEmploymentFormSchema,
  employeeIdentityDocumentFormSchema,
  employeeIdentityFormSchema,
  employeeMasterChangeMetaFormSchema,
  employeeProfilePhotoFormSchema,
  employeeStatutoryProfileFormSchema,
  employeeWorkAuthorizationFormSchema,
} from "../schemas/employee.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { EmployeeMasterMutationFormState } from "../../../types"
import { HRM_EMPLOYEE_RECORDS_AUDIT } from "../employee-records.contract"

type Change = {
  fieldName: string
  oldValue: unknown
  newValue: unknown
}

async function requireMutableEmployeeMasterAction(input: {
  organizationId: string
  employeeId: string
}): Promise<EmployeeMasterMutationFormState | null> {
  const mutable = await requireMutableEmployeeRecord(input)
  return mutable.ok
    ? null
    : hrmActionFailure({ form: mutableEmployeeRecordErrorMessage(mutable) })
}

function field(
  formData: FormData,
  name: string
): FormDataEntryValue | undefined {
  const value = formData.get(name)
  return value === null ? undefined : value
}

function optionalDate(value: string | undefined): Date | null {
  return value ? isoDateOnlyToUtcDate(value) : null
}

function dateIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

async function assertLinkedUserBelongsToOrganization(
  organizationId: string,
  linkedUserId: string
): Promise<boolean> {
  const [member] = await db
    .select({ userId: neonAuthMember.userId })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.organizationId, organizationId),
        eq(neonAuthMember.userId, linkedUserId)
      )
    )
    .limit(1)

  return member !== undefined
}

function buildAddress(data: {
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  countryCode?: string
}): Record<string, string> | null {
  const address = {
    line1: data.addressLine1,
    line2: data.addressLine2,
    city: data.city,
    region: data.region,
    postalCode: data.postalCode,
    countryCode: data.countryCode,
  }
  const compact = Object.fromEntries(
    Object.entries(address).filter(([, value]) => Boolean(value))
  ) as Record<string, string>
  return Object.keys(compact).length === 0 ? null : compact
}

function normalizeJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

function uniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

async function requireEmployeeMasterMutationGate(formData: FormData): Promise<
  | {
      ok: true
      orgSlug: string
      organizationId: string
      userId: string
      sessionId: string
    }
  | { ok: false; response: EmployeeMasterMutationFormState }
> {
  const gate = await requireEmployeeRecordMutationGate(formData, {
    permission: "update",
    errorMessage: "HRM employee update permission required.",
  })
  if (!gate.ok) {
    return { ok: false, response: gate.response }
  }
  return gate
}

function revalidateEmployeeMaster(): void {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEE_DETAIL),
    "page"
  )
}

function auditEmployeeMasterUpdate(input: {
  organizationId: string
  userId: string
  sessionId: string
  employeeId: string
  section: string
  changedFields: string[]
}): void {
  const action =
    input.section === "identity"
      ? HRM_EMPLOYEE_RECORDS_AUDIT.identity.update
      : input.section === "contact"
        ? HRM_EMPLOYEE_RECORDS_AUDIT.contact.update
        : input.section === "employment"
          ? HRM_EMPLOYEE_RECORDS_AUDIT.employment.update
          : input.section === "identity_document"
            ? HRM_EMPLOYEE_RECORDS_AUDIT.identityDocument.update
            : input.section === "work_authorization"
              ? HRM_EMPLOYEE_RECORDS_AUDIT.workAuthorization.update
              : input.section === "statutory"
                ? HRM_EMPLOYEE_RECORDS_AUDIT.statutory.update
                : HRM_EMPLOYEE_RECORDS_AUDIT.employee.update
  after(() =>
    writeIamAuditEventFromNextHeaders({
      action,
      organizationId: input.organizationId,
      actorUserId: input.userId,
      actorSessionId: input.sessionId,
      resourceType: "hrm_employee",
      resourceId: input.employeeId,
      metadata: {
        section: input.section,
        changedFields: input.changedFields,
        hasSensitiveChanges: input.changedFields.some(
          isEmployeeMasterSensitiveField
        ),
      },
    })
  )
}

type ChangeHistoryMeta = {
  effectiveDate: Date | null
  reason: string | null
  approvalReference: string | null
}

function parseChangeHistoryMeta(formData: FormData): ChangeHistoryMeta {
  const parsed = employeeMasterChangeMetaFormSchema.safeParse({
    effectiveDate: field(formData, "effectiveDate"),
    reason: field(formData, "reason"),
    approvalReference: field(formData, "approvalReference"),
  })
  if (!parsed.success) {
    return { effectiveDate: null, reason: null, approvalReference: null }
  }
  return {
    effectiveDate: parsed.data.effectiveDate
      ? isoDateOnlyToUtcDate(parsed.data.effectiveDate)
      : null,
    reason: parsed.data.reason ?? null,
    approvalReference: parsed.data.approvalReference ?? null,
  }
}

function historyInsertValues(input: {
  organizationId: string
  employeeId: string
  changedByUserId: string
  changes: Change[]
  meta?: ChangeHistoryMeta
}) {
  const meta = input.meta ?? {
    effectiveDate: null,
    reason: null,
    approvalReference: null,
  }
  return buildEmployeeMasterChangeRows(input).map((row) => ({
    id: crypto.randomUUID(),
    organizationId: row.organizationId,
    employeeId: row.employeeId,
    fieldName: row.fieldName,
    oldValue: row.oldValue,
    newValue: row.newValue,
    changedByUserId: row.changedByUserId,
    effectiveDate: meta.effectiveDate,
    reason: meta.reason,
    approvalReference: meta.approvalReference,
  }))
}

export async function updateEmployeeIdentityAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const gate = await requireEmployeeMasterMutationGate(formData)
  if (!gate.ok) return gate.response

  const parsed = employeeIdentityFormSchema.safeParse({
    employeeId: field(formData, "employeeId"),
    employeeNumber: field(formData, "employeeNumber"),
    legalName: field(formData, "legalName"),
    preferredName: field(formData, "preferredName"),
    dateOfBirth: field(formData, "dateOfBirth"),
    gender: field(formData, "gender"),
    nationality: field(formData, "nationality"),
    maritalStatus: field(formData, "maritalStatus"),
    languagePreference: field(formData, "languagePreference"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      employeeNumber: fe.employeeNumber?.[0],
      legalName: fe.legalName?.[0],
      form:
        fe.preferredName?.[0] ??
        fe.dateOfBirth?.[0] ??
        fe.gender?.[0] ??
        fe.nationality?.[0] ??
        fe.maritalStatus?.[0],
    })
  }

  const data = parsed.data
  const mutableFailure = await requireMutableEmployeeMasterAction({
    organizationId: gate.organizationId,
    employeeId: data.employeeId,
  })
  if (mutableFailure) return mutableFailure

  const dob = optionalDate(data.dateOfBirth)
  const nextPreferredName = data.preferredName ?? null
  const nextGender = data.gender ?? null
  const nextNationality = data.nationality ?? null
  const nextMaritalStatus = data.maritalStatus ?? null
  const nextLanguagePreference = data.languagePreference ?? null
  const changeMeta = parseChangeHistoryMeta(formData)

  let changedFields: string[] = []
  try {
    changedFields = await db.transaction(async (tx) => {
      const [employee] = await tx
        .select({
          id: hrmEmployee.id,
          archivedAt: hrmEmployee.archivedAt,
          employeeNumber: hrmEmployee.employeeNumber,
          legalName: hrmEmployee.legalName,
          preferredName: hrmEmployee.preferredName,
          dateOfBirth: hrmEmployee.dateOfBirth,
          gender: hrmEmployee.gender,
          nationality: hrmEmployee.nationality,
        })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, gate.organizationId),
            eq(hrmEmployee.id, data.employeeId)
          )
        )
        .limit(1)
      if (!employee) throw new Error("employee_not_found")
      if (employee.archivedAt) throw new Error("employee_archived")

      const [profile] = await tx
        .select({
          dateOfBirth: hrmEmployeePersonalProfile.dateOfBirth,
          gender: hrmEmployeePersonalProfile.gender,
          nationality: hrmEmployeePersonalProfile.nationality,
          maritalStatus: hrmEmployeePersonalProfile.maritalStatus,
          languagePreference: hrmEmployeePersonalProfile.languagePreference,
        })
        .from(hrmEmployeePersonalProfile)
        .where(
          and(
            eq(hrmEmployeePersonalProfile.organizationId, gate.organizationId),
            eq(hrmEmployeePersonalProfile.employeeId, data.employeeId)
          )
        )
        .limit(1)

      const changes: Change[] = [
        {
          fieldName: "employeeNumber",
          oldValue: employee.employeeNumber,
          newValue: data.employeeNumber,
        },
        {
          fieldName: "legalName",
          oldValue: employee.legalName,
          newValue: data.legalName,
        },
        {
          fieldName: "preferredName",
          oldValue: employee.preferredName,
          newValue: nextPreferredName,
        },
        {
          fieldName: "dateOfBirth",
          oldValue: dateIso(profile?.dateOfBirth ?? employee.dateOfBirth),
          newValue: data.dateOfBirth ?? null,
        },
        {
          fieldName: "gender",
          oldValue: profile?.gender ?? employee.gender,
          newValue: nextGender,
        },
        {
          fieldName: "nationality",
          oldValue: profile?.nationality ?? employee.nationality,
          newValue: nextNationality,
        },
        {
          fieldName: "maritalStatus",
          oldValue: profile?.maritalStatus ?? null,
          newValue: nextMaritalStatus,
        },
        {
          fieldName: "languagePreference",
          oldValue: profile?.languagePreference ?? null,
          newValue: nextLanguagePreference,
        },
      ]

      await tx
        .update(hrmEmployee)
        .set({
          employeeNumber: data.employeeNumber,
          legalName: data.legalName,
          preferredName: nextPreferredName,
          dateOfBirth: dob,
          gender: nextGender,
          nationality: nextNationality,
          updatedAt: new Date(),
          updatedByUserId: gate.userId,
        })
        .where(eq(hrmEmployee.id, data.employeeId))

      await tx
        .insert(hrmEmployeePersonalProfile)
        .values({
          organizationId: gate.organizationId,
          employeeId: data.employeeId,
          dateOfBirth: dob,
          gender: nextGender,
          nationality: nextNationality,
          maritalStatus: nextMaritalStatus,
          languagePreference: nextLanguagePreference,
          createdByUserId: gate.userId,
          updatedByUserId: gate.userId,
        })
        .onConflictDoUpdate({
          target: [
            hrmEmployeePersonalProfile.organizationId,
            hrmEmployeePersonalProfile.employeeId,
          ],
          set: {
            dateOfBirth: dob,
            gender: nextGender,
            nationality: nextNationality,
            maritalStatus: nextMaritalStatus,
            languagePreference: nextLanguagePreference,
            updatedAt: new Date(),
            updatedByUserId: gate.userId,
          },
        })

      const historyRows = historyInsertValues({
        organizationId: gate.organizationId,
        employeeId: data.employeeId,
        changedByUserId: gate.userId,
        changes,
        meta: changeMeta,
      })
      if (historyRows.length > 0) {
        await tx.insert(hrmEmployeeChangeHistory).values(historyRows)
      }
      return historyRows.map((row) => row.fieldName)
    })
  } catch (err) {
    if (uniqueViolation(err)) {
      return hrmActionFailure({
        employeeNumber: "Employee number already exists for this organization.",
      })
    }
    if (err instanceof Error && err.message === "employee_not_found") {
      return hrmActionFailure({ form: "Employee not found." })
    }
    if (err instanceof Error && err.message === "employee_archived") {
      return hrmActionFailure({ form: "Archived employees cannot be edited." })
    }
    return hrmActionFailure({ form: "Could not update employee identity." })
  }

  auditEmployeeMasterUpdate({
    organizationId: gate.organizationId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    employeeId: data.employeeId,
    section: "identity",
    changedFields,
  })
  revalidateEmployeeMaster()
  return { ok: true }
}

export async function updateEmployeeContactAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const gate = await requireEmployeeMasterMutationGate(formData)
  if (!gate.ok) return gate.response

  const parsed = employeeContactFormSchema.safeParse({
    employeeId: field(formData, "employeeId"),
    workEmail: field(formData, "workEmail"),
    workPhone: field(formData, "workPhone"),
    personalEmail: field(formData, "personalEmail"),
    personalPhone: field(formData, "personalPhone"),
    addressLine1: field(formData, "addressLine1"),
    addressLine2: field(formData, "addressLine2"),
    city: field(formData, "city"),
    region: field(formData, "region"),
    postalCode: field(formData, "postalCode"),
    countryCode: field(formData, "countryCode"),
    mailingAddressSameAsResidential: field(
      formData,
      "mailingAddressSameAsResidential"
    ),
    mailingAddressLine1: field(formData, "mailingAddressLine1"),
    mailingAddressLine2: field(formData, "mailingAddressLine2"),
    mailingCity: field(formData, "mailingCity"),
    mailingRegion: field(formData, "mailingRegion"),
    mailingPostalCode: field(formData, "mailingPostalCode"),
    mailingCountryCode: field(formData, "mailingCountryCode"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      workEmail: fe.workEmail?.[0],
      personalEmail: fe.personalEmail?.[0],
      form: fe.workPhone?.[0] ?? fe.personalPhone?.[0] ?? fe.countryCode?.[0],
    })
  }

  const data = parsed.data
  const mutableFailure = await requireMutableEmployeeMasterAction({
    organizationId: gate.organizationId,
    employeeId: data.employeeId,
  })
  if (mutableFailure) return mutableFailure

  const address = buildAddress(data)
  const mailingAddress = data.mailingAddressSameAsResidential
    ? address
    : buildAddress({
        addressLine1: data.mailingAddressLine1,
        addressLine2: data.mailingAddressLine2,
        city: data.mailingCity,
        region: data.mailingRegion,
        postalCode: data.mailingPostalCode,
        countryCode: data.mailingCountryCode,
      })
  const workEmail = data.workEmail ?? null
  const workPhone = data.workPhone ?? null
  const personalEmail = data.personalEmail ?? null
  const personalPhone = data.personalPhone ?? null
  const changeMeta = parseChangeHistoryMeta(formData)

  for (const duplicateInput of [
    { email: workEmail, phone: workPhone },
    { email: personalEmail, phone: personalPhone },
  ]) {
    const duplicateCheck = await assertNoEmployeeDuplicates({
      organizationId: gate.organizationId,
      ...duplicateInput,
      excludeEmployeeId: data.employeeId,
    })
    if (!duplicateCheck.ok) {
      return hrmActionFailure({
        form: duplicateMatchErrorMessage(duplicateCheck.matches),
      })
    }
  }

  let changedFields: string[] = []
  try {
    changedFields = await db.transaction(async (tx) => {
      const [employee] = await tx
        .select({
          id: hrmEmployee.id,
          archivedAt: hrmEmployee.archivedAt,
          email: hrmEmployee.email,
          phone: hrmEmployee.phone,
          address: hrmEmployee.address,
        })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, gate.organizationId),
            eq(hrmEmployee.id, data.employeeId)
          )
        )
        .limit(1)
      if (!employee) throw new Error("employee_not_found")
      if (employee.archivedAt) throw new Error("employee_archived")

      const [profile] = await tx
        .select({
          workEmail: hrmEmployeeContactProfile.workEmail,
          workPhone: hrmEmployeeContactProfile.workPhone,
          personalEmail: hrmEmployeeContactProfile.personalEmail,
          personalPhone: hrmEmployeeContactProfile.personalPhone,
          address: hrmEmployeeContactProfile.address,
          mailingAddress: hrmEmployeeContactProfile.mailingAddress,
        })
        .from(hrmEmployeeContactProfile)
        .where(
          and(
            eq(hrmEmployeeContactProfile.organizationId, gate.organizationId),
            eq(hrmEmployeeContactProfile.employeeId, data.employeeId)
          )
        )
        .limit(1)

      const changes: Change[] = [
        {
          fieldName: "workEmail",
          oldValue: profile?.workEmail ?? employee.email,
          newValue: workEmail,
        },
        {
          fieldName: "workPhone",
          oldValue: profile?.workPhone ?? employee.phone,
          newValue: workPhone,
        },
        {
          fieldName: "personalEmail",
          oldValue: profile?.personalEmail ?? null,
          newValue: personalEmail,
        },
        {
          fieldName: "personalPhone",
          oldValue: profile?.personalPhone ?? null,
          newValue: personalPhone,
        },
        {
          fieldName: "address",
          oldValue: normalizeJson(profile?.address ?? employee.address),
          newValue: normalizeJson(address),
        },
        {
          fieldName: "mailingAddress",
          oldValue: normalizeJson(profile?.mailingAddress ?? null),
          newValue: normalizeJson(mailingAddress),
        },
      ]

      await tx
        .update(hrmEmployee)
        .set({
          email: workEmail,
          phone: workPhone,
          address,
          updatedAt: new Date(),
          updatedByUserId: gate.userId,
        })
        .where(eq(hrmEmployee.id, data.employeeId))

      await tx
        .insert(hrmEmployeeContactProfile)
        .values({
          organizationId: gate.organizationId,
          employeeId: data.employeeId,
          workEmail,
          workPhone,
          personalEmail,
          personalPhone,
          address,
          mailingAddress,
          createdByUserId: gate.userId,
          updatedByUserId: gate.userId,
        })
        .onConflictDoUpdate({
          target: [
            hrmEmployeeContactProfile.organizationId,
            hrmEmployeeContactProfile.employeeId,
          ],
          set: {
            workEmail,
            workPhone,
            personalEmail,
            personalPhone,
            address,
            mailingAddress,
            updatedAt: new Date(),
            updatedByUserId: gate.userId,
          },
        })

      const historyRows = historyInsertValues({
        organizationId: gate.organizationId,
        employeeId: data.employeeId,
        changedByUserId: gate.userId,
        changes,
        meta: changeMeta,
      })
      if (historyRows.length > 0) {
        await tx.insert(hrmEmployeeChangeHistory).values(historyRows)
      }
      return historyRows.map((row) => row.fieldName)
    })
  } catch (err) {
    if (err instanceof Error && err.message === "employee_not_found") {
      return hrmActionFailure({ form: "Employee not found." })
    }
    if (err instanceof Error && err.message === "employee_archived") {
      return hrmActionFailure({ form: "Archived employees cannot be edited." })
    }
    return hrmActionFailure({ form: "Could not update employee contact." })
  }

  auditEmployeeMasterUpdate({
    organizationId: gate.organizationId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    employeeId: data.employeeId,
    section: "contact",
    changedFields,
  })
  revalidateEmployeeMaster()
  return { ok: true }
}

export async function updateEmployeeEmploymentAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const gate = await requireEmployeeMasterMutationGate(formData)
  if (!gate.ok) return gate.response

  const parsed = employeeEmploymentFormSchema.safeParse({
    employeeId: field(formData, "employeeId"),
    employmentType: field(formData, "employmentType"),
    employmentStatus: field(formData, "employmentStatus"),
    employmentStartDate: field(formData, "employmentStartDate"),
    probationEndDate: field(formData, "probationEndDate"),
    confirmationDate: field(formData, "confirmationDate"),
    contractStartDate: field(formData, "contractStartDate"),
    contractEndDate: field(formData, "contractEndDate"),
    currentDepartmentId: field(formData, "currentDepartmentId"),
    currentPositionId: field(formData, "currentPositionId"),
    currentJobGradeId: field(formData, "currentJobGradeId"),
    managerEmployeeId: field(formData, "managerEmployeeId"),
    matrixManagerEmployeeId: field(formData, "matrixManagerEmployeeId"),
    hrOwnerEmployeeId: field(formData, "hrOwnerEmployeeId"),
    workerCategory: field(formData, "workerCategory"),
    employeeLevel: field(formData, "employeeLevel"),
    linkedUserId: field(formData, "linkedUserId"),
    countryCode: field(formData, "countryCode"),
    workStateCode: field(formData, "workStateCode"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      countryCode: fe.countryCode?.[0],
      form:
        fe.employmentStatus?.[0] ??
        fe.currentDepartmentId?.[0] ??
        fe.currentPositionId?.[0] ??
        fe.currentJobGradeId?.[0] ??
        fe.managerEmployeeId?.[0] ??
        fe.matrixManagerEmployeeId?.[0],
    })
  }

  const data = parsed.data
  const mutableFailure = await requireMutableEmployeeMasterAction({
    organizationId: gate.organizationId,
    employeeId: data.employeeId,
  })
  if (mutableFailure) return mutableFailure

  const fk = await assertOptionalHrmPlacementFkBelongsToOrg(
    gate.organizationId,
    {
      departmentId: data.currentDepartmentId,
      positionId: data.currentPositionId,
      gradeId: data.currentJobGradeId,
    }
  )
  if (!fk.ok) return hrmActionFailure({ form: fk.message })

  if (data.managerEmployeeId && data.managerEmployeeId === data.employeeId) {
    return hrmActionFailure({ form: "Employee cannot report to self." })
  }
  if (
    data.matrixManagerEmployeeId &&
    data.matrixManagerEmployeeId === data.employeeId
  ) {
    return hrmActionFailure({
      form: "Employee cannot be their own dotted-line manager.",
    })
  }

  if (data.managerEmployeeId) {
    const [manager] = await db
      .select({ id: hrmEmployee.id })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, gate.organizationId),
          eq(hrmEmployee.id, data.managerEmployeeId),
          isNull(hrmEmployee.archivedAt)
        )
      )
      .limit(1)
    if (!manager) {
      return hrmActionFailure({ form: "Manager not found for this org." })
    }
  }

  if (data.matrixManagerEmployeeId) {
    const [matrixManager] = await db
      .select({ id: hrmEmployee.id })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, gate.organizationId),
          eq(hrmEmployee.id, data.matrixManagerEmployeeId),
          isNull(hrmEmployee.archivedAt)
        )
      )
      .limit(1)
    if (!matrixManager) {
      return hrmActionFailure({
        form: "Dotted-line manager not found for this org.",
      })
    }
  }

  if (
    data.linkedUserId &&
    !(await assertLinkedUserBelongsToOrganization(
      gate.organizationId,
      data.linkedUserId
    ))
  ) {
    return hrmActionFailure({
      form: "Linked user must be an active organization member.",
    })
  }

  const next = {
    employmentType: data.employmentType ?? null,
    employmentStatus: data.employmentStatus,
    employmentStartDate: optionalDate(data.employmentStartDate),
    probationEndDate: optionalDate(data.probationEndDate),
    confirmationDate: optionalDate(data.confirmationDate),
    currentDepartmentId: data.currentDepartmentId ?? null,
    currentPositionId: data.currentPositionId ?? null,
    currentJobGradeId: data.currentJobGradeId ?? null,
    managerEmployeeId: data.managerEmployeeId ?? null,
    dottedLineManagerId: data.matrixManagerEmployeeId ?? null,
    hrOwnerEmployeeId: data.hrOwnerEmployeeId ?? null,
    workerCategory: data.workerCategory ?? null,
    employeeLevel: data.employeeLevel ?? null,
    linkedUserId: data.linkedUserId ?? null,
    countryCode: data.countryCode ?? null,
    workStateCode: data.workStateCode ?? null,
  }
  const changeMeta = parseChangeHistoryMeta(formData)

  let changedFields: string[] = []
  try {
    changedFields = await db.transaction(async (tx) => {
      const [employee] = await tx
        .select({
          id: hrmEmployee.id,
          archivedAt: hrmEmployee.archivedAt,
          employmentType: hrmEmployee.employmentType,
          employmentStatus: hrmEmployee.employmentStatus,
          employmentStartDate: hrmEmployee.employmentStartDate,
          probationEndDate: hrmEmployee.probationEndDate,
          confirmationDate: hrmEmployee.confirmationDate,
          currentDepartmentId: hrmEmployee.currentDepartmentId,
          currentPositionId: hrmEmployee.currentPositionId,
          currentJobGradeId: hrmEmployee.currentJobGradeId,
          managerEmployeeId: hrmEmployee.managerEmployeeId,
          dottedLineManagerId: hrmEmployee.dottedLineManagerId,
          hrOwnerEmployeeId: hrmEmployee.hrOwnerEmployeeId,
          workerCategory: hrmEmployee.workerCategory,
          employeeLevel: hrmEmployee.employeeLevel,
          linkedUserId: hrmEmployee.linkedUserId,
          countryCode: hrmEmployee.countryCode,
          workStateCode: hrmEmployee.workStateCode,
          currentEmploymentContractId: hrmEmployee.currentEmploymentContractId,
        })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, gate.organizationId),
            eq(hrmEmployee.id, data.employeeId)
          )
        )
        .limit(1)
      if (!employee) throw new Error("employee_not_found")
      if (employee.archivedAt) throw new Error("employee_archived")

      const [activeContract] = employee.currentEmploymentContractId
        ? await tx
            .select({
              effectiveFrom: hrmEmploymentContract.effectiveFrom,
              effectiveTo: hrmEmploymentContract.effectiveTo,
            })
            .from(hrmEmploymentContract)
            .where(
              and(
                eq(hrmEmploymentContract.organizationId, gate.organizationId),
                eq(
                  hrmEmploymentContract.id,
                  employee.currentEmploymentContractId
                )
              )
            )
            .limit(1)
        : [null]

      const changes: Change[] = [
        {
          fieldName: "employmentStatus",
          oldValue: employee.employmentStatus,
          newValue: next.employmentStatus,
        },
        {
          fieldName: "employmentStartDate",
          oldValue: dateIso(employee.employmentStartDate),
          newValue: data.employmentStartDate ?? null,
        },
        {
          fieldName: "probationEndDate",
          oldValue: dateIso(employee.probationEndDate),
          newValue: data.probationEndDate ?? null,
        },
        {
          fieldName: "confirmationDate",
          oldValue: dateIso(employee.confirmationDate),
          newValue: data.confirmationDate ?? null,
        },
        {
          fieldName: "linkedUserId",
          oldValue: employee.linkedUserId,
          newValue: next.linkedUserId,
        },
        {
          fieldName: "countryCode",
          oldValue: employee.countryCode,
          newValue: next.countryCode,
        },
        {
          fieldName: "workStateCode",
          oldValue: employee.workStateCode,
          newValue: next.workStateCode,
        },
      ]

      if (data.contractStartDate || data.contractEndDate) {
        if (!employee.currentEmploymentContractId) {
          throw new Error("employment_contract_not_found")
        }
        changes.push(
          {
            fieldName: "contractStartDate",
            oldValue: dateIso(activeContract?.effectiveFrom ?? null),
            newValue: data.contractStartDate ?? null,
          },
          {
            fieldName: "contractEndDate",
            oldValue: dateIso(activeContract?.effectiveTo ?? null),
            newValue: data.contractEndDate ?? null,
          }
        )
        await tx
          .update(hrmEmploymentContract)
          .set({
            ...(data.contractStartDate
              ? {
                  effectiveFrom: isoDateOnlyToUtcDate(data.contractStartDate),
                }
              : {}),
            ...(data.contractEndDate
              ? { effectiveTo: isoDateOnlyToUtcDate(data.contractEndDate) }
              : {}),
            updatedAt: new Date(),
            updatedByUserId: gate.userId,
          })
          .where(
            eq(hrmEmploymentContract.id, employee.currentEmploymentContractId)
          )
      }

      const assignmentChangedFields = await upsertEmployeeEffectiveAssignment(
        {
          organizationId: gate.organizationId,
          employeeId: data.employeeId,
          actorUserId: gate.userId,
          effectiveFrom: changeMeta.effectiveDate ?? new Date(),
          next: {
            employmentType: next.employmentType,
            currentDepartmentId: next.currentDepartmentId,
            currentPositionId: next.currentPositionId,
            currentJobGradeId: next.currentJobGradeId,
            managerEmployeeId: next.managerEmployeeId,
            dottedLineManagerId: next.dottedLineManagerId,
            hrOwnerEmployeeId: next.hrOwnerEmployeeId,
            workerCategory: next.workerCategory,
            employeeLevel: next.employeeLevel,
          },
          meta: changeMeta,
        },
        tx
      )

      await tx
        .update(hrmEmployee)
        .set({
          employmentStatus: next.employmentStatus,
          employmentStartDate: next.employmentStartDate,
          probationEndDate: next.probationEndDate,
          confirmationDate: next.confirmationDate,
          linkedUserId: next.linkedUserId,
          countryCode: next.countryCode,
          workStateCode: next.workStateCode,
          updatedAt: new Date(),
          updatedByUserId: gate.userId,
        })
        .where(eq(hrmEmployee.id, data.employeeId))

      const historyRows = historyInsertValues({
        organizationId: gate.organizationId,
        employeeId: data.employeeId,
        changedByUserId: gate.userId,
        changes,
        meta: changeMeta,
      })
      if (historyRows.length > 0) {
        await tx.insert(hrmEmployeeChangeHistory).values(historyRows)
      }
      if (employee.employmentStatus !== next.employmentStatus) {
        await recordEmployeeLifecycleEvent(
          {
            organizationId: gate.organizationId,
            employeeId: data.employeeId,
            kind: "status_change",
            previousStatus: employee.employmentStatus,
            newStatus: next.employmentStatus,
            effectiveDate: changeMeta.effectiveDate,
            reason: changeMeta.reason,
            approvalReference: changeMeta.approvalReference,
            actorUserId: gate.userId,
            isEffectiveDated: Boolean(changeMeta.effectiveDate),
          },
          tx
        )
      }
      return [
        ...assignmentChangedFields.changedFields,
        ...historyRows.map((row) => row.fieldName),
      ]
    })
  } catch (err) {
    if (err instanceof Error && err.message === "employee_not_found") {
      return hrmActionFailure({ form: "Employee not found." })
    }
    if (err instanceof Error && err.message === "employee_archived") {
      return hrmActionFailure({ form: "Archived employees cannot be edited." })
    }
    if (
      err instanceof Error &&
      err.message === "employment_contract_not_found"
    ) {
      return hrmActionFailure({
        form: "No active employment contract exists to update contract dates.",
      })
    }
    return hrmActionFailure({ form: "Could not update employee employment." })
  }

  auditEmployeeMasterUpdate({
    organizationId: gate.organizationId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    employeeId: data.employeeId,
    section: "employment",
    changedFields,
  })
  revalidateEmployeeMaster()
  return { ok: true }
}

export async function upsertEmployeeIdentityDocumentAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const gate = await requireEmployeeMasterMutationGate(formData)
  if (!gate.ok) return gate.response

  const parsed = employeeIdentityDocumentFormSchema.safeParse({
    employeeId: field(formData, "employeeId"),
    documentId: field(formData, "documentId"),
    documentType: field(formData, "documentType"),
    documentNumber: field(formData, "documentNumber"),
    issuingCountry: field(formData, "issuingCountry"),
    issuedAt: field(formData, "issuedAt"),
    expiresAt: field(formData, "expiresAt"),
    isPrimary: field(formData, "isPrimary"),
    verificationStatus: field(formData, "verificationStatus"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      documentType: fe.documentType?.[0],
      documentNumber: fe.documentNumber?.[0],
      form:
        fe.issuingCountry?.[0] ??
        fe.issuedAt?.[0] ??
        fe.expiresAt?.[0] ??
        fe.verificationStatus?.[0],
    })
  }

  const data = parsed.data
  const mutableFailure = await requireMutableEmployeeMasterAction({
    organizationId: gate.organizationId,
    employeeId: data.employeeId,
  })
  if (mutableFailure) return mutableFailure

  const changeMeta = parseChangeHistoryMeta(formData)

  const duplicateCheck = await assertNoEmployeeDuplicates({
    organizationId: gate.organizationId,
    identityDocumentNumber: data.documentNumber,
    identityDocumentType: data.documentType,
    excludeEmployeeId: data.employeeId,
  })
  if (!duplicateCheck.ok) {
    return hrmActionFailure({
      documentNumber: duplicateMatchErrorMessage(duplicateCheck.matches),
    })
  }

  let changedFields: string[] = []
  try {
    changedFields = await db.transaction(async (tx) => {
      const [employee] = await tx
        .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, gate.organizationId),
            eq(hrmEmployee.id, data.employeeId)
          )
        )
        .limit(1)
      if (!employee) throw new Error("employee_not_found")
      if (employee.archivedAt) throw new Error("employee_archived")

      const [existing] = data.documentId
        ? await tx
            .select({
              id: hrmEmployeeIdentityDocument.id,
              documentType: hrmEmployeeIdentityDocument.documentType,
              documentNumber: hrmEmployeeIdentityDocument.documentNumber,
              issuingCountry: hrmEmployeeIdentityDocument.issuingCountry,
              issuedAt: hrmEmployeeIdentityDocument.issuedAt,
              expiresAt: hrmEmployeeIdentityDocument.expiresAt,
              isPrimary: hrmEmployeeIdentityDocument.isPrimary,
              verificationStatus:
                hrmEmployeeIdentityDocument.verificationStatus,
            })
            .from(hrmEmployeeIdentityDocument)
            .where(
              and(
                eq(
                  hrmEmployeeIdentityDocument.organizationId,
                  gate.organizationId
                ),
                eq(hrmEmployeeIdentityDocument.employeeId, data.employeeId),
                eq(hrmEmployeeIdentityDocument.id, data.documentId)
              )
            )
            .limit(1)
        : [null]
      if (data.documentId && !existing) throw new Error("document_not_found")

      if (data.isPrimary) {
        await tx
          .update(hrmEmployeeIdentityDocument)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(
            and(
              eq(
                hrmEmployeeIdentityDocument.organizationId,
                gate.organizationId
              ),
              eq(hrmEmployeeIdentityDocument.employeeId, data.employeeId),
              data.documentId
                ? ne(hrmEmployeeIdentityDocument.id, data.documentId)
                : undefined
            )
          )
      }

      const values = {
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        issuingCountry: data.issuingCountry,
        issuedAt: optionalDate(data.issuedAt),
        expiresAt: optionalDate(data.expiresAt),
        isPrimary: data.isPrimary,
        verificationStatus: data.verificationStatus,
        updatedAt: new Date(),
        updatedByUserId: gate.userId,
      }
      const documentId = data.documentId ?? crypto.randomUUID()
      if (data.documentId) {
        await tx
          .update(hrmEmployeeIdentityDocument)
          .set(values)
          .where(eq(hrmEmployeeIdentityDocument.id, data.documentId))
      } else {
        await tx.insert(hrmEmployeeIdentityDocument).values({
          id: documentId,
          organizationId: gate.organizationId,
          employeeId: data.employeeId,
          ...values,
          createdByUserId: gate.userId,
        })
      }

      if (data.isPrimary) {
        await tx
          .update(hrmEmployee)
          .set({
            idDocumentType: data.documentType,
            idDocumentNumber: data.documentNumber,
            updatedAt: new Date(),
            updatedByUserId: gate.userId,
          })
          .where(eq(hrmEmployee.id, data.employeeId))
        await tx
          .insert(hrmEmployeePersonalProfile)
          .values({
            organizationId: gate.organizationId,
            employeeId: data.employeeId,
            primaryIdentityDocumentId: documentId,
            createdByUserId: gate.userId,
            updatedByUserId: gate.userId,
          })
          .onConflictDoUpdate({
            target: [
              hrmEmployeePersonalProfile.organizationId,
              hrmEmployeePersonalProfile.employeeId,
            ],
            set: {
              primaryIdentityDocumentId: documentId,
              updatedAt: new Date(),
              updatedByUserId: gate.userId,
            },
          })
      }

      const changes: Change[] = [
        {
          fieldName: "identityDocument.documentType",
          oldValue: existing?.documentType ?? null,
          newValue: data.documentType,
        },
        {
          fieldName: "identityDocument.documentNumber",
          oldValue: existing?.documentNumber ?? null,
          newValue: data.documentNumber,
        },
        {
          fieldName: "identityDocument.issuingCountry",
          oldValue: existing?.issuingCountry ?? null,
          newValue: data.issuingCountry,
        },
        {
          fieldName: "identityDocument.issuedAt",
          oldValue: dateIso(existing?.issuedAt ?? null),
          newValue: data.issuedAt ?? null,
        },
        {
          fieldName: "identityDocument.expiresAt",
          oldValue: dateIso(existing?.expiresAt ?? null),
          newValue: data.expiresAt ?? null,
        },
        {
          fieldName: "identityDocument.isPrimary",
          oldValue: existing?.isPrimary ?? null,
          newValue: data.isPrimary,
        },
        {
          fieldName: "identityDocument.verificationStatus",
          oldValue: existing?.verificationStatus ?? null,
          newValue: data.verificationStatus,
        },
      ]
      const historyRows = historyInsertValues({
        organizationId: gate.organizationId,
        employeeId: data.employeeId,
        changedByUserId: gate.userId,
        changes,
        meta: changeMeta,
      })
      if (historyRows.length > 0) {
        await tx.insert(hrmEmployeeChangeHistory).values(historyRows)
      }
      return historyRows.map((row) => row.fieldName)
    })
  } catch (err) {
    if (uniqueViolation(err)) {
      return hrmActionFailure({
        form: "Only one primary identity document is allowed.",
      })
    }
    if (err instanceof Error && err.message === "employee_not_found") {
      return hrmActionFailure({ form: "Employee not found." })
    }
    if (err instanceof Error && err.message === "employee_archived") {
      return hrmActionFailure({ form: "Archived employees cannot be edited." })
    }
    if (err instanceof Error && err.message === "document_not_found") {
      return hrmActionFailure({ form: "Identity document not found." })
    }
    return hrmActionFailure({ form: "Could not save identity document." })
  }

  auditEmployeeMasterUpdate({
    organizationId: gate.organizationId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    employeeId: data.employeeId,
    section: "identity_document",
    changedFields,
  })
  revalidateEmployeeMaster()
  return { ok: true }
}

export async function upsertEmployeeWorkAuthorizationAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const gate = await requireEmployeeMasterMutationGate(formData)
  if (!gate.ok) return gate.response

  const parsed = employeeWorkAuthorizationFormSchema.safeParse({
    employeeId: field(formData, "employeeId"),
    authorizationId: field(formData, "authorizationId"),
    countryCode: field(formData, "countryCode"),
    authorizationType: field(formData, "authorizationType"),
    documentNumber: field(formData, "documentNumber"),
    issuedAt: field(formData, "issuedAt"),
    expiresAt: field(formData, "expiresAt"),
    status: field(formData, "status"),
    notes: field(formData, "notes"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      countryCode: fe.countryCode?.[0],
      authorizationType: fe.authorizationType?.[0],
      documentNumber: fe.documentNumber?.[0],
      form: fe.issuedAt?.[0] ?? fe.expiresAt?.[0] ?? fe.status?.[0],
    })
  }

  const data = parsed.data
  const mutableFailure = await requireMutableEmployeeMasterAction({
    organizationId: gate.organizationId,
    employeeId: data.employeeId,
  })
  if (mutableFailure) return mutableFailure

  const changeMeta = parseChangeHistoryMeta(formData)
  let changedFields: string[] = []
  try {
    changedFields = await db.transaction(async (tx) => {
      const [employee] = await tx
        .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, gate.organizationId),
            eq(hrmEmployee.id, data.employeeId)
          )
        )
        .limit(1)
      if (!employee) throw new Error("employee_not_found")
      if (employee.archivedAt) throw new Error("employee_archived")

      const [existing] = data.authorizationId
        ? await tx
            .select({
              id: hrmEmployeeWorkAuthorization.id,
              countryCode: hrmEmployeeWorkAuthorization.countryCode,
              authorizationType: hrmEmployeeWorkAuthorization.authorizationType,
              documentNumber: hrmEmployeeWorkAuthorization.documentNumber,
              issuedAt: hrmEmployeeWorkAuthorization.issuedAt,
              expiresAt: hrmEmployeeWorkAuthorization.expiresAt,
              status: hrmEmployeeWorkAuthorization.status,
              notes: hrmEmployeeWorkAuthorization.notes,
            })
            .from(hrmEmployeeWorkAuthorization)
            .where(
              and(
                eq(
                  hrmEmployeeWorkAuthorization.organizationId,
                  gate.organizationId
                ),
                eq(hrmEmployeeWorkAuthorization.employeeId, data.employeeId),
                eq(hrmEmployeeWorkAuthorization.id, data.authorizationId)
              )
            )
            .limit(1)
        : [null]
      if (data.authorizationId && !existing) {
        throw new Error("authorization_not_found")
      }

      const values = {
        countryCode: data.countryCode,
        authorizationType: data.authorizationType,
        documentNumber: data.documentNumber ?? null,
        issuedAt: optionalDate(data.issuedAt),
        expiresAt: optionalDate(data.expiresAt),
        status: data.status,
        notes: data.notes ?? null,
        updatedAt: new Date(),
        updatedByUserId: gate.userId,
      }
      if (data.authorizationId) {
        await tx
          .update(hrmEmployeeWorkAuthorization)
          .set(values)
          .where(eq(hrmEmployeeWorkAuthorization.id, data.authorizationId))
      } else {
        await tx.insert(hrmEmployeeWorkAuthorization).values({
          id: crypto.randomUUID(),
          organizationId: gate.organizationId,
          employeeId: data.employeeId,
          ...values,
          createdByUserId: gate.userId,
        })
      }

      const changes: Change[] = [
        {
          fieldName: "workAuthorization.countryCode",
          oldValue: existing?.countryCode ?? null,
          newValue: data.countryCode,
        },
        {
          fieldName: "workAuthorization.authorizationType",
          oldValue: existing?.authorizationType ?? null,
          newValue: data.authorizationType,
        },
        {
          fieldName: "workAuthorization.documentNumber",
          oldValue: existing?.documentNumber ?? null,
          newValue: data.documentNumber ?? null,
        },
        {
          fieldName: "workAuthorization.issuedAt",
          oldValue: dateIso(existing?.issuedAt ?? null),
          newValue: data.issuedAt ?? null,
        },
        {
          fieldName: "workAuthorization.expiresAt",
          oldValue: dateIso(existing?.expiresAt ?? null),
          newValue: data.expiresAt ?? null,
        },
        {
          fieldName: "workAuthorization.status",
          oldValue: existing?.status ?? null,
          newValue: data.status,
        },
        {
          fieldName: "workAuthorization.notes",
          oldValue: existing?.notes ?? null,
          newValue: data.notes ?? null,
        },
      ]
      const historyRows = historyInsertValues({
        organizationId: gate.organizationId,
        employeeId: data.employeeId,
        changedByUserId: gate.userId,
        changes,
        meta: changeMeta,
      })
      if (historyRows.length > 0) {
        await tx.insert(hrmEmployeeChangeHistory).values(historyRows)
      }
      return historyRows.map((row) => row.fieldName)
    })
  } catch (err) {
    if (err instanceof Error && err.message === "employee_not_found") {
      return hrmActionFailure({ form: "Employee not found." })
    }
    if (err instanceof Error && err.message === "employee_archived") {
      return hrmActionFailure({ form: "Archived employees cannot be edited." })
    }
    if (err instanceof Error && err.message === "authorization_not_found") {
      return hrmActionFailure({ form: "Work authorization not found." })
    }
    return hrmActionFailure({ form: "Could not save work authorization." })
  }

  auditEmployeeMasterUpdate({
    organizationId: gate.organizationId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    employeeId: data.employeeId,
    section: "work_authorization",
    changedFields,
  })
  revalidateEmployeeMaster()
  return { ok: true }
}

export async function updateEmployeeStatutoryProfileAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const gate = await requireEmployeeMasterMutationGate(formData)
  if (!gate.ok) return gate.response

  const parsed = employeeStatutoryProfileFormSchema.safeParse({
    employeeId: field(formData, "employeeId"),
    effectiveFrom: field(formData, "effectiveFrom"),
    countryCode: field(formData, "countryCode"),
    taxResidencyCountry: field(formData, "taxResidencyCountry"),
    taxIdentifierType: field(formData, "taxIdentifierType"),
    taxIdentifierNumber: field(formData, "taxIdentifierNumber"),
    epfNumber: field(formData, "epfNumber"),
    socsoNumber: field(formData, "socsoNumber"),
    eisEligible: field(formData, "eisEligible"),
    pcbCategory: field(formData, "pcbCategory"),
    hrdfApplicable: field(formData, "hrdfApplicable"),
    workStateCode: field(formData, "workStateCode"),
    pcbTp1AdditionalReliefMonthlyMyr: field(
      formData,
      "pcbTp1AdditionalReliefMonthlyMyr"
    ),
    pcbTp3AdditionalDeductionMonthlyMyr: field(
      formData,
      "pcbTp3AdditionalDeductionMonthlyMyr"
    ),
    socialInsuranceNumber: field(formData, "socialInsuranceNumber"),
    healthInsuranceNumber: field(formData, "healthInsuranceNumber"),
    unemploymentInsuranceNumber: field(formData, "unemploymentInsuranceNumber"),
    unionEligible: field(formData, "unionEligible"),
    workProvinceCode: field(formData, "workProvinceCode"),
    workRegionCode: field(formData, "workRegionCode"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      countryCode: fe.countryCode?.[0],
      effectiveFrom: fe.effectiveFrom?.[0],
      form: fe.taxIdentifierNumber?.[0] ?? "Invalid statutory profile.",
    })
  }

  const data = parsed.data
  const mutableFailure = await requireMutableEmployeeMasterAction({
    organizationId: gate.organizationId,
    employeeId: data.employeeId,
  })
  if (mutableFailure) return mutableFailure

  const changeMeta = parseChangeHistoryMeta(formData)
  const nextEffective = isoDateOnlyToUtcDate(data.effectiveFrom)

  let extras: Record<string, unknown>
  if (data.countryCode === "MY") {
    extras = {
      countryCode: "MY" as const,
      workStateCode: data.workStateCode ?? null,
      pcbTp1AdditionalReliefMonthlyMyr:
        data.pcbTp1AdditionalReliefMonthlyMyr ?? null,
      pcbTp3AdditionalDeductionMonthlyMyr:
        data.pcbTp3AdditionalDeductionMonthlyMyr ?? null,
    }
  } else if (data.countryCode === "VN") {
    extras = {
      countryCode: "VN" as const,
      socialInsuranceNumber: data.socialInsuranceNumber ?? null,
      healthInsuranceNumber: data.healthInsuranceNumber ?? null,
      unemploymentInsuranceNumber: data.unemploymentInsuranceNumber ?? null,
      unionEligible: data.unionEligible,
      workProvinceCode: data.workProvinceCode ?? null,
      workRegionCode: data.workRegionCode ?? null,
    }
  } else if (data.countryCode === "SG") {
    extras = {
      countryCode: "SG" as const,
      cpfAccountNumber: data.cpfAccountNumber ?? null,
      workPassType: data.workPassType ?? null,
      workPassExpiryDate: data.workPassExpiryDate ?? null,
      fwlApplicable: data.fwlApplicable,
      shgLevyCode: data.shgLevyCode ?? null,
    }
  } else {
    extras = {
      countryCode: "ID" as const,
      nationalIdNumber: data.nationalIdNumber ?? null,
      bpjsKetenagakerjaanNumber: data.bpjsKetenagakerjaanNumber ?? null,
      bpjsKesehatanNumber: data.bpjsKesehatanNumber ?? null,
      pph21TaxClass: data.pph21TaxClass ?? null,
      workCityCode: data.workCityCode ?? null,
    }
  }

  const payCurrencyForCountry: Record<string, string> = {
    MY: "MYR",
    VN: "VND",
    SG: "SGD",
    ID: "IDR",
  }

  const nextPayroll = {
    countryCode: data.countryCode,
    taxResidencyCountry: data.countryCode,
    taxIdentifierType: data.taxIdentifierType,
    taxIdentifierNumber: data.taxIdentifierNumber ?? null,
    epfNumber: data.countryCode === "MY" ? (data.epfNumber ?? null) : null,
    socsoNumber: data.countryCode === "MY" ? (data.socsoNumber ?? null) : null,
    eisEligible: data.countryCode === "MY" ? data.eisEligible : false,
    pcbCategory: data.countryCode === "MY" ? (data.pcbCategory ?? null) : null,
    hrdfApplicable: data.countryCode === "MY" ? data.hrdfApplicable : false,
    paySchedule: "monthly",
    payCurrency: payCurrencyForCountry[data.countryCode] ?? "USD",
    statutoryProfileExtras: extras,
  }

  let changedFields: string[] = []
  try {
    changedFields = await db.transaction(async (tx) => {
      const [employee] = await tx
        .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, gate.organizationId),
            eq(hrmEmployee.id, data.employeeId)
          )
        )
        .limit(1)
      if (!employee) throw new Error("employee_not_found")
      if (employee.archivedAt) throw new Error("employee_archived")

      const [current] = await tx
        .select({
          id: hrmPayrollProfile.id,
          countryCode: hrmPayrollProfile.countryCode,
          taxIdentifierType: hrmPayrollProfile.taxIdentifierType,
          taxIdentifierNumber: hrmPayrollProfile.taxIdentifierNumber,
          epfNumber: hrmPayrollProfile.epfNumber,
          socsoNumber: hrmPayrollProfile.socsoNumber,
          eisEligible: hrmPayrollProfile.eisEligible,
          pcbCategory: hrmPayrollProfile.pcbCategory,
          hrdfApplicable: hrmPayrollProfile.hrdfApplicable,
          effectiveFrom: hrmPayrollProfile.effectiveFrom,
          statutoryProfileExtras: hrmPayrollProfile.statutoryProfileExtras,
        })
        .from(hrmPayrollProfile)
        .where(
          and(
            eq(hrmPayrollProfile.organizationId, gate.organizationId),
            eq(hrmPayrollProfile.employeeId, data.employeeId),
            isNull(hrmPayrollProfile.effectiveTo)
          )
        )
        .limit(1)

      if (
        current &&
        current.effectiveFrom.getTime() > nextEffective.getTime()
      ) {
        throw new Error("effective_from_invalid")
      }

      const changes: Change[] = [
        {
          fieldName: "countryCode",
          oldValue: current?.countryCode ?? null,
          newValue: data.countryCode,
        },
        {
          fieldName: "taxIdentifierType",
          oldValue: current?.taxIdentifierType ?? null,
          newValue: data.taxIdentifierType,
        },
        {
          fieldName: "taxIdentifierNumber",
          oldValue: current?.taxIdentifierNumber ?? null,
          newValue: data.taxIdentifierNumber ?? null,
        },
        {
          fieldName: "epfNumber",
          oldValue: current?.epfNumber ?? null,
          newValue: nextPayroll.epfNumber,
        },
        {
          fieldName: "socsoNumber",
          oldValue: current?.socsoNumber ?? null,
          newValue: nextPayroll.socsoNumber,
        },
        {
          fieldName: "statutoryProfileExtras",
          oldValue: normalizeJson(current?.statutoryProfileExtras ?? null),
          newValue: normalizeJson(extras),
        },
      ]

      const baseValues = {
        ...nextPayroll,
        updatedAt: new Date(),
        updatedByUserId: gate.userId,
      }
      if (
        current &&
        current.effectiveFrom.getTime() === nextEffective.getTime()
      ) {
        await tx
          .update(hrmPayrollProfile)
          .set(baseValues)
          .where(eq(hrmPayrollProfile.id, current.id))
      } else {
        if (current) {
          await tx
            .update(hrmPayrollProfile)
            .set({
              effectiveTo: isoDateOnlyToUtcDate(
                calendarDayBeforeIso(data.effectiveFrom)
              ),
              updatedAt: new Date(),
              updatedByUserId: gate.userId,
            })
            .where(eq(hrmPayrollProfile.id, current.id))
        }
        await tx.insert(hrmPayrollProfile).values({
          id: crypto.randomUUID(),
          organizationId: gate.organizationId,
          employeeId: data.employeeId,
          ...nextPayroll,
          effectiveFrom: nextEffective,
          effectiveTo: null,
          createdByUserId: gate.userId,
          updatedByUserId: gate.userId,
        })
      }

      await tx
        .update(hrmEmployee)
        .set({
          countryCode: data.countryCode,
          workStateCode:
            data.countryCode === "MY"
              ? (data.workStateCode ?? null)
              : data.countryCode === "VN"
                ? (data.workProvinceCode ?? data.workRegionCode ?? null)
                : data.countryCode === "ID"
                  ? (data.workCityCode ?? null)
                  : null,
          updatedAt: new Date(),
          updatedByUserId: gate.userId,
        })
        .where(eq(hrmEmployee.id, data.employeeId))

      const historyRows = historyInsertValues({
        organizationId: gate.organizationId,
        employeeId: data.employeeId,
        changedByUserId: gate.userId,
        changes,
        meta: changeMeta,
      })
      if (historyRows.length > 0) {
        await tx.insert(hrmEmployeeChangeHistory).values(historyRows)
      }
      return historyRows.map((row) => row.fieldName)
    })
  } catch (err) {
    if (err instanceof Error && err.message === "employee_not_found") {
      return hrmActionFailure({ form: "Employee not found." })
    }
    if (err instanceof Error && err.message === "employee_archived") {
      return hrmActionFailure({ form: "Archived employees cannot be edited." })
    }
    if (err instanceof Error && err.message === "effective_from_invalid") {
      return hrmActionFailure({
        effectiveFrom:
          "Effective-from cannot be earlier than the current profile.",
      })
    }
    return hrmActionFailure({ form: "Could not update statutory profile." })
  }

  auditEmployeeMasterUpdate({
    organizationId: gate.organizationId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    employeeId: data.employeeId,
    section: "statutory",
    changedFields,
  })
  revalidateEmployeeMaster()
  return { ok: true }
}

export async function updateEmployeeProfilePhotoAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const gate = await requireEmployeeMasterMutationGate(formData)
  if (!gate.ok) return gate.response

  const parsed = employeeProfilePhotoFormSchema.safeParse({
    employeeId: field(formData, "employeeId"),
    profilePhotoBlobUrl: field(formData, "profilePhotoBlobUrl"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      form: fe.profilePhotoBlobUrl?.[0],
    })
  }

  const data = parsed.data
  const mutableFailure = await requireMutableEmployeeMasterAction({
    organizationId: gate.organizationId,
    employeeId: data.employeeId,
  })
  if (mutableFailure) return mutableFailure

  const changeMeta = parseChangeHistoryMeta(formData)
  const now = new Date()

  let changedFields: string[] = []
  try {
    changedFields = await db.transaction(async (tx) => {
      const [employee] = await tx
        .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, gate.organizationId),
            eq(hrmEmployee.id, data.employeeId)
          )
        )
        .limit(1)
      if (!employee) throw new Error("employee_not_found")
      if (employee.archivedAt) throw new Error("employee_archived")

      const [profile] = await tx
        .select({
          profilePhotoBlobUrl: hrmEmployeePersonalProfile.profilePhotoBlobUrl,
        })
        .from(hrmEmployeePersonalProfile)
        .where(
          and(
            eq(hrmEmployeePersonalProfile.organizationId, gate.organizationId),
            eq(hrmEmployeePersonalProfile.employeeId, data.employeeId)
          )
        )
        .limit(1)

      const changes: Change[] = [
        {
          fieldName: "profilePhotoBlobUrl",
          oldValue: profile?.profilePhotoBlobUrl ?? null,
          newValue: data.profilePhotoBlobUrl,
        },
      ]

      await tx
        .insert(hrmEmployeePersonalProfile)
        .values({
          organizationId: gate.organizationId,
          employeeId: data.employeeId,
          profilePhotoBlobUrl: data.profilePhotoBlobUrl,
          profilePhotoUpdatedAt: now,
          createdByUserId: gate.userId,
          updatedByUserId: gate.userId,
        })
        .onConflictDoUpdate({
          target: [
            hrmEmployeePersonalProfile.organizationId,
            hrmEmployeePersonalProfile.employeeId,
          ],
          set: {
            profilePhotoBlobUrl: data.profilePhotoBlobUrl,
            profilePhotoUpdatedAt: now,
            updatedAt: now,
            updatedByUserId: gate.userId,
          },
        })

      const historyRows = historyInsertValues({
        organizationId: gate.organizationId,
        employeeId: data.employeeId,
        changedByUserId: gate.userId,
        changes,
        meta: changeMeta,
      })
      if (historyRows.length > 0) {
        await tx.insert(hrmEmployeeChangeHistory).values(historyRows)
      }
      return historyRows.map((row) => row.fieldName)
    })
  } catch (err) {
    if (err instanceof Error && err.message === "employee_not_found") {
      return hrmActionFailure({ form: "Employee not found." })
    }
    if (err instanceof Error && err.message === "employee_archived") {
      return hrmActionFailure({ form: "Archived employees cannot be edited." })
    }
    return hrmActionFailure({ form: "Could not update profile photo." })
  }

  auditEmployeeMasterUpdate({
    organizationId: gate.organizationId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    employeeId: data.employeeId,
    section: "identity",
    changedFields,
  })
  revalidateEmployeeMaster()
  return { ok: true }
}
