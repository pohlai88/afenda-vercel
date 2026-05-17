import "server-only"

import {
  buildOrgStructureExportRows,
  listOrgStructureEmployeePlacements,
  listOrgStructureSnapshot,
} from "./org-structure.queries.server"
import { serializeOrgStructureExportCsv } from "./org-structure-export.shared"

export async function buildOrganizationStructureExportCsv(
  organizationId: string
): Promise<string> {
  const [snapshot, placements] = await Promise.all([
    listOrgStructureSnapshot(organizationId),
    listOrgStructureEmployeePlacements(organizationId),
  ])
  return serializeOrgStructureExportCsv(
    buildOrgStructureExportRows(snapshot, placements)
  )
}
