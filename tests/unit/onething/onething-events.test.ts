import { beforeEach, describe, expect, it, vi } from "vitest"

const listOrgEventEndpoints = vi.fn()
const getOrgEventEndpointSigningKey = vi.fn()
const deliverEventNow = vi.fn()

vi.mock("#features/org-admin/server", () => ({
  listOrgEventEndpoints,
  getOrgEventEndpointSigningKey,
  deliverEventNow,
}))

describe("emitOneThingOrgWebhook", () => {
  beforeEach(() => {
    listOrgEventEndpoints.mockReset()
    getOrgEventEndpointSigningKey.mockReset()
    deliverEventNow.mockReset()
  })

  it("delivers only enabled endpoints subscribed to the OneThing event", async () => {
    const { emitOneThingOrgWebhook } =
      await import("#features/onething/data/onething-events.server")

    listOrgEventEndpoints.mockResolvedValue([
      {
        id: "skip-disabled",
        enabled: false,
        events: ["erp.onething.resolved"],
      },
      { id: "skip-event", enabled: true, events: ["erp.onething.created"] },
      { id: "deliver", enabled: true, events: ["erp.onething.resolved"] },
    ])
    getOrgEventEndpointSigningKey.mockResolvedValue("secret")

    await emitOneThingOrgWebhook({
      organizationId: "org-1",
      eventType: "erp.onething.resolved",
      data: { oneThingId: "ot-1" },
    })

    expect(getOrgEventEndpointSigningKey).toHaveBeenCalledOnce()
    expect(getOrgEventEndpointSigningKey).toHaveBeenCalledWith({
      organizationId: "org-1",
      endpointId: "deliver",
    })
    expect(deliverEventNow).toHaveBeenCalledOnce()
    expect(deliverEventNow.mock.calls[0]?.[0]).toMatchObject({
      endpoint: { id: "deliver" },
      signingKey: "secret",
      envelope: {
        type: "erp.onething.resolved",
        organizationId: "org-1",
        data: { oneThingId: "ot-1" },
      },
    })
  })
})
