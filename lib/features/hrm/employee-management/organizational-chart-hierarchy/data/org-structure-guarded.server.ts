import "server-only"

import { buildOrganizationStructureExportCsv } from "./org-structure-export.server"
import {
  listOrgChartNodes,
  listOrgStructureSnapshot,
  type OrgStructureQueryOptions,
  type OrgStructureSnapshot,
} from "./org-structure.queries.server"
import {
  requireOrgStructureReadPermission,
  requireOrgStructureSearchPermission,
} from "./org-structure-read-guard.server"
import type { OrgChartNode } from "./org-chart.shared"

export type GuardedOrgStructureResult<T> =
  | { ok: true; organizationId: string; data: T }
  | { ok: false; error: string }

export async function readCurrentOrgStructureSnapshot(
  options: Partial<OrgStructureQueryOptions> = {}
): Promise<GuardedOrgStructureResult<OrgStructureSnapshot>> {
  const gate = await requireOrgStructureReadPermission()
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.organizationId,
    data: await listOrgStructureSnapshot(gate.organizationId, options),
  }
}

export async function searchCurrentOrgStructureSnapshot(
  options: Partial<OrgStructureQueryOptions> = {}
): Promise<GuardedOrgStructureResult<OrgStructureSnapshot>> {
  const gate = await requireOrgStructureSearchPermission()
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.organizationId,
    data: await listOrgStructureSnapshot(gate.organizationId, options),
  }
}

export async function readCurrentOrgChartNodes(
  options: Partial<OrgStructureQueryOptions> = {}
): Promise<GuardedOrgStructureResult<readonly OrgChartNode[]>> {
  const gate = await requireOrgStructureReadPermission()
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.organizationId,
    data: await listOrgChartNodes(gate.organizationId, {
      includeArchived: false,
      ...options,
    }),
  }
}

export async function exportCurrentOrgStructureCsv(
  options: Partial<OrgStructureQueryOptions> = {}
): Promise<GuardedOrgStructureResult<string>> {
  const gate = await requireOrgStructureSearchPermission()
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.organizationId,
    data: await buildOrganizationStructureExportCsv(
      gate.organizationId,
      options
    ),
  }
}
