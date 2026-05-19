import { describe, expect, it } from "vitest"

import { maskEmployeeMasterSnapshotSensitiveFields } from "#features/hrm/employee-management/employee-records-management/data/employee-master-sensitive-view.shared"
import type { EmployeeMasterSnapshot } from "#features/hrm/types"

const baseDate = new Date("2026-01-01T00:00:00.000Z")

function snapshotFixture(): EmployeeMasterSnapshot {
  return {
    employee: {
      id: "emp-1",
      employeeNumber: "E-1",
      legalName: "Alex Example",
      preferredName: null,
      email: "work@example.com",
      archivedAt: null,
      phone: "+60123456789",
      dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
      gender: "female",
      nationality: "MY",
      idDocumentType: "passport",
      idDocumentNumber: "A1234567",
      address: { line1: "Raw address" },
      countryCode: "MY",
      workStateCode: "KUL",
      linkedUserId: null,
      employmentStatus: "active",
      employmentStartDate: baseDate,
      probationEndDate: null,
      confirmationDate: null,
      updatedAt: baseDate,
      currentDepartmentId: null,
      currentPositionId: null,
      currentJobGradeId: null,
      managerEmployeeId: null,
      dottedLineManagerId: null,
      hrOwnerEmployeeId: null,
      employmentType: null,
      workerCategory: null,
      employeeLevel: null,
      archivedReason: null,
      currentEmploymentContractId: null,
    },
    personalProfile: {
      id: "profile-1",
      dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
      gender: "female",
      nationality: "MY",
      maritalStatus: null,
      languagePreference: null,
      primaryIdentityDocumentId: "doc-1",
      profilePhotoBlobUrl: "https://blob.example/photo.jpg",
      profilePhotoUpdatedAt: baseDate,
    },
    contactProfile: {
      id: "contact-1",
      workEmail: "work@example.com",
      workPhone: "+60123456789",
      personalEmail: "personal@example.com",
      personalPhone: "+60999999999",
      address: { line1: "Residential" },
      mailingAddress: { line1: "Mailing" },
    },
    identityDocuments: [
      {
        id: "doc-1",
        documentType: "passport",
        documentNumber: "A1234567",
        issuingCountry: "MY",
        issuedAt: null,
        expiresAt: null,
        isPrimary: true,
        verificationStatus: "verified",
      },
    ],
    workAuthorizations: [
      {
        id: "auth-1",
        countryCode: "SG",
        authorizationType: "work_permit",
        documentNumber: "WP-1",
        issuedAt: null,
        expiresAt: null,
        status: "active",
        notes: "raw note",
      },
    ],
    emergencyContacts: [
      {
        id: "ec-1",
        legalName: "Emergency Contact",
        relationship: "spouse",
        phone: "+60111111111",
        alternatePhone: "+60222222222",
        email: "ec@example.com",
        isPrimary: true,
      },
    ],
    payrollProfile: {
      id: "payroll-1",
      countryCode: "MY",
      taxResidencyCountry: "MY",
      taxIdentifierType: "tax",
      taxIdentifierNumber: "TAX-1",
      epfNumber: "EPF-1",
      socsoNumber: "SOCSO-1",
      eisEligible: true,
      pcbCategory: "single",
      hrdfApplicable: false,
      bankCode: "BANK",
      bankAccountTokenized: "bank-token",
      bankAccountHolderName: "Alex Example",
      paySchedule: "monthly",
      payCurrency: "MYR",
      payrollGroupCode: null,
      effectiveFrom: baseDate,
      statutoryProfileExtras: { nationalIdNumber: "NRIC-1" },
    },
    dependents: [],
    documents: [
      {
        id: "docref-1",
        documentType: "contract",
        title: "Contract",
        blobUrl: "https://blob.example/contract.pdf",
        payloadHash: "hash",
        mimeType: "application/pdf",
        sizeBytes: 10,
        classification: "restricted",
        verificationStatus: "verified",
        rejectionReason: null,
        versionNumber: 1,
        isMandatory: true,
        uploadedAt: baseDate,
      },
    ],
    contracts: [],
    placementLabels: {
      department: null,
      position: null,
      jobGrade: null,
      manager: null,
      linkedUser: null,
    },
    placementOptions: {
      departments: [],
      positions: [],
      jobGrades: [],
      managers: [],
      linkedUsers: [],
    },
    orgContext: {
      legalEntity: null,
      businessUnit: null,
      department: null,
      team: null,
      branch: null,
      workLocationCode: null,
      costCenterCode: null,
    },
    assignmentHistory: [],
    employmentHistory: [],
    completeness: {
      identity: true,
      contact: true,
      emergencyContact: true,
      employment: true,
      statutory: true,
      documents: true,
      score: 100,
      missingFields: [],
      missingFieldKeys: [],
      payrollReady: true,
      complianceReady: true,
    },
  }
}

describe("employee master sensitive view", () => {
  it("masks sensitive fields when the caller lacks sensitive read permission", () => {
    const masked = maskEmployeeMasterSnapshotSensitiveFields(
      snapshotFixture(),
      {
        canReadSensitive: false,
      }
    )

    expect(masked.employee.dateOfBirth).toBeNull()
    expect(masked.employee.idDocumentNumber).toBe("[redacted]")
    expect(masked.contactProfile?.personalEmail).toBe("[redacted]")
    expect(masked.identityDocuments[0]?.documentNumber).toBe("[redacted]")
    expect(masked.workAuthorizations[0]?.documentNumber).toBe("[redacted]")
    expect(masked.emergencyContacts[0]?.phone).toBe("[redacted]")
    expect(masked.payrollProfile?.taxIdentifierNumber).toBe("[redacted]")
    expect(masked.documents[0]?.blobUrl).toBe("[redacted]")
  })

  it("returns the original snapshot for sensitive readers", () => {
    const original = snapshotFixture()
    const visible = maskEmployeeMasterSnapshotSensitiveFields(original, {
      canReadSensitive: true,
    })

    expect(visible).toBe(original)
  })
})
