import { describe, expect, it } from "vitest"

import {
  EMPLOYEE_RECORDS_FIELD_KEYS,
  EMPLOYEE_RECORDS_SURFACE_PERMISSION,
  employeeRecordsFieldPolicyForKey,
  isEmployeeRecordsSensitiveField,
} from "#features/hrm/employee-management/employee-records-management/data/employee-records-field-catalog.shared"

describe("employee records field catalog", () => {
  it("exposes ERP permission keys for read and update", () => {
    expect(EMPLOYEE_RECORDS_SURFACE_PERMISSION.read).toBe("hrm.employee.read")
    expect(EMPLOYEE_RECORDS_SURFACE_PERMISSION.readSensitive).toBe(
      "hrm.employee_sensitive.read"
    )
    expect(EMPLOYEE_RECORDS_SURFACE_PERMISSION.update).toBe(
      "hrm.employee.update"
    )
  })

  it("marks PII fields as sensitive", () => {
    expect(isEmployeeRecordsSensitiveField("personalEmail")).toBe(true)
    expect(isEmployeeRecordsSensitiveField("profilePhotoBlobUrl")).toBe(true)
    expect(
      isEmployeeRecordsSensitiveField("identityDocument.documentNumber")
    ).toBe(true)
    expect(isEmployeeRecordsSensitiveField("employeeNumber")).toBe(false)
  })

  it("returns a policy row for every catalog field key", () => {
    for (const fieldKey of EMPLOYEE_RECORDS_FIELD_KEYS) {
      const policy = employeeRecordsFieldPolicyForKey(fieldKey)
      expect(policy?.fieldKey).toBe(fieldKey)
      expect(policy?.readPermission).toBe(
        EMPLOYEE_RECORDS_SURFACE_PERMISSION.read
      )
      if (policy?.sensitive) {
        expect(policy.sensitiveReadPermission).toBe(
          EMPLOYEE_RECORDS_SURFACE_PERMISSION.readSensitive
        )
      }
    }
  })
})
