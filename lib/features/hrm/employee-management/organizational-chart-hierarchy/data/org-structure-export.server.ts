import "server-only"

import {
  buildOrgStructureExportRows,
  listOrgStructureEmployeePlacements,
  listOrgStructureSnapshot,
  type OrgStructureQueryOptions,
} from "./org-structure.queries.server"
import { serializeOrgStructureExportCsv } from "./org-structure-export.shared"

export async function buildOrganizationStructureExportCsv(
  organizationId: string,
  options: Partial<OrgStructureQueryOptions> = {}
): Promise<string> {
  const [snapshot, placements] = await Promise.all([
    listOrgStructureSnapshot(organizationId, options),
    listOrgStructureEmployeePlacements(organizationId, options),
  ])
  return serializeOrgStructureExportCsv(
    buildOrgStructureExportRows(snapshot, placements)
  )
}
