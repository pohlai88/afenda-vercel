import "server-only"

import type { PageHeader } from "#features/governed-surface"

import type { EmployeeMasterSnapshot } from "../../../types"
import { EMPLOYEE_RECORDS_DETAIL_SURFACE_ID } from "./employee-records-surface-metadata.shared"

type EmployeeMasterDetailHeaderCopy = {
  readonly eyebrow: string
  readonly fallbackTitle: string
}

export function buildEmployeeMasterDetailPageHeader(input: {
  readonly snapshot: EmployeeMasterSnapshot
  readonly copy: EmployeeMasterDetailHeaderCopy
}): PageHeader {
  const displayName =
    input.snapshot.employee.preferredName?.trim() ||
    input.snapshot.employee.legalName

  return {
    eyebrow: input.copy.eyebrow,
    title: displayName,
    description: `${input.snapshot.employee.employeeNumber} · ${EMPLOYEE_RECORDS_DETAIL_SURFACE_ID} · ${input.snapshot.completeness.score}% complete`,
  }
}
