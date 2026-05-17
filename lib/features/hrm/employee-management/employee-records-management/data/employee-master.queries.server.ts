import "server-only"

import { and, asc, desc, eq, isNull } from "drizzle-orm"

import {
  canUseErpPermissionForCurrentOrg,
  listAccessMembersForOrganization,
} from "#features/erp-rbac/server"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeContactProfile,
  hrmEmployeeIdentityDocument,
  hrmEmployeePersonalProfile,
  hrmEmployeeWorkAuthorization,
} from "#lib/db/schema"

import { listDependentsForEmployee } from "./dependent.queries.server"
import { listEmployeeEmploymentHistory } from "./employee-employment-history.queries.server"
import { resolveEmployeeOrgContextReference } from "./employee-org-context.queries.server"
import { getEmployeeForOrganization } from "./employee.queries.server"
import { listEmploymentContractsForEmployee } from "./employment-contract.queries.server"
import { listEmergencyContactsForEmployee } from "./emergency-contact.queries.server"
import { maskEmployeeMasterSnapshotSensitiveFields } from "./employee-master-sensitive-view.shared"
import { listEmployeeAssignmentHistory } from "../../organizational-chart-hierarchy/data/org-structure.queries.server"
import { listHrmDocumentsForEmployee } from "../../documents-management/data/hrm-document.queries.server"
import {
  listDepartmentsForOrg,
  listJobGradesForOrg,
  listPositionsForOrg,
} from "../../organizational-chart-hierarchy/data/org-structure.queries.server"
import { getCurrentPayrollProfileForEmployee } from "../../../payroll-compensation/payroll-processing/data/payroll-profile.queries.server"
import type {
  EmployeeContactProfileRow,
  EmployeeMasterCompleteness,
  EmployeeMasterPlacementLabels,
  EmployeeMasterPlacementOption,
  EmployeeMasterPlacementOptions,
  EmployeeMasterSnapshot,
  EmployeePersonalProfileRow,
} from "../../../types"
import type { EmployeeRecordsFieldKey } from "./employee-records-field-catalog.shared"

export async function getEmployeeMasterRecordForOrganization(input: {
  organizationId: string
  employeeId: string
}): Promise<EmployeeMasterSnapshot | null> {
  const employee = await getEmployeeForOrganization(
    input.organizationId,
    input.employeeId
  )
  if (!employee) return null

  const [
    personalProfileRow,
    contactProfileRow,
    identityDocuments,
    workAuthorizations,
    emergencyContacts,
    payrollProfile,
    dependents,
    documents,
    contracts,
    placementOptions,
  ] = await Promise.all([
    getEmployeePersonalProfile(input.organizationId, input.employeeId),
    getEmployeeContactProfile(input.organizationId, input.employeeId),
    listEmployeeIdentityDocuments(input.organizationId, input.employeeId),
    listEmployeeWorkAuthorizations(input.organizationId, input.employeeId),
    listEmergencyContactsForEmployee(input.organizationId, input.employeeId),
    getCurrentPayrollProfileForEmployee(input.organizationId, input.employeeId),
    listDependentsForEmployee(input.organizationId, input.employeeId),
    listHrmDocumentsForEmployee(input.organizationId, input.employeeId),
    listEmploymentContractsForEmployee(input.organizationId, input.employeeId),
    listEmployeeMasterPlacementOptions(input.organizationId),
  ])

  const personalProfile =
    personalProfileRow ?? legacyPersonalProfileFromEmployee(employee)
  const contactProfile =
    contactProfileRow ?? legacyContactProfileFromEmployee(employee)
  const placementLabels = derivePlacementLabels(employee, placementOptions)
  const completeness = deriveEmployeeMasterCompleteness({
    personalProfile,
    contactProfile,
    identityDocumentCount: identityDocuments.length,
    verifiedIdentityDocumentCount: identityDocuments.filter(
      (doc) => doc.verificationStatus === "verified"
    ).length,
    workAuthorizationCount: workAuthorizations.length,
    emergencyContactCount: emergencyContacts.length,
    payrollProfilePresent: payrollProfile !== null,
    documentCount: documents.length,
    hasEmploymentOwner:
      employee.currentDepartmentId !== null ||
      employee.currentPositionId !== null ||
      employee.currentJobGradeId !== null ||
      employee.managerEmployeeId !== null,
    employmentStatus: employee.employmentStatus,
    employmentStartDate: employee.employmentStartDate,
    nationality: personalProfile?.nationality ?? employee.nationality,
    workCountryCode: employee.countryCode,
  })

  const [orgContext, assignmentHistory, employmentHistory] = await Promise.all([
    resolveEmployeeOrgContextReference({
      organizationId: input.organizationId,
      departmentId: employee.currentDepartmentId,
      employeeId: input.employeeId,
    }),
    listEmployeeAssignmentHistory(input.organizationId, input.employeeId),
    listEmployeeEmploymentHistory({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
    }),
  ])

  return {
    employee,
    personalProfile,
    contactProfile,
    identityDocuments,
    workAuthorizations,
    emergencyContacts,
    payrollProfile,
    dependents,
    documents,
    contracts,
    placementLabels,
    placementOptions,
    orgContext,
    assignmentHistory,
    employmentHistory,
    completeness,
  }
}

