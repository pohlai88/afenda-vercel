import { describe, expect, it } from "vitest"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"
import {
  buildComplianceEmployeeStatusListSurfaceConfiguration,
  buildComplianceExceptionsListSurfaceConfiguration,
  buildComplianceFilingsListSurfaceConfiguration,
  buildComplianceHealthSamplesListSurfaceConfiguration,
} from "#features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-list-surface.server"
import type { ComplianceDashboardRow } from "#features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-dashboard.shared"
import type { ComplianceExceptionListRow } from "#features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-exception.queries.server"
import type { ComplianceFilingListRow } from "#features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-filing.queries.server"
import type { ComplianceHealthSampleRow } from "#features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-operational-health.queries.server"

const COMPLIANCE_READ = {
  module: "hrm",
  object: "compliance",
  function: "read",
} as const

const FILING_ROW = {
  id: "filing-1",
  title: "EPF monthly",
  filingCategory: "statutory",
  countryCode: "MY",
  legalEntityCode: "MY-01",
  legalEntityName: null,
  workLocationCode: null,
  employmentType: null,
  workerCategory: null,
  filingAuthority: null,
  referenceCode: null,
  dueDate: new Date("2026-04-15T00:00:00.000Z"),
  coveragePeriod: null,
  status: "open",
  derivedStatus: "open",
  submittedAt: null,
  confirmedAt: null,
  confirmationReference: null,
  evidenceDocumentId: null,
  waivedAt: null,
  waiverReason: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
} as const satisfies ComplianceFilingListRow

const EXCEPTION_ROW = {
  id: "exc-1",
  employeeId: null,
  employeeNumber: null,
  legalName: null,
  complianceArea: "documents",
  itemType: "missing",
  sourceReferenceId: null,
  title: "Missing passport",
  severity: "high",
  status: "open",
  correctiveActionOwnerUserId: null,
  correctiveActionDueDate: null,
  correctiveActionDescription: null,
  correctiveActionProgressNote: null,
  correctiveActionEvidenceDocumentId: null,
  correctiveActionUpdatedAt: null,
  resolutionNote: null,
  resolvedEvidenceDocumentId: null,
  waivedAt: null,
  waiverReason: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
} as const satisfies ComplianceExceptionListRow

const EMPLOYEE_STATUS_ROW = {
  employeeId: "emp-1",
  employeeNumber: "E001",
  legalName: "Alex Example",
  employmentStatus: "active",
  departmentId: null,
  workLocationCode: null,
  legalEntityCode: null,
  employmentType: null,
  workerCategory: null,
  overallStatus: "compliant",
  workAuthorizationExpired: 0,
  documentMissing: 0,
  documentExpired: 0,
  documentPendingVerification: 0,
  trainingOverdue: 0,
  trainingExpired: 0,
  missingAcknowledgementCount: 0,
  openExceptionCount: 0,
} as const satisfies ComplianceDashboardRow

const HEALTH_SAMPLE_ROW = {
  id: "evidence-1",
  packType: "epf",
  periodStart: "2026-01-01",
  periodEnd: "2026-01-31",
  ageDays: 3,
} as const satisfies ComplianceHealthSampleRow

const filingsCopy = {
  empty: "No filings",
  colTitle: "Title",
  colCategory: "Category",
  colStatus: "Status",
  colDue: "Due",
  colScope: "Scope",
  formatDueDate: () => "Apr 15, 2026",
} as const

const exceptionsCopy = {
  empty: "No exceptions",
  colTitle: "Title",
  colArea: "Area",
  colSeverity: "Severity",
  colStatus: "Status",
  colSubject: "Organization",
} as const

const employeeStatusCopy = {
  empty: "No employees",
  colEmployee: "Employee",
  colStatus: "Status",
  colOpen: "Open",
  colScope: "Scope",
  colSignals: "Signals",
} as const

const healthSamplesCopy = {
  empty: "No samples",
  colPack: "Pack",
  colPeriod: "Period",
  colAge: "Age",
  colTier: "Tier",
  packLabelFor: (value: string) => value,
  formatPeriod: () => "Jan 2026",
  ageLabelFor: () => "3d",
  tierLabelFor: () => "—",
} as const

describe("compliance list surface builders", () => {
  it("requires compliance read permission on all builders", () => {
    const builders = [
      buildComplianceFilingsListSurfaceConfiguration([], filingsCopy),
      buildComplianceExceptionsListSurfaceConfiguration([], exceptionsCopy),
      buildComplianceEmployeeStatusListSurfaceConfiguration(
        [],
        employeeStatusCopy
      ),
      buildComplianceHealthSamplesListSurfaceConfiguration(
        "needs_attention_unsent",
        [],
        healthSamplesCopy
      ),
    ] as const satisfies readonly ListSurfaceRendererConfigurationInput[]

    for (const config of builders) {
      expect(config.requiresErpPermission).toEqual(COMPLIANCE_READ)
    }
  })

  it("marks filings trailing ready when update is allowed", () => {
    const config = buildComplianceFilingsListSurfaceConfiguration(
      [FILING_ROW],
      filingsCopy,
      { showActionsColumn: true, canUpdate: true }
    ) as const satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toEqual({ state: "ready" })
  })

  it("omits filings trailing when update is not allowed", () => {
    const config = buildComplianceFilingsListSurfaceConfiguration(
      [FILING_ROW],
      filingsCopy,
      { showActionsColumn: false, canUpdate: false }
    ) as const satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toBeUndefined()
  })

  it("marks exceptions trailing ready when update is allowed", () => {
    const config = buildComplianceExceptionsListSurfaceConfiguration(
      [EXCEPTION_ROW],
      exceptionsCopy,
      { showActionsColumn: true, canUpdate: true }
    ) as const satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toEqual({ state: "ready" })
  })

  it("marks health sample trailing ready when samples exist", () => {
    const config = buildComplianceHealthSamplesListSurfaceConfiguration(
      "needs_attention_failing",
      [HEALTH_SAMPLE_ROW],
      healthSamplesCopy
    ) as const satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toEqual({ state: "ready" })
  })

  it("does not attach trailing on employee status rows", () => {
    const config = buildComplianceEmployeeStatusListSurfaceConfiguration(
      [EMPLOYEE_STATUS_ROW],
      employeeStatusCopy
    ) as const satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toBeUndefined()
  })
})
