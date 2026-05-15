import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import {
  ORG_STRUCTURE_DEFAULT_TAB,
  ORG_STRUCTURE_TABS,
  normalizeOrgStructureTab,
} from "../../lib/features/hrm/data/org-structure-display.shared"
import {
  assignEmployeePlacementFormSchema,
  createJobGradeArchitectureFormSchema,
  createOrgUnitFormSchema,
  createPositionControlFormSchema,
} from "../../lib/features/hrm/schemas/org-structure.schema"

const ORG_SLUG = "acme-co"
const DEPARTMENT_ID = "550e8400-e29b-41d4-a716-446655440001"
const POSITION_ID = "550e8400-e29b-41d4-a716-446655440002"
const GRADE_ID = "550e8400-e29b-41d4-a716-446655440003"
const EMPLOYEE_ID = "550e8400-e29b-41d4-a716-446655440004"

describe("HRM organization structure remodel contracts", () => {
  it("uses the canonical 9/10 organization tab vocabulary", () => {
    expect(ORG_STRUCTURE_DEFAULT_TAB).toBe("overview")
    expect(ORG_STRUCTURE_TABS).toEqual([
      "overview",
      "org-units",
      "positions",
      "grades",
      "assignments",
      "reporting",
      "health",
    ])
    expect(normalizeOrgStructureTab("departments")).toBe("org-units")
    expect(normalizeOrgStructureTab("evil")).toBe("overview")
  })

  it("normalizes org-unit optional ownership fields", () => {
    const parsed = createOrgUnitFormSchema.parse({
      orgSlug: ORG_SLUG,
      code: "FIN",
      name: "Finance",
      parentDepartmentId: "",
      headEmployeeId: "",
      costCenterCode: " CC-100 ",
    })

    expect(parsed.parentDepartmentId).toBeNull()
    expect(parsed.headEmployeeId).toBeNull()
    expect(parsed.costCenterCode).toBe("CC-100")
  })

  it("validates job-grade salary band ordering", () => {
    expect(
      createJobGradeArchitectureFormSchema.safeParse({
        orgSlug: ORG_SLUG,
        code: "G7",
        name: "Senior Specialist",
        ordinal: "7",
        minSalaryAmount: "9000.00",
        maxSalaryAmount: "8000.00",
        currency: "myr",
      }).success
    ).toBe(false)

    const parsed = createJobGradeArchitectureFormSchema.parse({
      orgSlug: ORG_SLUG,
      code: "G7",
      name: "Senior Specialist",
      ordinal: "7",
      minSalaryAmount: "8000.00",
      maxSalaryAmount: "9000.00",
      currency: "myr",
      benefitTierCode: "",
    })
    expect(parsed.currency).toBe("MYR")
    expect(parsed.benefitTierCode).toBeUndefined()
  })

  it("accepts position control fields for reporting and headcount", () => {
    const parsed = createPositionControlFormSchema.parse({
      orgSlug: ORG_SLUG,
      code: "FIN-MGR",
      title: "Finance Manager",
      departmentId: DEPARTMENT_ID,
      defaultGradeId: GRADE_ID,
      reportsToPositionId: POSITION_ID,
      employmentType: "permanent",
      headcountBudget: "3",
    })

    expect(parsed.headcountBudget).toBe(3)
    expect(parsed.reportsToPositionId).toBe(POSITION_ID)
  })

  it("requires effective-dated employee placement input", () => {
    expect(
      assignEmployeePlacementFormSchema.safeParse({
        orgSlug: ORG_SLUG,
        employeeId: EMPLOYEE_ID,
        departmentId: DEPARTMENT_ID,
        positionId: POSITION_ID,
        jobGradeId: GRADE_ID,
        managerEmployeeId: "",
        effectiveFrom: "2026/01/01",
      }).success
    ).toBe(false)

    const parsed = assignEmployeePlacementFormSchema.parse({
      orgSlug: ORG_SLUG,
      employeeId: EMPLOYEE_ID,
      departmentId: DEPARTMENT_ID,
      positionId: POSITION_ID,
      jobGradeId: GRADE_ID,
      managerEmployeeId: "",
      effectiveFrom: "2026-01-01",
      reason: "promotion",
    })
    expect(parsed.managerEmployeeId).toBeNull()
    expect(parsed.effectiveFrom).toBe("2026-01-01")
  })

  it("uses ERP RBAC as the org-structure mutation gate", () => {
    const source = readFileSync(
      "lib/features/hrm/actions/org-structure.actions.ts",
      "utf8"
    )

    expect(source).toContain("requireErpPermission")
    expect(source).toContain('object: "organization"')
    expect(source).not.toContain("canActInOrganization")
  })
})
