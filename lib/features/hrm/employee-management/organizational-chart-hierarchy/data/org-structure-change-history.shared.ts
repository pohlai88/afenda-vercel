/** Resource types tracked in org structure change history. */
export const HRM_ORG_STRUCTURE_RESOURCE_TYPES = [
  "hrm_department",
  "hrm_position",
] as const

export type HrmOrgStructureResourceType =
  (typeof HRM_ORG_STRUCTURE_RESOURCE_TYPES)[number]

export type OrgStructureFieldChange = {
  readonly fieldName: string
  readonly oldValue: unknown
  readonly newValue: unknown
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Builds field-level diffs for org structure mutations (HRM-ORG-025). */
export function buildOrgStructureFieldChanges<
  T extends Record<string, unknown>,
>(
  existing: T | null,
  next: T,
  fields: readonly (keyof T & string)[]
): OrgStructureFieldChange[] {
  const changes: OrgStructureFieldChange[] = []
  for (const fieldName of fields) {
    const oldValue = existing ? existing[fieldName] : null
    const newValue = next[fieldName]
    if (!valuesEqual(oldValue, newValue)) {
      changes.push({ fieldName, oldValue, newValue })
    }
  }
  return changes
}

export const DEPARTMENT_CHANGE_FIELDS = [
  "code",
  "name",
  "orgUnitType",
  "parentDepartmentId",
  "headEmployeeId",
  "costCenterCode",
  "workLocationCode",
  "effectiveFrom",
] as const

export const POSITION_CHANGE_FIELDS = [
  "code",
  "title",
  "departmentId",
  "defaultGradeId",
  "reportsToPositionId",
  "employmentType",
  "headcountBudget",
  "positionStatus",
  "costCenterCode",
  "workLocationCode",
  "effectiveFrom",
] as const
