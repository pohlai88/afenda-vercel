import "server-only"

import { headers } from "next/headers"

import { db } from "#lib/db"
import { iamAuditEvent } from "#lib/db/schema"

export type WriteIamAuditEventInput = {
  action: string
  actorUserId?: string | null
  actorSessionId?: string | null
  organizationId?: string | null
  resourceType?: string | null
  resourceId?: string | null
  path?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}

function clientIpFromHeaders(headers: Headers | undefined): string | null {
  if (!headers) return null
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return null
}

function userAgentFromHeaders(headers: Headers | undefined): string | null {
  const raw = headers?.get("user-agent")
  if (!raw) return null
  const t = raw.trim()
  return t.length > 0 ? t : null
}

/**
 * Best-effort audit insert. Never throws to callers (logs in development only).
 */
export async function writeIamAuditEvent(
  input: WriteIamAuditEventInput
): Promise<void> {
  try {
    const metadata =
      input.metadata && Object.keys(input.metadata).length > 0
        ? JSON.stringify(input.metadata)
        : null
    await db.insert(iamAuditEvent).values({
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      actorSessionId: input.actorSessionId ?? null,
      organizationId: input.organizationId ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      path: input.path ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata,
    })
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[iam_audit_event] write failed:", err)
    }
  }
}

/** Headers from a Better Auth hook / Request-like object. */
export function writeIamAuditEventFromHeaders(
  headers: Headers | undefined,
  input: Omit<WriteIamAuditEventInput, "ipAddress" | "userAgent"> &
    Partial<Pick<WriteIamAuditEventInput, "ipAddress" | "userAgent">>
): Promise<void> {
  return writeIamAuditEvent({
    ...input,
    ipAddress: input.ipAddress ?? clientIpFromHeaders(headers),
    userAgent: input.userAgent ?? userAgentFromHeaders(headers),
  })
}

function pathFromIncomingHeaders(h: Headers): string | null {
  const referer = h.get("referer")?.trim()
  if (referer) {
    try {
      return new URL(referer).pathname || null
    } catch {
      return null
    }
  }
  return null
}

/**
 * Server Actions / RSC: enrich audit rows with IP, user-agent, and path (from Referer pathname).
 */
export async function writeIamAuditEventFromNextHeaders(
  input: Omit<WriteIamAuditEventInput, "ipAddress" | "userAgent" | "path"> &
    Partial<Pick<WriteIamAuditEventInput, "ipAddress" | "userAgent" | "path">>
): Promise<void> {
  const h = await headers()
  const path = input.path ?? pathFromIncomingHeaders(h)
  return writeIamAuditEventFromHeaders(h, { ...input, path })
}

export function inferAuthMethodFromPath(path: string): string {
  if (path.startsWith("/callback/")) return "oauth_callback"
  switch (path) {
    case "/sign-in/email":
      return "password"
    case "/sign-up/email":
      return "sign_up_email"
    case "/sign-in/social":
      return "oauth"
    case "/sign-in/email-otp":
      return "email_otp"
    case "/sign-in/username":
      return "username"
    case "/magic-link/verify":
      return "magic_link"
    case "/passkey/verify-authentication":
      return "passkey"
    case "/two-factor/verify-totp":
      return "totp_2fa"
    case "/two-factor/verify-backup-code":
      return "backup_code_2fa"
    default:
      if (path.includes("passkey")) return "passkey"
      return "other"
  }
}

/**
 * Maps Better Auth endpoint paths to IAM audit actions when `newSession` is set.
 * OAuth completes on `/callback/:providerId`, not `/sign-in/social`.
 */
export function resolveIamSessionLifecycleAudit(path: string): {
  action: "iam.session.sign_in" | "iam.session.sign_up"
  method: string
} | null {
  if (path === "/sign-up/email") {
    return {
      action: "iam.session.sign_up",
      method: inferAuthMethodFromPath(path),
    }
  }
  const signInExact = new Set([
    "/sign-in/email",
    "/sign-in/social",
    "/sign-in/email-otp",
    "/sign-in/username",
    "/magic-link/verify",
    "/passkey/verify-authentication",
    "/two-factor/verify-totp",
    "/two-factor/verify-backup-code",
  ])
  if (signInExact.has(path) || path.startsWith("/callback/")) {
    return {
      action: "iam.session.sign_in",
      method: inferAuthMethodFromPath(path),
    }
  }
  return null
}
