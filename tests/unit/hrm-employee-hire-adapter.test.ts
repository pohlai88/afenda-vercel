import { describe, expect, it } from "vitest"

import { hrmEmployeeHireRowSchema } from "../../lib/features/org-admin/schemas/hrm-employee-hire-row.schema"

describe("hrmEmployeeHireRowSchema", () => {
  describe("parseRow via schema — required fields", () => {
    it("accepts minimal valid row", () => {
      const result = hrmEmployeeHireRowSchema.safeParse({
        employeeNumber: "EMP-001",
        legalName: "Alice Tan",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.employeeNumber).toBe("EMP-001")
        expect(result.data.legalName).toBe("Alice Tan")
        expect(result.data.preferredName).toBeUndefined()
        expect(result.data.email).toBeUndefined()
        expect(result.data.departmentId).toBeUndefined()
        expect(result.data.positionId).toBeUndefined()
        expect(result.data.gradeId).toBeUndefined()
      }
    })

    it("accepts full row with all optional fields", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000"
      const result = hrmEmployeeHireRowSchema.safeParse({
        employeeNumber: "EMP-002",
        legalName: "Bob Lee",
        preferredName: "Bobby",
        email: "bob@example.com",
        departmentId: validUuid,
        positionId: validUuid,
        gradeId: validUuid,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe("bob@example.com")
        expect(result.data.departmentId).toBe(validUuid)
      }
    })

    it("trims whitespace from employeeNumber and legalName", () => {
      const result = hrmEmployeeHireRowSchema.safeParse({
        employeeNumber: "  EMP-003  ",
        legalName: "  Carol Lim  ",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.employeeNumber).toBe("EMP-003")
        expect(result.data.legalName).toBe("Carol Lim")
      }
    })
  })

  describe("parseRow via schema — validation failures", () => {
    it("rejects missing employeeNumber", () => {
      const result = hrmEmployeeHireRowSchema.safeParse({
        legalName: "Alice Tan",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const fields = result.error.issues.map((i) => i.path[0])
        expect(fields).toContain("employeeNumber")
      }
    })

    it("rejects missing legalName", () => {
      const result = hrmEmployeeHireRowSchema.safeParse({
        employeeNumber: "EMP-001",
      })
      expect(result.success).toBe(false)
    })

    it("rejects blank employeeNumber (whitespace only)", () => {
      const result = hrmEmployeeHireRowSchema.safeParse({
        employeeNumber: "   ",
        legalName: "Alice Tan",
      })
      expect(result.success).toBe(false)
    })

    it("rejects invalid email", () => {
      const result = hrmEmployeeHireRowSchema.safeParse({
        employeeNumber: "EMP-004",
        legalName: "Dave Ng",
        email: "not-an-email",
      })
      expect(result.success).toBe(false)
    })

    it("rejects non-UUID departmentId", () => {
      const result = hrmEmployeeHireRowSchema.safeParse({
        employeeNumber: "EMP-005",
        legalName: "Eve Ong",
        departmentId: "not-a-uuid",
      })
      expect(result.success).toBe(false)
    })

    it("treats empty string departmentId as optional (undefined)", () => {
      const result = hrmEmployeeHireRowSchema.safeParse({
        employeeNumber: "EMP-006",
        legalName: "Frank Ho",
        departmentId: "",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.departmentId).toBeUndefined()
      }
    })

    it("treats empty string email as optional (undefined)", () => {
      const result = hrmEmployeeHireRowSchema.safeParse({
        employeeNumber: "EMP-007",
        legalName: "Grace Yap",
        email: "",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBeUndefined()
      }
    })
  })

  describe("adapter — required CSV headers", () => {
    it("declares employee_number and legal_name as required", async () => {
      const mod =
        await import("../../lib/features/org-admin/data/hrm-employee-hire.adapter.server")
      expect(mod.hrmEmployeeHireAdapter.requiredHeaders).toContain(
        "employee_number"
      )
      expect(mod.hrmEmployeeHireAdapter.requiredHeaders).toContain("legal_name")
    }, 15000)

    it("adapter id is hrm_employee_hire", async () => {
      const mod =
        await import("../../lib/features/org-admin/data/hrm-employee-hire.adapter.server")
      expect(mod.hrmEmployeeHireAdapter.id).toBe("hrm_employee_hire")
    })

    it("parseRow returns validation error for empty employee_number", async () => {
      const mod =
        await import("../../lib/features/org-admin/data/hrm-employee-hire.adapter.server")
      const result = mod.hrmEmployeeHireAdapter.parseRow({
        employee_number: "",
        legal_name: "Alice Tan",
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe("validation")
      }
    })

    it("parseRow returns ok for valid minimal row", async () => {
      const mod =
        await import("../../lib/features/org-admin/data/hrm-employee-hire.adapter.server")
      const result = mod.hrmEmployeeHireAdapter.parseRow({
        employee_number: "EMP-100",
        legal_name: "Alice Tan",
      })
      expect(result.ok).toBe(true)
    })
  })
})