export async function getEmployeeMasterRecordViewForOrganization(input: {
  organizationId: string
  employeeId: string
}): Promise<EmployeeMasterSnapshot | null> {
  const [snapshot, canReadSensitive] = await Promise.all([
    getEmployeeMasterRecordForOrganization(input),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "employee_sensitive",
      function: "read",
    }),
  ])

  return snapshot
    ? maskEmployeeMasterSnapshotSensitiveFields(snapshot, { canReadSensitive })
    : null
}

export async function listEmployeeMasterPlacementOptions(
  organizationId: string
): Promise<EmployeeMasterPlacementOptions> {
  const [departments, positions, jobGrades, managers, linkedUsers] =
    await Promise.all([
      listDepartmentsForOrg(organizationId, { includeArchived: false }),
      listPositionsForOrg(organizationId, { includeArchived: false }),
      listJobGradesForOrg(organizationId, { includeArchived: false }),
      listActiveEmployeeManagerOptions(organizationId),
      listAccessMembersForOrganization({ organizationId }),
    ])

  return {
    departments: departments.map((d) => ({
      id: d.id,
      code: d.code,
      label: d.name,
      secondaryLabel: null,
    })),
    positions: positions.map((p) => ({
      id: p.id,
      code: p.code,
      label: p.title,
      secondaryLabel: p.departmentCode,
    })),
    jobGrades: jobGrades.map((g) => ({
      id: g.id,
      code: g.code,
      label: g.name,
      secondaryLabel: null,
    })),
    managers,
    linkedUsers: linkedUsers.map((member) => ({
      id: member.userId,
      code: member.userName ?? member.userEmail,
      label: member.userName ? member.userEmail : member.role,
      secondaryLabel: member.userName ? member.role : null,
    })),
  }
}

