import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildOrgIntegrationsEndpointsListSurfaceConfiguration } from "../data/org-admin-integrations-list-surface.server"
import type {
  OrgEventDeliverySummary,
  OrgEventEndpointSummary,
} from "../types"

import { IntegrationsEndpointActions } from "./integrations-endpoint-actions.client"

type OrgAdminIntegrationsEndpointsListSectionProps = {
  endpoints: readonly OrgEventEndpointSummary[]
  recentByEndpointId: ReadonlyMap<string, readonly OrgEventDeliverySummary[]>
}

export async function OrgAdminIntegrationsEndpointsListSection({
  endpoints,
  recentByEndpointId,
}: OrgAdminIntegrationsEndpointsListSectionProps) {
  const t = await getTranslations("OrgAdmin.integrations.endpoints")

  const listConfiguration = buildOrgIntegrationsEndpointsListSurfaceConfiguration(
    endpoints,
    recentByEndpointId,
    {
      empty: t("listEmpty"),
      colName: "Name",
      colUrl: "URL",
      colStatus: "Status",
      colRecent: t("recentTitle"),
      noRecent: "—",
      enabledLabel: (enabled) => t("statusEnabled", { enabled: enabled ? "yes" : "no" }),
      eventsLabel: (count) => t("statusEvents", { count }),
    }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="org-admin:integrations:endpoints"
      resolveConfiguredPermission={false}
      trailingColumn={{
        header: "Actions",
        render: (surfaceRow) => (
          <IntegrationsEndpointActions endpointId={surfaceRow.id} />
        ),
      }}
    />
  )
}
