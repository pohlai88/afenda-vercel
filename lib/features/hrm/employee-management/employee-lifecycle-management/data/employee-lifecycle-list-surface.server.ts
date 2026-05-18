import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import { organizationHrmEmployeePath } from "../../../constants"
import { EMPLOYEE_LIFECYCLE_LIST_SURFACE_IDS } from "./employee-lifecycle-list-surface-ids.shared"
import type { EmployeeLifecycleOverviewRow } from "./employee-lifecycle-overview.queries.server"
import { EMPLOYEE_LIFECYCLE_SURFACE_ID } from "./employee-lifecycle-surface-metadata.shared"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type EmployeeLifecycleListCopy = {
  empty: string
  colEmployeeNumber: string
  colLegalName: string
  colEmploymentStatus: string
  colStage: string
  colEffectiveDate: string
  colPending: string
  colLastWorkingDate: string
  colReason: string
  colApprovalReference: string
  stageLabels: Record<string, string>
  emptyValue: string
}

function displayOrDash(value: string | null | undefined, emptyValue: string): string {
  if (value == null || value.trim().length === 0) return emptyValue
  return value
}

export function buildEmployeeLifecycleListSurfaceConfiguration(
  rows: readonly EmployeeLifecycleOverviewRow[],
  orgSlug: string,
  copy: EmployeeLifecycleListCopy,
  columnsId: string = EMPLOYEE_LIFECYCLE_SURFACE_ID
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: {
      module: "hrm",
      object: "employee",
      function: "search",
    },
    presentation: PRESENTATION,
    surface: {
      header: { title: columnsId },
      columnsId,
      rowKey: "employeeId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employeeNumber", header: copy.colEmployeeNumber },
      { id: "legalName", header: copy.colLegalName },
      { id: "employmentStatus", header: copy.colEmploymentStatus },
      { id: "stage", header: copy.colStage },
      { id: "effectiveDate", header: copy.colEffectiveDate },
      { id: "pendingTransitionCount", header: copy.colPending },
      { id: "lastWorkingDate", header: copy.colLastWorkingDate },
      { id: "reason", header: copy.colReason },
      { id: "approvalReference", header: copy.colApprovalReference },
    ],
    rows: rows.map((row) => ({
      id: row.employeeId,
      linkColumnId: "employeeNumber",
      rowHref: organizationHrmEmployeePath(orgSlug, row.employeeId),
      cells: {
        employeeNumber: row.employeeNumber,
        legalName: row.legalName,
        employmentStatus: row.employmentStatus,
        stage: copy.stageLabels[row.stage] ?? row.stage,
        effectiveDate: displayOrDash(row.effectiveDate, copy.emptyValue),
        pendingTransitionCount: String(row.pendingTransitionCount),
        lastWorkingDate: displayOrDash(row.lastWorkingDate, copy.emptyValue),
        reason: displayOrDash(row.reason, copy.emptyValue),
        approvalReference: displayOrDash(row.approvalReference, copy.emptyValue),
      },
    })),
  }
}

export { EMPLOYEE_LIFECYCLE_LIST_SURFACE_IDS }