export function deriveEmployeeMasterCompleteness(input: {
  personalProfile: EmployeePersonalProfileRow | null
  contactProfile: EmployeeContactProfileRow | null
  identityDocumentCount: number
  verifiedIdentityDocumentCount: number
  workAuthorizationCount: number
  emergencyContactCount: number
  payrollProfilePresent: boolean
  documentCount: number
  hasEmploymentOwner: boolean
  employmentStatus: string
  employmentStartDate: Date | null
  nationality: string | null
  workCountryCode: string | null
}): EmployeeMasterCompleteness {
  const identity =
    input.personalProfile !== null && input.identityDocumentCount > 0
  const contact =
    input.contactProfile !== null &&
    Boolean(
      input.contactProfile.workEmail ||
      input.contactProfile.workPhone ||
      input.contactProfile.personalEmail ||
      input.contactProfile.personalPhone
    )
  const emergencyContact = input.emergencyContactCount > 0
  const employment = input.hasEmploymentOwner
  const statutory = input.payrollProfilePresent
  const documents = input.documentCount > 0

  const missingFields: string[] = []
  const missingFieldKeys: EmployeeRecordsFieldKey[] = []
  if (!identity) {
    missingFields.push("identity")
    missingFieldKeys.push("identityDocument.documentNumber")
  }
  if (!contact) {
    missingFields.push("contact")
    missingFieldKeys.push("workEmail")
  }
  if (!emergencyContact) {
    missingFields.push("emergencyContact")
    missingFieldKeys.push("emergencyContact.phone")
  }
  if (!employment) {
    missingFields.push("employment")
    missingFieldKeys.push("currentDepartmentId")
  }
  if (!statutory) {
    missingFields.push("statutory")
    missingFieldKeys.push("taxIdentifierNumber")
  }
  if (!documents) {
    missingFields.push("documents")
    missingFieldKeys.push("document.documentType")
  }

  // Weighted score: identity 20 + contact 15 + emergencyContact 10 + employment 25 + statutory 20 + documents 10
  const score =
    (identity ? 20 : 0) +
    (contact ? 15 : 0) +
    (emergencyContact ? 10 : 0) +
    (employment ? 25 : 0) +
    (statutory ? 20 : 0) +
    (documents ? 10 : 0)

  const activeStatuses = new Set(["active", "probation", "confirmed"])
  const payrollReady =
    statutory &&
    activeStatuses.has(input.employmentStatus) &&
    input.employmentStartDate !== null

  const requiresWorkAuthorization =
    input.nationality !== null &&
    input.workCountryCode !== null &&
    input.nationality.toUpperCase() !== input.workCountryCode.toUpperCase()

  const complianceReady =
    input.verifiedIdentityDocumentCount > 0 &&
    (!requiresWorkAuthorization || input.workAuthorizationCount > 0)

  return {
    identity,
    contact,
    emergencyContact,
    employment,
    statutory,
    documents,
    score,
    missingFields,
    missingFieldKeys,
    payrollReady,
    complianceReady,
  }
}

async function getEmployeePersonalProfile(
  organizationId: string,
  employeeId: string
): Promise<EmployeePersonalProfileRow | null> {
  const [row] = await db
    .select({
      id: hrmEmployeePersonalProfile.id,
      dateOfBirth: hrmEmployeePersonalProfile.dateOfBirth,
      gender: hrmEmployeePersonalProfile.gender,
      nationality: hrmEmployeePersonalProfile.nationality,
      maritalStatus: hrmEmployeePersonalProfile.maritalStatus,
      languagePreference: hrmEmployeePersonalProfile.languagePreference,
      primaryIdentityDocumentId:
        hrmEmployeePersonalProfile.primaryIdentityDocumentId,
      profilePhotoBlobUrl: hrmEmployeePersonalProfile.profilePhotoBlobUrl,
      profilePhotoUpdatedAt: hrmEmployeePersonalProfile.profilePhotoUpdatedAt,
    })
    .from(hrmEmployeePersonalProfile)
    .where(
      and(
        eq(hrmEmployeePersonalProfile.organizationId, organizationId),
        eq(hrmEmployeePersonalProfile.employeeId, employeeId)
      )
    )
    .limit(1)

  return row ?? null
}

async function getEmployeeContactProfile(
  organizationId: string,
  employeeId: string
): Promise<EmployeeContactProfileRow | null> {
  const [row] = await db
    .select({
      id: hrmEmployeeContactProfile.id,
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
        eq(hrmEmployeeContactProfile.organizationId, organizationId),
        eq(hrmEmployeeContactProfile.employeeId, employeeId)
      )
    )
    .limit(1)

  return row ?? null
}

