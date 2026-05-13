import "server-only"

import type { SearchParams } from "nuqs/server"

import type { OrganizationIamAuditOriginFilter } from "#lib/auth"
import { parseOrganizationIamAuditOriginFilterParam } from "#lib/auth"

import { loadOrgAdminAuditSearchParams } from "../schemas/org-admin-audit.search-params"

export async function resolveOrgAdminAuditSearchParams(
  searchParams: Promise<SearchParams>
) {
  const loaded = await loadOrgAdminAuditSearchParams(searchParams)
  const page =
    Number.isFinite(loaded.page) && loaded.page >= 1 ? loaded.page : 1
  const auditOriginFilter: OrganizationIamAuditOriginFilter =
    parseOrganizationIamAuditOriginFilterParam(loaded.view ?? undefined)
  return { page, auditOriginFilter, loaded }
}
