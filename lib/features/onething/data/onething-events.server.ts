import "server-only"

import type { OrgEventEnvelope } from "#features/org-admin/server"

/**
 * Delivers subscribed outbound webhooks for org-scoped onething events.
 * Dynamic-imports `#features/org-admin/server` to avoid static circular module graphs with the import adapter.
 */
export async function emitOneThingOrgWebhook(params: {
  organizationId: string
  eventType:
    | "erp.onething.created"
    | "erp.onething.updated"
    | "erp.onething.resolved"
    | "erp.onething.assigned"
    | "erp.onething.due_soon"
  data: Record<string, unknown>
}): Promise<void> {
  const {
    listOrgEventEndpoints,
    getOrgEventEndpointSigningKey,
    deliverEventNow,
  } = await import("#features/org-admin/server")

  const endpoints = await listOrgEventEndpoints(params.organizationId)
  const occurredAt = new Date().toISOString()

  for (const endpoint of endpoints) {
    if (!endpoint.enabled) continue
    if (!endpoint.events.includes(params.eventType)) continue

    const signingKey = await getOrgEventEndpointSigningKey({
      organizationId: params.organizationId,
      endpointId: endpoint.id,
    })
    if (!signingKey) continue

    const envelope: OrgEventEnvelope = {
      id: crypto.randomUUID(),
      type: params.eventType,
      occurredAt,
      organizationId: params.organizationId,
      data: params.data,
    }

    await deliverEventNow({ endpoint, signingKey, envelope })
  }
}
