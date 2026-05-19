"use server"

import { requireOrgSession } from "#lib/auth"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import { buildOrganizationStructureExportCsv } from "../data/org-structure-export.server"

/** CSV export of org structure for ERP integrations (HRM-ORG-023). */
export async function exportOrgStructureCsvAction(): Promise<
  { ok: true; csv: string } | { ok: false; message: string }
> {
  const session = await requireOrgSession()
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "organization",
    function: "search",
  })
  if (!allowed) {
    return { ok: false, message: "Organization search permission required." }
  }

  const csv = await buildOrganizationStructureExportCsv(session.organizationId)
  return { ok: true, csv }
}
