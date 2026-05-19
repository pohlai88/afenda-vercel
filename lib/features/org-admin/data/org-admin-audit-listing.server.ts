import "server-only"

import {
  listOrganizationIamAuditEvents,
  type OrganizationIamAuditOriginFilter,
} from "#lib/auth"

export async function loadOrgAdminAuditListing(input: {
  organizationId: string
  page: number
  auditOriginFilter: OrganizationIamAuditOriginFilter
}) {
  return listOrganizationIamAuditEvents(input)
}
