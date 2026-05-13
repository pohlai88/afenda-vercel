/**
 * URL tab vocabulary for the Organization structure workbench
 * (`/dashboard/hrm/organization?tab=…`).
 */

export const ORG_STRUCTURE_TABS = [
  "departments",
  "positions",
  "grades",
] as const

export type OrgStructureTab = (typeof ORG_STRUCTURE_TABS)[number]

export const ORG_STRUCTURE_DEFAULT_TAB: OrgStructureTab = "departments"

export function isOrgStructureTab(value: string): value is OrgStructureTab {
  return (ORG_STRUCTURE_TABS as readonly string[]).includes(value)
}
