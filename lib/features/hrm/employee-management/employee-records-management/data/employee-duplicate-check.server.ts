import "server-only"

import { and, eq, ilike, ne, or, sql } from "drizzle-orm"
import type { AnyColumn, SQL } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeContactProfile,
  hrmEmployeeIdentityDocument,
} from "#lib/db/schema"

import {
  normalizeEmployeeDuplicateEmail,
  normalizeEmployeeDuplicateIdentityDocumentNumber,
  normalizeEmployeeDuplicatePhone,
} from "./employee-duplicate-check.shared"

/**
 * A potential duplicate record found during HRM-EMP-REC-015 duplicate detection.
 * Contains only non-PII fields safe to surface in error messages.
 */
export type EmployeeDuplicateMatch = {
  readonly employeeId: string
  readonly employeeNumber: string
  readonly legalName: string
  readonly employmentStatus: string
  readonly matchedOn: "email" | "phone" | "identity_document"
  readonly matchedField: string
}

export type AssertNoEmployeeDuplicatesInput = {
  readonly organizationId: string
  readonly email?: string | null
  readonly phone?: string | null
  readonly identityDocumentNumber?: string | null
  readonly identityDocumentType?: string | null
  readonly excludeEmployeeId?: string
}

function normalizedPhoneSql(column: AnyColumn) {
  return sql`regexp_replace(coalesce(${column}, ''), '[\\s().-]+', '', 'g')`
}

function normalizedIdentityDocumentNumberSql(column: AnyColumn) {
  return sql`upper(regexp_replace(coalesce(${column}, ''), '[^[:alnum:]]+', '', 'g'))`
}

function identityDocumentNumberDuplicateCondition(input: {
  readonly column: AnyColumn
  readonly trimmedDocumentNumber: string
  readonly normalizedDocumentNumber: string
}): SQL {
  const exactCondition = eq(input.column, input.trimmedDocumentNumber)
  if (input.normalizedDocumentNumber.length === 0) return exactCondition

  const condition = or(
    exactCondition,
    eq(
      normalizedIdentityDocumentNumberSql(input.column),
      input.normalizedDocumentNumber
    )
  )
  if (!condition) {
    throw new Error("identity_document_duplicate_condition_missing")
  }
  return condition
}

/**
 * Checks for potential duplicate employee records within the same organization.
 *
 * Covers acceptance criteria #3: duplicate detection by identity number, email, and phone.
 */
