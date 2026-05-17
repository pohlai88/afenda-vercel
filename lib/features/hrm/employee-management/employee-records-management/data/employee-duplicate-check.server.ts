import "server-only"

import { and, eq, ilike, ne, or } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeContactProfile,
  hrmEmployeeIdentityDocument,
} from "#lib/db/schema"

import {
  normalizeEmployeeDuplicateEmail,
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
            ilike(hrmEmployee.phone, input.phone.trim())
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
            ilike(hrmEmployeeContactProfile.personalPhone, normalizedPhone)
          )
        )
      : and(
          eq(hrmEmployeeContactProfile.organizationId, input.organizationId),
          or(
            ilike(hrmEmployeeContactProfile.workPhone, normalizedPhone),
            ilike(hrmEmployeeContactProfile.personalPhone, normalizedPhone)
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
    const docConditions = [
      eq(
        hrmEmployeeIdentityDocument.documentNumber,
        input.identityDocumentNumber.trim()
      ),
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
