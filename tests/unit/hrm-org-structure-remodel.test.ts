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
  setEmployeeReportingRelationshipFormSchema,
} from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/schemas/org-structure.schema"
import {
  isOrgRecordEffectiveAsOf,
  isOrgRecordPlannedForFuture,
} from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-effective.shared"
import { serializeOrgStructureExportCsv } from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-export.shared"
import {
  ORG_STRUCTURE_METADATA_COLUMNS,
  ORG_STRUCTURE_METADATA_FILTERS,
  ORG_STRUCTURE_SURFACE_PERMISSION,
} from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-surface-metadata.shared"
import {
  assertAppendOnlyEffectiveVersionWindow,
  chooseEffectiveVersion,
  chooseOrgStructureVersion,
  isEffectiveWindowAsOf,
} from "../../lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-versioning.shared"

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
    expect(parsed.orgUnitStatus).toBe("active")
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
      positionOwnerEmployeeId: EMPLOYEE_ID,
      reportsToPositionId: POSITION_ID,
      employmentType: "permanent",
      headcountBudget: "3",
    })

    expect(parsed.headcountBudget).toBe(3)
    expect(parsed.positionOwnerEmployeeId).toBe(EMPLOYEE_ID)
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
      dottedLineManagerId: "",
      effectiveFrom: "2026-01-01",
      reason: "promotion",
      approvalReference: "APR-1",
    })
    expect(parsed.managerEmployeeId).toBeNull()
    expect(parsed.dottedLineManagerId).toBeNull()
    expect(parsed.effectiveFrom).toBe("2026-01-01")
    expect(parsed.approvalReference).toBe("APR-1")
  })

  it("accepts normalized direct, dotted, and matrix reporting relationships", () => {
    const parsed = setEmployeeReportingRelationshipFormSchema.parse({
      orgSlug: ORG_SLUG,
      employeeId: EMPLOYEE_ID,
      managerEmployeeId: "550e8400-e29b-41d4-a716-446655440005",
      relationshipType: "matrix",
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      status: "active",
      reason: "project governance",
    })

    expect(parsed.relationshipType).toBe("matrix")
    expect(parsed.effectiveTo).toBeUndefined()
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

  it("uses versioned structures for cycle and placement checks", () => {
    const actionsSource = readFileSync(
      "lib/features/hrm/employee-management/organizational-chart-hierarchy/actions/org-structure.actions.ts",
      "utf8"
    )
    const mutationSupportSource = readFileSync(
      "lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-mutation-support.server.ts",
      "utf8"
    )

    expect(actionsSource).toContain("hrmOrgUnitVersion")
    expect(actionsSource).toContain("hrmPositionVersion")
    expect(actionsSource).toContain("chooseEffectiveVersion")
    expect(mutationSupportSource).toContain("hrmPositionVersion")
    expect(mutationSupportSource).toContain("chooseEffectiveVersion")
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

  it("chooses effective version rows for historical reconstruction", () => {
    const versions = [
      {
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: new Date("2026-06-30T00:00:00.000Z"),
        name: "Finance",
      },
      {
        effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
        effectiveTo: null,
        name: "Finance Ops",
      },
    ]

    expect(
      isEffectiveWindowAsOf(versions[0]!, new Date("2026-03-01T00:00:00.000Z"))
    ).toBe(true)
    expect(
      chooseEffectiveVersion(versions, new Date("2026-08-01T00:00:00.000Z"))
        ?.name
    ).toBe("Finance Ops")
  })

  it("defaults current reads to today and keeps future planning explicit", () => {
    const versions = [
      {
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: new Date("2026-06-30T00:00:00.000Z"),
        name: "Current Finance",
      },
      {
        effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
        effectiveTo: null,
        name: "Future Finance",
      },
    ]

    expect(
      chooseOrgStructureVersion(versions, {
        now: new Date("2026-05-01T00:00:00.000Z"),
      })?.name
    ).toBe("Current Finance")
    expect(
      chooseOrgStructureVersion(versions, {
        asOfDate: new Date("2026-08-01T00:00:00.000Z"),
      })?.name
    ).toBe("Future Finance")
    expect(
      chooseOrgStructureVersion(versions, {
        includeFuture: true,
        now: new Date("2026-05-01T00:00:00.000Z"),
      })?.name
    ).toBe("Future Finance")
  })

  it("rejects duplicate and overlapping effective-dated versions", () => {
    const versions = [
      {
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: new Date("2026-06-30T00:00:00.000Z"),
      },
      {
        effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
        effectiveTo: null,
      },
    ]

    expect(() =>
      assertAppendOnlyEffectiveVersionWindow(
        versions,
        new Date("2026-07-01T00:00:00.000Z"),
        {
          duplicateError: "duplicate",
          overlapError: "overlap",
        }
      )
    ).toThrow("duplicate")
    expect(() =>
      assertAppendOnlyEffectiveVersionWindow(
        versions,
        new Date("2026-05-01T00:00:00.000Z"),
        {
          duplicateError: "duplicate",
          overlapError: "overlap",
        }
      )
    ).toThrow("overlap")
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
        dottedLineManagerLabel: null,
        matrixManagerLabels: "E099 · Matrix Manager",
        orgUnitType: "department",
        orgUnitStatus: "active",
        positionStatus: "active",
        pendingHireCount: 1,
        openHeadcountAfterPending: 0,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: null,
        reason: "baseline",
        approvalReference: "APR-1",
      },
    ])
    expect(csv.split("\n")[0]).toContain("orgUnitCode")
    expect(csv.split("\n")[0]).toContain("pendingHireCount")
    expect(csv).toContain("FIN")
    expect(csv).toContain("Finance Manager")
    expect(csv).toContain("APR-1")
  })

  it("exposes governed-surface ERP permission keys for organization", () => {
    expect(ORG_STRUCTURE_SURFACE_PERMISSION.read).toContain(
      "hrm.organization.read"
    )
    expect(ORG_STRUCTURE_SURFACE_PERMISSION.search).toContain(
      "hrm.organization.search"
    )
    expect(ORG_STRUCTURE_METADATA_FILTERS).toContain("asOfDate")
    expect(ORG_STRUCTURE_METADATA_FILTERS).toContain("managerEmployeeId")
    expect(ORG_STRUCTURE_METADATA_COLUMNS).toContain("matrixManagerLabels")
  })

  it("exposes guarded read, search, and export backend entrypoints", () => {
    const guardedSource = readFileSync(
      "lib/features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-guarded.server.ts",
      "utf8"
    )
    const serverSource = readFileSync("lib/features/hrm/server.ts", "utf8")

    expect(guardedSource).toContain("requireOrgStructureReadPermission")
    expect(guardedSource).toContain("requireOrgStructureSearchPermission")
    expect(guardedSource).toContain("readCurrentOrgStructureSnapshot")
    expect(guardedSource).toContain("exportCurrentOrgStructureCsv")
    expect(serverSource).toContain("readCurrentOrgStructureSnapshot")
    expect(serverSource).toContain("exportCurrentOrgStructureCsv")
  })
})
