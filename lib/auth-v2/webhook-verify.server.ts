import "server-only"

import { createPublicKey, verify } from "node:crypto"

type NeonWebhookPayload = {
  event_id: string
  event_type:
    | "send.otp"
    | "send.magic_link"
    | "user.before_create"
    | "user.created"
  user?: {
    id?: string
    email?: string
    name?: string
    email_verified?: boolean
  }
  event_data?: Record<string, unknown>
}

type JwkKey = {
  kid: string
  kty: string
  crv: string
  x: string
  alg?: string
  use?: string
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url")
}

export async function verifyNeonAuthWebhookSignature(
  rawBody: string,
  headers: Headers
): Promise<NeonWebhookPayload> {
  const signature = headers.get("x-neon-signature")
  const kid = headers.get("x-neon-signature-kid")
  const timestamp = headers.get("x-neon-timestamp")
  if (!signature || !kid || !timestamp) {
    throw new Error("Missing Neon signature headers")
  }

  const ts = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    throw new Error("Webhook timestamp is out of range")
  }

  const [headerB64, detachedPayload, signatureB64] = signature.split(".")
  if (!headerB64 || detachedPayload !== "" || !signatureB64) {
    throw new Error("Invalid detached JWS signature format")
  }

  const jwksUrl = `${process.env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`
  const response = await fetch(jwksUrl, { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Unable to fetch Neon JWKS")
  }
  const jwks = (await response.json()) as { keys?: JwkKey[] }
  const jwk = jwks.keys?.find((k) => k.kid === kid)
  if (!jwk) {
    throw new Error("Neon JWKS key not found")
  }

  const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url")
  const signaturePayload = `${timestamp}.${payloadB64}`
  const signingInput = `${headerB64}.${b64url(signaturePayload)}`

  const publicKey = createPublicKey({ key: jwk, format: "jwk" })
  const ok = verify(
    null,
    Buffer.from(signingInput),
    publicKey,
    Buffer.from(signatureB64, "base64url")
  )
  if (!ok) {
    throw new Error("Invalid Neon webhook signature")
  }

  return JSON.parse(rawBody) as NeonWebhookPayload
}
