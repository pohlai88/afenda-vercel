import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import {
  ORG_STRUCTURE_DEFAULT_TAB,
  ORG_STRUCTURE_TABS,
  normalizeOrgStructureTab,
} from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-display.shared"
import {
  assignEmployeePlacementFormSchema,
  createJobGradeArchitectureFormSchema,
  createOrgUnitFormSchema,
  createPositionControlFormSchema,
} from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/schemas/org-structure.schema"
import {
  isOrgRecordEffectiveAsOf,
  isOrgRecordPlannedForFuture,
} from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-effective.shared"
import { serializeOrgStructureExportCsv } from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-export.shared"
import { ORG_STRUCTURE_SURFACE_PERMISSION } from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-surface-metadata.shared"

const ORG_SLUG = "acme-co"
const DEPARTMENT_ID = "550e8400-e29b-41d4-a716-446655440001"
const POSITION_ID = "550e8400-e29b-41d4-a716-446655440002"
const GRADE_ID = "550e8400-e29b-41d4-a716-446655440003"
const EMPLOYEE_ID = "550e8400-e29b-41d4-a716-446655440004"

describe("HRM organization structure remodel contracts", () => {
  it("uses the canonical organization tab vocabulary", () => {
    expect(ORG_STRUCTURE_DEFAULT_TAB).toBe("overview")
    expect(ORG_STRUCTURE_TABS).toEqual([
      "overview",
      "chart",
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
      "lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-action-guard.server.ts",
      "utf8"
    )

    expect(source).toContain("requireErpPermission")
    expect(source).toContain('object: "organization"')
    expect(source).not.toContain("canActInOrganization")
  })

  it("filters org records by as-of effective dating", () => {
    const asOf = new Date("2026-06-01T00:00:00.000Z")
    expect(
      isOrgRecordEffectiveAsOf(new Date("2026-05-01T00:00:00.000Z"), asOf)
    ).toBe(true)
    expect(
      isOrgRecordEffectiveAsOf(new Date("2026-07-01T00:00:00.000Z"), asOf)
    ).toBe(false)
    expect(isOrgRecordPlannedForFuture(null, asOf)).toBe(false)
    expect(
      isOrgRecordPlannedForFuture(new Date("2026-12-01T00:00:00.000Z"), asOf)
    ).toBe(true)
  })

  it("serializes org structure export CSV with header row", () => {
    const csv = serializeOrgStructureExportCsv([
      {
        orgUnitCode: "FIN",
        orgUnitName: "Finance",
        parentOrgUnitCode: null,
        costCenterCode: "CC-1",
        workLocationCode: null,
        positionCode: "FIN-MGR",
        positionTitle: "Finance Manager",
        positionHeadcountBudget: 2,
        positionOccupancyCount: 1,
        occupancyState: "open",
        employeeNumber: "E001",
        employeeLabel: "E001 · Alex",
        managerLabel: null,
      },
    ])
    expect(csv.split("\n")[0]).toContain("orgUnitCode")
    expect(csv).toContain("FIN")
    expect(csv).toContain("Finance Manager")
  })

  it("exposes governed-surface ERP permission keys for organization", () => {
    expect(ORG_STRUCTURE_SURFACE_PERMISSION.read).toContain(
      "hrm.organization.read"
    )
    expect(ORG_STRUCTURE_SURFACE_PERMISSION.search).toContain(
      "hrm.organization.search"
    )
  })
})
