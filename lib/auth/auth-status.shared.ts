import { z } from "zod"

/**
 * Canonical auth interruption vocabulary for URLs, UI, audit metadata, and support.
 * Use only these string values — never ad hoc `?reason=` tokens.
 */
export const AUTH_STATUS = {
  SESSION_EXPIRED: "session_expired",
  MFA_REQUIRED: "mfa_required",
  EMAIL_UNVERIFIED: "email_unverified",
  INVITATION_EXPIRED: "invitation_expired",
  STEP_UP_REQUIRED: "step_up_required",
  ORG_REQUIRED: "org_required",
  RATE_LIMITED: "rate_limited",
  SIGN_IN_FAILED: "sign_in_failed",
  UNKNOWN_FAILURE: "unknown_failure",
} as const

export type AuthStatusCode = (typeof AUTH_STATUS)[keyof typeof AUTH_STATUS]

export const authStatusCodeSchema = z.enum([
  AUTH_STATUS.SESSION_EXPIRED,
  AUTH_STATUS.MFA_REQUIRED,
  AUTH_STATUS.EMAIL_UNVERIFIED,
  AUTH_STATUS.INVITATION_EXPIRED,
  AUTH_STATUS.STEP_UP_REQUIRED,
  AUTH_STATUS.ORG_REQUIRED,
  AUTH_STATUS.RATE_LIMITED,
  AUTH_STATUS.SIGN_IN_FAILED,
  AUTH_STATUS.UNKNOWN_FAILURE,
])

/** Single query key for interruption pages and redirects. */
export const AUTH_STATUS_QUERY_KEY = "authStatus" as const

/** Optional short workflow label (e.g. document id). Not for PII. */
export const AUTH_CONTEXT_QUERY_KEY = "context" as const

export const AUTH_SUPPORT_REF_QUERY_KEY = "ref" as const

export function parseAuthStatusParam(
  raw: string | string[] | null | undefined
): AuthStatusCode | null {
  if (raw == null) return null
  const v = typeof raw === "string" ? raw : raw[0]
  if (!v) return null
  const parsed = authStatusCodeSchema.safeParse(v.trim())
  return parsed.success ? parsed.data : null
}

export function sanitizeAuthContext(
  raw: string | string[] | null | undefined,
  maxLen = 200
): string | undefined {
  if (raw == null) return undefined
  const v = typeof raw === "string" ? raw : raw[0]
  if (!v) return undefined
  const t = v
    .replace(/[\r\n<>]+/g, " ")
    .trim()
    .slice(0, maxLen)
  return t.length ? t : undefined
}

export function pickFirstParam(
  raw: string | string[] | null | undefined
): string | undefined {
  if (raw == null) return undefined
  const v = typeof raw === "string" ? raw : raw[0]
  return v && v.trim() ? v : undefined
}
