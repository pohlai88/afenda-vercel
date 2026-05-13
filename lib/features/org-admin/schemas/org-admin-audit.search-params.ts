import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs/server"

/**
 * Org admin audit listing — URL is source of truth (nuqs).
 * `view` omitted → production filter (see `parseOrganizationIamAuditOriginFilterParam` in resolver).
 */
export const orgAdminAuditSearchParams = {
  page: parseAsInteger.withDefault(1),
  view: parseAsStringLiteral(["simulated", "all"] as const),
}

export const loadOrgAdminAuditSearchParams = createLoader(
  orgAdminAuditSearchParams
)

export const serializeOrgAdminAuditSearchParams = createSerializer(
  orgAdminAuditSearchParams
)

export type OrgAdminAuditSearchParamsLoaded = Awaited<
  ReturnType<typeof loadOrgAdminAuditSearchParams>
>
