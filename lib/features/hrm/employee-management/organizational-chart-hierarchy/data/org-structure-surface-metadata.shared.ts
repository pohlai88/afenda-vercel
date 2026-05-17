/**
 * Governed-surface vocabulary for organization structure (metadata-only; no UI wiring).
 */

import { buildErpPermissionKey } from "#features/erp-rbac"

export const ORG_STRUCTURE_LIST_SURFACE_IDS = {
  overview: "hrm-org-overview",
  chart: "hrm-org-chart",
  orgUnits: "hrm-org-units",
  positions: "hrm-org-positions",
  grades: "hrm-org-grades",
  assignments: "hrm-org-assignments",
  reporting: "hrm-org-reporting",
  health: "hrm-org-health",
} as const

export type OrgStructureListSurfaceId =
  (typeof ORG_STRUCTURE_LIST_SURFACE_IDS)[keyof typeof ORG_STRUCTURE_LIST_SURFACE_IDS]

export const ORG_STRUCTURE_SURFACE_PERMISSION = {
  read: buildErpPermissionKey({
    module: "hrm",
    object: "organization",
    function: "read",
  }),
  search: buildErpPermissionKey({
    module: "hrm",
    object: "organization",
    function: "search",
  }),
  create: buildErpPermissionKey({
    module: "hrm",
    object: "organization",
    function: "create",
  }),
  update: buildErpPermissionKey({
    module: "hrm",
    object: "organization",
    function: "update",
  }),
  delete: buildErpPermissionKey({
    module: "hrm",
    object: "organization",
    function: "delete",
  }),
} as const

export const ORG_STRUCTURE_TAB_SURFACE_IDS = [
  "overview",
  "chart",
  "org-units",
  "positions",
  "grades",
  "assignments",
  "reporting",
  "health",
] as const

export type OrgStructureTabSurfaceKey =
  (typeof ORG_STRUCTURE_TAB_SURFACE_IDS)[number]

export function orgStructureSurfaceIdForTab(
  tab: OrgStructureTabSurfaceKey
): OrgStructureListSurfaceId {
  switch (tab) {
    case "overview":
      return ORG_STRUCTURE_LIST_SURFACE_IDS.overview
    case "chart":
      return ORG_STRUCTURE_LIST_SURFACE_IDS.chart
    case "org-units":
      return ORG_STRUCTURE_LIST_SURFACE_IDS.orgUnits
    case "positions":
      return ORG_STRUCTURE_LIST_SURFACE_IDS.positions
    case "grades":
      return ORG_STRUCTURE_LIST_SURFACE_IDS.grades
    case "assignments":
      return ORG_STRUCTURE_LIST_SURFACE_IDS.assignments
    case "reporting":
      return ORG_STRUCTURE_LIST_SURFACE_IDS.reporting
    case "health":
      return ORG_STRUCTURE_LIST_SURFACE_IDS.health
    default:
      return ORG_STRUCTURE_LIST_SURFACE_IDS.overview
  }
}
