import { describe, expect, it } from "vitest"

import {
  archiveEmployeeFormSchema,
  createEmployeeFormSchema,
  updateEmployeeFormSchema,
} from "../../lib/features/hrm/employee-management/employee-records-management/schemas/employee.schema"

describe("HRM employee form schemas", () => {
  it("createEmployeeFormSchema accepts minimal valid input", () => {
    const r = createEmployeeFormSchema.safeParse({
      employeeNumber: " E42 ",
      legalName: "Jane Doe",
      preferredName: "",
      email: "",
      employmentStartDate: "2026-01-15",
      currentDepartmentId: "00000000-0000-4000-8000-000000000001",
      currentPositionId: "",
      currentJobGradeId: "",
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.employeeNumber).toBe("E42")
      expect(r.data.legalName).toBe("Jane Doe")
      expect(r.data.preferredName).toBeUndefined()
      expect(r.data.email).toBeUndefined()
      expect(r.data.employmentStartDate).toBe("2026-01-15")
      expect(r.data.currentDepartmentId).toBe(
        "00000000-0000-4000-8000-000000000001"
      )
    }
  })

  it("createEmployeeFormSchema rejects empty employee number / legal name", () => {
    expect(
      createEmployeeFormSchema.safeParse({
        employeeNumber: "   ",
        legalName: "Jane",
      }).success
    ).toBe(false)
    expect(
      createEmployeeFormSchema.safeParse({
        employeeNumber: "1",
        legalName: "",
      }).success
    ).toBe(false)
  })

  it("createEmployeeFormSchema rejects invalid email and UUIDs", () => {
    expect(
      createEmployeeFormSchema.safeParse({
        employeeNumber: "1",
        legalName: "Jane",
        email: "not-an-email",
      }).success
    ).toBe(false)
    expect(
      createEmployeeFormSchema.safeParse({
        employeeNumber: "1",
        legalName: "Jane",
        currentDepartmentId: "nope",
      }).success
    ).toBe(false)
  })

  it("updateEmployeeFormSchema requires employeeId", () => {
    expect(
      updateEmployeeFormSchema.safeParse({
        employeeId: "bad",
        employeeNumber: "1",
        legalName: "Jane",
      }).success
    ).toBe(false)
    const id = "550e8400-e29b-41d4-a716-446655440000"
    const r = updateEmployeeFormSchema.safeParse({
      employeeId: id,
      employeeNumber: "1",
      legalName: "Jane",
      employmentStartDate: "2026-01-15",
      currentDepartmentId: "00000000-0000-4000-8000-000000000001",
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.employeeId).toBe(id)
    }
  })

  it("archiveEmployeeFormSchema accepts optional blank reason", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000"
    const r = archiveEmployeeFormSchema.safeParse({
      employeeId: id,
      archivedReason: "  ",
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.archivedReason).toBeUndefined()
    }
  })

  it("archiveEmployeeFormSchema rejects bad employee id", () => {
    expect(
      archiveEmployeeFormSchema.safeParse({
        employeeId: "x",
      }).success
    ).toBe(false)
  })
})