async function listEmployeeIdentityDocuments(
  organizationId: string,
  employeeId: string
) {
  return db
    .select({
      id: hrmEmployeeIdentityDocument.id,
      documentType: hrmEmployeeIdentityDocument.documentType,
      documentNumber: hrmEmployeeIdentityDocument.documentNumber,
      issuingCountry: hrmEmployeeIdentityDocument.issuingCountry,
      issuedAt: hrmEmployeeIdentityDocument.issuedAt,
      expiresAt: hrmEmployeeIdentityDocument.expiresAt,
      isPrimary: hrmEmployeeIdentityDocument.isPrimary,
      verificationStatus: hrmEmployeeIdentityDocument.verificationStatus,
    })
    .from(hrmEmployeeIdentityDocument)
    .where(
      and(
        eq(hrmEmployeeIdentityDocument.organizationId, organizationId),
        eq(hrmEmployeeIdentityDocument.employeeId, employeeId)
      )
    )
    .orderBy(
      desc(hrmEmployeeIdentityDocument.isPrimary),
      desc(hrmEmployeeIdentityDocument.updatedAt)
    )
}

async function listEmployeeWorkAuthorizations(
  organizationId: string,
  employeeId: string
) {
  return db
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
        eq(hrmEmployeeWorkAuthorization.organizationId, organizationId),
        eq(hrmEmployeeWorkAuthorization.employeeId, employeeId)
      )
    )
    .orderBy(
      asc(hrmEmployeeWorkAuthorization.countryCode),
      asc(hrmEmployeeWorkAuthorization.authorizationType)
    )
}

async function listActiveEmployeeManagerOptions(
  organizationId: string
): Promise<EmployeeMasterPlacementOption[]> {
  const rows = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt)
      )
    )
    .orderBy(asc(hrmEmployee.employeeNumber))

  return rows.map((row) => ({
    id: row.id,
    code: row.employeeNumber,
    label: row.legalName,
    secondaryLabel: row.id.slice(0, 8),
  }))
}

function derivePlacementLabels(
  employee: EmployeeMasterSnapshot["employee"],
  options: EmployeeMasterPlacementOptions
): EmployeeMasterPlacementLabels {
  return {
    department:
      options.departments.find((d) => d.id === employee.currentDepartmentId) ??
      null,
    position:
      options.positions.find((p) => p.id === employee.currentPositionId) ??
      null,
    jobGrade:
      options.jobGrades.find((g) => g.id === employee.currentJobGradeId) ??
      null,
    manager:
      options.managers.find((m) => m.id === employee.managerEmployeeId) ?? null,
    linkedUser:
      options.linkedUsers.find((user) => user.id === employee.linkedUserId) ??
      null,
  }
}

function legacyPersonalProfileFromEmployee(
  employee: EmployeeMasterSnapshot["employee"]
): EmployeePersonalProfileRow | null {
  if (!employee.dateOfBirth && !employee.gender && !employee.nationality) {
    return null
  }
  return {
    id: "legacy-mirror",
    dateOfBirth: employee.dateOfBirth,
    gender: employee.gender,
    nationality: employee.nationality,
    maritalStatus: null,
    languagePreference: null,
    primaryIdentityDocumentId: null,
    profilePhotoBlobUrl: null,
    profilePhotoUpdatedAt: null,
  }
}

function legacyContactProfileFromEmployee(
  employee: EmployeeMasterSnapshot["employee"]
): EmployeeContactProfileRow | null {
  if (!employee.email && !employee.phone && !employee.address) return null
  const address =
    typeof employee.address === "object" &&
    employee.address !== null &&
    !Array.isArray(employee.address)
      ? (employee.address as Record<string, unknown>)
      : null
  return {
    id: "legacy-mirror",
    workEmail: employee.email,
    workPhone: employee.phone,
    personalEmail: null,
    personalPhone: null,
    address,
    mailingAddress: null,
  }
}
