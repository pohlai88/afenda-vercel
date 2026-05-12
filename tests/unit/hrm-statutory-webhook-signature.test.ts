/**
 * Phase 3J — Bureau webhook signature verification.
 *
 * Locks the symmetric HMAC contract used by both outbound delivery (Phase 3E)
 * and inbound bureau acknowledgement (Phase 3J). Any change to:
 *   - canonicalJsonStringify key ordering
 *   - signEventPayload algorithm (HMAC-SHA256)
 *   - signature header format (`<version>=<hex>`)
 *   - constant-time comparison
 * is a public-contract change — bureau integrations (and our own outbound
 * receivers) depend on these strings being byte-for-byte stable.
 */
import { describe, expect, it } from "vitest"

import {
  canonicalJsonStringify,
  computePayloadHash,
  signEventPayload,
  verifyOrgEventWebhookSignature,
  ORG_EVENT_SIGNATURE_VERSION,
  type OrgEventWebhookResolution,
} from "../../lib/features/org-admin/data/integrations-delivery.server"

const SIGNING_KEY =
  "test-key-32-bytes-base64ish-for-fixture-only-not-real-secret"

const FIXTURE_RESOLUTION: OrgEventWebhookResolution = {
  deliveryId: "delivery-fixture-1",
  endpointId: "endpoint-fixture-1",
  organizationId: "org-fixture-1",
  eventType: "erp.hrm.statutory.epf.submitted",
  signatureVersion: ORG_EVENT_SIGNATURE_VERSION,
  signingKeyEncoded: SIGNING_KEY,
}

const FIXTURE_BODY_OBJECT = {
  externalReference: "EPF-2026-001234",
  acknowledgedAt: "2026-05-12T03:00:00.000Z",
  bureauNote: "Received and queued for processing.",
}

async function buildSignedFixture(): Promise<{
  rawBody: string
  signatureHeader: string
  payloadHashHeader: string
}> {
  const rawBody = canonicalJsonStringify(FIXTURE_BODY_OBJECT)
  const payloadHash = await computePayloadHash(rawBody)
  const sig = await signEventPayload(SIGNING_KEY, rawBody)
  return {
    rawBody,
    signatureHeader: `${ORG_EVENT_SIGNATURE_VERSION}=${sig}`,
    payloadHashHeader: payloadHash,
  }
}

describe("verifyOrgEventWebhookSignature — happy path", () => {
  it("accepts a body signed with the matching signing key", async () => {
    const { rawBody, signatureHeader, payloadHashHeader } =
      await buildSignedFixture()
    const result = await verifyOrgEventWebhookSignature({
      resolution: FIXTURE_RESOLUTION,
      rawBody,
      signatureHeader,
      payloadHashHeader,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payloadHash).toMatch(/^[0-9a-f]{64}$/)
      expect(result.payloadHash).toBe(payloadHashHeader)
    }
  })

  it("accepts a request when the optional payload hash header is absent", async () => {
    const { rawBody, signatureHeader } = await buildSignedFixture()
    // Defense-in-depth: the hash header is optional. If the bureau omits it,
    // the signature alone still authenticates the body.
    const result = await verifyOrgEventWebhookSignature({
      resolution: FIXTURE_RESOLUTION,
      rawBody,
      signatureHeader,
      payloadHashHeader: null,
    })
    expect(result.ok).toBe(true)
  })
})

