/**
 * URL tab vocabulary for the Organization structure workbench
 * (`/dashboard/hrm/organization?tab=…`).
 */

export const ORG_STRUCTURE_TABS = [
  "overview",
  "org-units",
  "positions",
  "grades",
  "assignments",
  "reporting",
  "health",
] as const

export type OrgStructureTab = (typeof ORG_STRUCTURE_TABS)[number]

export const ORG_STRUCTURE_DEFAULT_TAB: OrgStructureTab = "overview"

export function isOrgStructureTab(value: string): value is OrgStructureTab {
  return (ORG_STRUCTURE_TABS as readonly string[]).includes(value)
}

export function normalizeOrgStructureTab(
  value: string | undefined
): OrgStructureTab {
  if (value === "departments") return "org-units"
  return value && isOrgStructureTab(value)
    ? value
    : ORG_STRUCTURE_DEFAULT_TAB
}