export async function checkEmployeeDuplicates(
  input: AssertNoEmployeeDuplicatesInput
): Promise<EmployeeDuplicateMatch[]> {
  const matches: EmployeeDuplicateMatch[] = []
  const pushMatch = (match: EmployeeDuplicateMatch) => {
    if (!matches.some((m) => m.employeeId === match.employeeId)) {
      matches.push(match)
    }
  }

  const employeeScope = input.excludeEmployeeId
    ? and(
        eq(hrmEmployee.organizationId, input.organizationId),
        ne(hrmEmployee.id, input.excludeEmployeeId)
      )
    : eq(hrmEmployee.organizationId, input.organizationId)

  if (input.email) {
    const normalizedEmail = normalizeEmployeeDuplicateEmail(input.email)

    const legacyEmailRows = await db
      .select({
        id: hrmEmployee.id,
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
        employmentStatus: hrmEmployee.employmentStatus,
      })
      .from(hrmEmployee)
      .where(and(employeeScope, ilike(hrmEmployee.email, normalizedEmail)))
      .limit(5)

    for (const row of legacyEmailRows) {
      pushMatch({
        employeeId: row.id,
        employeeNumber: row.employeeNumber,
        legalName: row.legalName,
        employmentStatus: row.employmentStatus,
        matchedOn: "email",
        matchedField: "workEmail",
      })
    }

    const contactEmailScope = input.excludeEmployeeId
      ? and(
          eq(hrmEmployeeContactProfile.organizationId, input.organizationId),
          ne(hrmEmployeeContactProfile.employeeId, input.excludeEmployeeId),
          or(
            ilike(hrmEmployeeContactProfile.workEmail, normalizedEmail),
            ilike(hrmEmployeeContactProfile.personalEmail, normalizedEmail)
          )
        )
      : and(
          eq(hrmEmployeeContactProfile.organizationId, input.organizationId),
          or(
            ilike(hrmEmployeeContactProfile.workEmail, normalizedEmail),
            ilike(hrmEmployeeContactProfile.personalEmail, normalizedEmail)
          )
        )

    const contactEmailRows = await db
      .select({
        id: hrmEmployee.id,
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
        employmentStatus: hrmEmployee.employmentStatus,
      })
      .from(hrmEmployeeContactProfile)
      .innerJoin(
        hrmEmployee,
        eq(hrmEmployeeContactProfile.employeeId, hrmEmployee.id)
      )
      .where(contactEmailScope)
      .limit(5)

    for (const row of contactEmailRows) {
      pushMatch({
        employeeId: row.id,
        employeeNumber: row.employeeNumber,
        legalName: row.legalName,
        employmentStatus: row.employmentStatus,
        matchedOn: "email",
        matchedField: "contactEmail",
      })
    }
  }

  if (input.phone) {
    const normalizedPhone = normalizeEmployeeDuplicatePhone(input.phone)
    const phoneRows = await db
      .select({
        id: hrmEmployee.id,
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
        employmentStatus: hrmEmployee.employmentStatus,
      })
      .from(hrmEmployee)
      .where(
        and(
          employeeScope,
          or(
            ilike(hrmEmployee.phone, normalizedPhone),
            ilike(hrmEmployee.phone, input.phone.trim()),
            eq(normalizedPhoneSql(hrmEmployee.phone), normalizedPhone)
          )
        )
      )
      .limit(5)

    for (const row of phoneRows) {
      pushMatch({
        employeeId: row.id,
        employeeNumber: row.employeeNumber,
        legalName: row.legalName,
        employmentStatus: row.employmentStatus,
        matchedOn: "phone",
        matchedField: "phone",
      })
    }

    const contactPhoneScope = input.excludeEmployeeId
      ? and(
          eq(hrmEmployeeContactProfile.organizationId, input.organizationId),
          ne(hrmEmployeeContactProfile.employeeId, input.excludeEmployeeId),
          or(
            ilike(hrmEmployeeContactProfile.workPhone, normalizedPhone),
            ilike(hrmEmployeeContactProfile.personalPhone, normalizedPhone),
            eq(
              normalizedPhoneSql(hrmEmployeeContactProfile.workPhone),
              normalizedPhone
            ),
            eq(
              normalizedPhoneSql(hrmEmployeeContactProfile.personalPhone),
              normalizedPhone
            )
          )
        )
      : and(
          eq(hrmEmployeeContactProfile.organizationId, input.organizationId),
          or(
            ilike(hrmEmployeeContactProfile.workPhone, normalizedPhone),
            ilike(hrmEmployeeContactProfile.personalPhone, normalizedPhone),
            eq(
              normalizedPhoneSql(hrmEmployeeContactProfile.workPhone),
              normalizedPhone
            ),
            eq(
              normalizedPhoneSql(hrmEmployeeContactProfile.personalPhone),
              normalizedPhone
            )
          )
        )

    const contactPhoneRows = await db
      .select({
        id: hrmEmployee.id,
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
        employmentStatus: hrmEmployee.employmentStatus,
      })
      .from(hrmEmployeeContactProfile)
      .innerJoin(
        hrmEmployee,
        eq(hrmEmployeeContactProfile.employeeId, hrmEmployee.id)
      )
      .where(contactPhoneScope)
      .limit(5)

    for (const row of contactPhoneRows) {
      pushMatch({
        employeeId: row.id,
        employeeNumber: row.employeeNumber,
        legalName: row.legalName,
        employmentStatus: row.employmentStatus,
        matchedOn: "phone",
        matchedField: "contactPhone",
      })
    }
  }

  if (input.identityDocumentNumber) {
    const trimmedDocumentNumber = input.identityDocumentNumber.trim()
    const normalizedDocumentNumber =
      normalizeEmployeeDuplicateIdentityDocumentNumber(
        input.identityDocumentNumber
      )
    const legacyIdentityConditions = [
      identityDocumentNumberDuplicateCondition({
        column: hrmEmployee.idDocumentNumber,
        trimmedDocumentNumber,
        normalizedDocumentNumber,
      }),
    ]
    if (input.identityDocumentType) {
      legacyIdentityConditions.push(
        eq(hrmEmployee.idDocumentType, input.identityDocumentType)
      )
    }
    const legacyIdentityRows = await db
      .select({
        id: hrmEmployee.id,
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
        employmentStatus: hrmEmployee.employmentStatus,
        documentType: hrmEmployee.idDocumentType,
      })
      .from(hrmEmployee)
      .where(and(employeeScope, ...legacyIdentityConditions))
      .limit(5)

    for (const row of legacyIdentityRows) {
      pushMatch({
        employeeId: row.id,
        employeeNumber: row.employeeNumber,
        legalName: row.legalName,
        employmentStatus: row.employmentStatus,
        matchedOn: "identity_document",
        matchedField: row.documentType ?? "identityDocument",
      })
    }

    const docConditions = [
      identityDocumentNumberDuplicateCondition({
        column: hrmEmployeeIdentityDocument.documentNumber,
        trimmedDocumentNumber,
        normalizedDocumentNumber,
      }),
    ]
    if (input.identityDocumentType) {
      docConditions.push(
        eq(hrmEmployeeIdentityDocument.documentType, input.identityDocumentType)
      )
    }

    const docRows = await db
      .select({
        id: hrmEmployee.id,
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
        employmentStatus: hrmEmployee.employmentStatus,
        documentType: hrmEmployeeIdentityDocument.documentType,
      })
      .from(hrmEmployee)
      .innerJoin(
        hrmEmployeeIdentityDocument,
        and(
          eq(hrmEmployeeIdentityDocument.employeeId, hrmEmployee.id),
          eq(
            hrmEmployeeIdentityDocument.organizationId,
            hrmEmployee.organizationId
          )
        )
      )
      .where(and(employeeScope, ...docConditions))
      .limit(5)

    for (const row of docRows) {
      pushMatch({
        employeeId: row.id,
        employeeNumber: row.employeeNumber,
        legalName: row.legalName,
        employmentStatus: row.employmentStatus,
        matchedOn: "identity_document",
        matchedField: row.documentType,
      })
    }
  }

  return matches
}

export type AssertNoEmployeeDuplicatesResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly matches: EmployeeDuplicateMatch[]
    }

/** HRM-EMP-REC-015 / AC-3 — blocks create/update when duplicates exist. */
export async function assertNoEmployeeDuplicates(
  input: AssertNoEmployeeDuplicatesInput
): Promise<AssertNoEmployeeDuplicatesResult> {
  const matches = await checkEmployeeDuplicates(input)
  if (matches.length === 0) {
    return { ok: true }
  }
  return { ok: false, matches }
}

export function duplicateMatchErrorMessage(
  matches: EmployeeDuplicateMatch[]
): string {
  const first = matches[0]
  if (!first) {
    return "A matching employee record already exists."
  }
  switch (first.matchedOn) {
    case "email":
      return "A matching employee record already exists for this email."
    case "phone":
      return "A matching employee record already exists for this phone number."
    case "identity_document":
      return "A matching employee record already exists for this identity document."
    default:
      return "A matching employee record already exists."
  }
}
