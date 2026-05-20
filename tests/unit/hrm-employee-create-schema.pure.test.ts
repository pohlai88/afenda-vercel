import { describe, expect, it } from "vitest"

import { createEmployeeFormSchema } from "#features/hrm/employee-management/employee-records-management/schemas/employee.schema"

describe("createEmployeeFormSchema", () => {
  const base = {
    employeeNumber: "E-1001",
    legalName: "Alex Example",
    employmentStartDate: "2026-01-15",
    currentDepartmentId: "00000000-0000-4000-8000-000000000001",
  } as const

  it("requires employment start date", () => {
    const result = createEmployeeFormSchema.safeParse({
      ...base,
      employmentStartDate: undefined,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.employmentStartDate?.[0]).toBe(
        "Employment start date is required."
      )
    }
  })

  it("requires at least one placement reference", () => {
    const result = createEmployeeFormSchema.safeParse({
      employeeNumber: base.employeeNumber,
      legalName: base.legalName,
      employmentStartDate: base.employmentStartDate,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.currentDepartmentId?.[0]).toBe(
        "At least one placement reference (department, position, or grade) is required."
      )
    }
  })
})
