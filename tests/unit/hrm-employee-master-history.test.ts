import { describe, expect, it } from "vitest"

import {
  buildEmployeeMasterBackfillRows,
  buildEmployeeMasterChangeRows,
  redactEmployeeMasterChangeValue,
} from "#features/hrm/employee-management/employee-records-management/data/employee-master-history.shared"

describe("employee master change redaction", () => {
  it("redacts sensitive identifiers in history rows", () => {
    const rows = buildEmployeeMasterChangeRows({
      organizationId: "org_1",
      employeeId: "emp_1",
      changedByUserId: "user_1",
      changes: [
        {
          fieldName: "legalName",
          oldValue: "Old Name",
          newValue: "New Name",
        },
        {
          fieldName: "taxIdentifierNumber",
          oldValue: "RAW-TAX-OLD",
          newValue: "RAW-TAX-NEW",
        },
        {
          fieldName: "personalEmail",
          oldValue: "old@example.com",
          newValue: "new@example.com",
        },
        {
          fieldName: "dateOfBirth",
          oldValue: "1990-01-01",
          newValue: "1991-01-01",
        },
        {
          fieldName: "address",
          oldValue: { line1: "Old" },
          newValue: { line1: "New" },
        },
      ],
    })

    expect(rows).toEqual([
      expect.objectContaining({
        fieldName: "legalName",
        oldValue: "Old Name",
        newValue: "New Name",
      }),
      expect.objectContaining({
        fieldName: "taxIdentifierNumber",
        oldValue: "[redacted]",
        newValue: "[redacted]",
      }),
      expect.objectContaining({
        fieldName: "personalEmail",
        oldValue: "[redacted]",
        newValue: "[redacted]",
      }),
      expect.objectContaining({
        fieldName: "dateOfBirth",
        oldValue: "[redacted]",
        newValue: "[redacted]",
      }),
      expect.objectContaining({
        fieldName: "address",
        oldValue: "[redacted]",
        newValue: "[redacted]",
      }),
    ])
  })

  it("normalizes nullish sensitive values without inventing redactions", () => {
    expect(redactEmployeeMasterChangeValue("documentNumber", null)).toBeNull()
    expect(
      redactEmployeeMasterChangeValue("documentNumber", undefined)
    ).toBeNull()
  })
})

describe("employee master compatibility backfill mapper", () => {
  it("maps current hrm_employee mirrors into normalized master rows", () => {
    const dob = new Date("1990-01-01T00:00:00.000Z")
    const rows = buildEmployeeMasterBackfillRows({
      organizationId: "org_1",
      employeeId: "emp_1",
      dateOfBirth: dob,
      gender: "female",
      nationality: "MY",
      email: "work@example.com",
      phone: "+6000000000",
      address: { line1: "Level 1" },
      idDocumentType: "passport",
      idDocumentNumber: "A1234567",
      countryCode: "MY",
    })

    expect(rows.personalProfile).toMatchObject({
      organizationId: "org_1",
      employeeId: "emp_1",
      dateOfBirth: dob,
      gender: "female",
      nationality: "MY",
    })
    expect(rows.contactProfile).toMatchObject({
      workEmail: "work@example.com",
      workPhone: "+6000000000",
    })
    expect(rows.primaryIdentityDocument).toMatchObject({
      documentType: "passport",
      documentNumber: "A1234567",
      issuingCountry: "MY",
      isPrimary: true,
    })
  })
})
