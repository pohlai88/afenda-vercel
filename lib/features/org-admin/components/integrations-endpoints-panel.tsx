import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import {
  getOrgEventEndpoint,
  listOrgEventEndpoints,
  listRecentDeliveriesForEndpoint,
} from "../data/integrations-endpoints.queries"

import { IntegrationsEndpointForm } from "./integrations-endpoint-form"
import { OrgAdminIntegrationsEndpointsListSection } from "./org-admin-integrations-endpoints-list-section"

/**
 * Server-rendered list of `org_event_endpoint` rows for the active org. Form
 * islands hydrate as needed; reads stay on the server. Caller is responsible
 * for the `requireOrgSession` + admin gate (org admin layout already enforces).
 */
export async function IntegrationsEndpointsPanel({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("OrgAdmin.integrations.endpoints")
  const endpoints = await listOrgEventEndpoints(organizationId)

  const recentByEndpoint = await Promise.all(
    endpoints.map(async (endpoint) => ({
      endpointId: endpoint.id,
      deliveries: await listRecentDeliveriesForEndpoint(endpoint.id, 5),
    }))
  )
  const recentMap = new Map(
    recentByEndpoint.map((entry) => [entry.endpointId, entry.deliveries])
  )

  // Read live; refresh after mutations is handled by `revalidatePath`.
  void getOrgEventEndpoint

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createTitle")}</CardTitle>
          <CardDescription>{t("createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationsEndpointForm />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">{t("listTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("listDescription")}
          </p>
        </div>
        <OrgAdminIntegrationsEndpointsListSection
          endpoints={endpoints}
          recentByEndpointId={recentMap}
        />
      </section>
    </div>
  )
}
