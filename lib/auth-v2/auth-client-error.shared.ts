export const AUTH_CLIENT_ERROR_CODE = {
  UNKNOWN: "unknown",
  INVALID_CREDENTIALS: "invalid_credentials",
  EMAIL_NOT_VERIFIED: "email_not_verified",
  RATE_LIMITED: "rate_limited",
} as const

export type AuthClientErrorCode =
  (typeof AUTH_CLIENT_ERROR_CODE)[keyof typeof AUTH_CLIENT_ERROR_CODE]

export type NormalizedAuthClientError = {
  code: AuthClientErrorCode
  message: string
}

export function normalizeAuthClientError(
  err: unknown
): NormalizedAuthClientError {
  const fallback: NormalizedAuthClientError = {
    code: AUTH_CLIENT_ERROR_CODE.UNKNOWN,
    message: "Authentication failed. Please try again.",
  }

  if (!err || typeof err !== "object") return fallback
  const e = err as { message?: string; code?: string; status?: number }
  const msg = String(e.message ?? "").toLowerCase()
  if (msg.includes("invalid") || msg.includes("credential")) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.INVALID_CREDENTIALS,
      message: "Invalid credentials.",
    }
  }
  if (msg.includes("verify") || msg.includes("unverified")) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.EMAIL_NOT_VERIFIED,
      message: "Please verify your email before signing in.",
    }
  }
  if (e.status === 429 || msg.includes("rate")) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.RATE_LIMITED,
      message: "Too many attempts. Please wait and try again.",
    }
  }

  return {
    code: AUTH_CLIENT_ERROR_CODE.UNKNOWN,
    message: e.message || fallback.message,
  }
}
