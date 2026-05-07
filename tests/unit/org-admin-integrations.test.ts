import { describe, expect, it } from "vitest"

import {
  EVENT_DELIVERY_STATES,
  ORG_EVENT_TYPES,
  isAllowedEventType,
  isEventDeliveryState,
} from "#features/org-admin/constants"
import { eventTypeSchema } from "#features/org-admin/schemas/integrations-event-type.schema"
import { orgEventEndpointInputSchema } from "#features/org-admin/schemas/integrations-endpoint.schema"
import {
  canonicalJsonStringify,
  computePayloadHash,
  signEventPayload,
} from "#features/org-admin/data/integrations-delivery.server"

describe("EVENT_DELIVERY_STATES", () => {
  it("contains the canonical six lifecycle states", () => {
    expect(EVENT_DELIVERY_STATES).toEqual([
      "queued",
      "sending",
      "delivered",
      "failed",
      "expired",
      "disabled",
    ])
  })

  it("isEventDeliveryState gates the canonical set", () => {
    for (const state of EVENT_DELIVERY_STATES) {
      expect(isEventDeliveryState(state)).toBe(true)
    }
    expect(isEventDeliveryState("retrying")).toBe(false)
    expect(isEventDeliveryState("")).toBe(false)
  })
})

describe("ORG_EVENT_TYPES allowlist", () => {
  it("only contains namespaced types from the canonical taxonomy", () => {
    for (const type of ORG_EVENT_TYPES) {
      expect(type).toMatch(
        /^(iam|org|erp|governance|integration|workflow|system)\./
      )
    }
  })

  it("isAllowedEventType matches the registered set", () => {
    expect(isAllowedEventType("org.member.invite")).toBe(true)
    expect(isAllowedEventType("erp.contact.record.create")).toBe(true)
    expect(isAllowedEventType("custom.event")).toBe(false)
    expect(isAllowedEventType("")).toBe(false)
  })

  it("eventTypeSchema rejects non-namespaced values and non-allowlisted ones", () => {
    expect(eventTypeSchema.safeParse("foo.bar").success).toBe(false)
    expect(eventTypeSchema.safeParse("notadot").success).toBe(false)
    expect(eventTypeSchema.safeParse("org.unknown.thing").success).toBe(false)
    expect(eventTypeSchema.safeParse("org.member.invite").success).toBe(true)
  })
})

describe("orgEventEndpointInputSchema", () => {
  it("rejects http:// in production builds", () => {
    const env = process.env as Record<string, string | undefined>
    const original = env.NODE_ENV
    env.NODE_ENV = "production"
    try {
      const result = orgEventEndpointInputSchema.safeParse({
        name: "Receiver",
        url: "http://example.com/hook",
        events: ["org.member.invite"],
        enabled: true,
      })
      expect(result.success).toBe(false)
    } finally {
      env.NODE_ENV = original
    }
  })

  it("accepts https:// URLs in any environment", () => {
    const result = orgEventEndpointInputSchema.safeParse({
      name: "Receiver",
      url: "https://example.com/hook",
      events: ["org.member.invite"],
      enabled: true,
    })
    expect(result.success).toBe(true)
  })

  it("rejects subscriptions outside the allowlist", () => {
    const result = orgEventEndpointInputSchema.safeParse({
      name: "Receiver",
      url: "https://example.com/hook",
      events: ["custom.event"],
      enabled: true,
    })
    expect(result.success).toBe(false)
  })

  it("rejects duplicate event subscriptions", () => {
    const result = orgEventEndpointInputSchema.safeParse({
      name: "Receiver",
      url: "https://example.com/hook",
      events: ["org.member.invite", "org.member.invite"],
      enabled: true,
    })
    expect(result.success).toBe(false)
  })

  it("rejects names shorter than 2 characters", () => {
    const result = orgEventEndpointInputSchema.safeParse({
      name: "x",
      url: "https://example.com/hook",
      events: ["org.member.invite"],
      enabled: true,
    })
    expect(result.success).toBe(false)
  })
})

describe("canonical delivery primitives", () => {
  it("canonicalJsonStringify sorts object keys at every level", () => {
    const a = canonicalJsonStringify({
      type: "org.member.invite",
      data: { role: "admin", email: "a@b" },
      id: "evt_1",
    })
    const b = canonicalJsonStringify({
      data: { email: "a@b", role: "admin" },
      id: "evt_1",
      type: "org.member.invite",
    })
    expect(a).toBe(b)
  })

  it("computePayloadHash is deterministic across canonicalisations", async () => {
    const json1 = canonicalJsonStringify({ a: 1, b: { x: 1, y: 2 } })
    const json2 = canonicalJsonStringify({ b: { y: 2, x: 1 }, a: 1 })
    expect(json1).toBe(json2)
    const h1 = await computePayloadHash(json1)
    const h2 = await computePayloadHash(json2)
    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })

  it("computePayloadHash differs when input changes", async () => {
    const a = await computePayloadHash(canonicalJsonStringify({ a: 1 }))
    const b = await computePayloadHash(canonicalJsonStringify({ a: 2 }))
    expect(a).not.toBe(b)
  })

  it("signEventPayload returns 64-hex HMAC-SHA256", async () => {
    const sig = await signEventPayload("test-key", "{}")
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })

  it("signEventPayload is deterministic for same key+message", async () => {
    const a = await signEventPayload("k", "hello")
    const b = await signEventPayload("k", "hello")
    expect(a).toBe(b)
  })

  it("signEventPayload changes when the key changes", async () => {
    const a = await signEventPayload("k1", "hello")
    const b = await signEventPayload("k2", "hello")
    expect(a).not.toBe(b)
  })
})