describe("verifyOrgEventWebhookSignature — rejection paths", () => {
  it("rejects when the signature header is missing", async () => {
    const { rawBody, payloadHashHeader } = await buildSignedFixture()
    const result = await verifyOrgEventWebhookSignature({
      resolution: FIXTURE_RESOLUTION,
      rawBody,
      signatureHeader: null,
      payloadHashHeader,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("missing_signature")
  })

  it("rejects when the signature header is not in `version=hex` format", async () => {
    const { rawBody, payloadHashHeader } = await buildSignedFixture()
    for (const malformed of [
      "no-equals-sign",
      "v1",
      "=missing-version",
      "v1=zzznotvalidhex",
      "v1==doublehex",
    ]) {
      const result = await verifyOrgEventWebhookSignature({
        resolution: FIXTURE_RESOLUTION,
        rawBody,
        signatureHeader: malformed,
        payloadHashHeader,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect([
          "malformed_signature",
          "unsupported_version",
          "signature_mismatch",
        ]).toContain(result.reason)
      }
    }
  })

  it("rejects when the signature version does not match the endpoint", async () => {
    const { rawBody, payloadHashHeader, signatureHeader } =
      await buildSignedFixture()
    // Take a real signature, swap the version prefix to v99.
    const swapped = signatureHeader.replace(/^v\d+=/, "v99=")
    const result = await verifyOrgEventWebhookSignature({
      resolution: FIXTURE_RESOLUTION,
      rawBody,
      signatureHeader: swapped,
      payloadHashHeader,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("unsupported_version")
  })

  it("rejects when the supplied payload hash header does not match the body", async () => {
    const { rawBody, signatureHeader } = await buildSignedFixture()
    const result = await verifyOrgEventWebhookSignature({
      resolution: FIXTURE_RESOLUTION,
      rawBody,
      signatureHeader,
      payloadHashHeader: "0".repeat(64),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("payload_hash_mismatch")
  })

  it("rejects when the body has been tampered with after signing", async () => {
    const { signatureHeader } = await buildSignedFixture()
    const tamperedBody = canonicalJsonStringify({
      ...FIXTURE_BODY_OBJECT,
      externalReference: "EVIL-INJECTED",
    })
    const result = await verifyOrgEventWebhookSignature({
      resolution: FIXTURE_RESOLUTION,
      rawBody: tamperedBody,
      signatureHeader,
      // No payload hash header so we hit the signature mismatch path, not
      // the payload-hash mismatch path.
      payloadHashHeader: null,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("signature_mismatch")
  })

  it("rejects when signed with a different key", async () => {
    const rawBody = canonicalJsonStringify(FIXTURE_BODY_OBJECT)
    const wrongKey = "different-signing-key-must-not-validate-against-fixture"
    const sig = await signEventPayload(wrongKey, rawBody)
    const result = await verifyOrgEventWebhookSignature({
      resolution: FIXTURE_RESOLUTION,
      rawBody,
      signatureHeader: `${ORG_EVENT_SIGNATURE_VERSION}=${sig}`,
      payloadHashHeader: null,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("signature_mismatch")
  })

  it("treats hex case insensitively for the signature value", async () => {
    // `signEventPayload` returns lowercase hex; some bureau implementations
    // upper-case it. Verifier must accept both via .toLowerCase() coercion.
    const rawBody = canonicalJsonStringify(FIXTURE_BODY_OBJECT)
    const sig = await signEventPayload(SIGNING_KEY, rawBody)
    const result = await verifyOrgEventWebhookSignature({
      resolution: FIXTURE_RESOLUTION,
      rawBody,
      signatureHeader: `${ORG_EVENT_SIGNATURE_VERSION}=${sig.toUpperCase()}`,
      payloadHashHeader: null,
    })
    expect(result.ok).toBe(true)
  })
})

describe("canonicalJsonStringify — sender/receiver key-ordering invariant", () => {
  it("produces the same bytes regardless of input key order", () => {
    const senderOrder = canonicalJsonStringify({
      a: 1,
      b: { x: 1, y: 2 },
      c: [1, 2, 3],
    })
    const receiverOrder = canonicalJsonStringify({
      c: [1, 2, 3],
      b: { y: 2, x: 1 },
      a: 1,
    })
    expect(senderOrder).toBe(receiverOrder)
  })

  it("preserves array element order (arrays are not sorted, only object keys)", () => {
    const result = canonicalJsonStringify([3, 1, 2])
    expect(result).toBe("[3,1,2]")
  })
})

describe("ORG_EVENT_SIGNATURE_VERSION", () => {
  it("currently exposes v1 (HMAC-SHA256)", () => {
    // Bumping this value REQUIRES coordinated bureau migration. Tests are
    // here to make any accidental bump impossible to merge silently.
    expect(ORG_EVENT_SIGNATURE_VERSION).toBe("v1")
  })
})
