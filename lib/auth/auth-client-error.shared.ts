/**
 * Stable codes and copy for Better Auth client errors (sign-in, OTP, magic link).
 * Server-side interruptions use `AUTH_STATUS` + `resolveAuthStatusContent` instead.
 */
export const AUTH_CLIENT_ERROR_CODE = {
  INVALID_CREDENTIALS: "invalid_credentials",
  RATE_LIMITED: "rate_limited",
  EMAIL_NOT_VERIFIED: "email_not_verified",
  INVALID_OTP: "invalid_otp",
  MFA_REQUIRED: "mfa_required",
  NETWORK: "network",
  UNKNOWN: "unknown",
} as const

export type AuthClientErrorCode =
  (typeof AUTH_CLIENT_ERROR_CODE)[keyof typeof AUTH_CLIENT_ERROR_CODE]

export type AuthClientErrorHint = "email" | "password" | "otp" | "general"

export type NormalizedAuthClientError = {
  code: AuthClientErrorCode
  message: string
  fieldHint: AuthClientErrorHint
}

const MAX_MESSAGE_LEN = 200

function trimMessage(raw: string): string {
  const t = raw.trim()
  if (t.length <= MAX_MESSAGE_LEN) return t
  return `${t.slice(0, MAX_MESSAGE_LEN - 1)}…`
}

/**
 * Map provider/SDK strings to non-hostile copy and a11y field hints.
 */
export function normalizeAuthClientError(
  message: string | null | undefined
): NormalizedAuthClientError {
  const raw = trimMessage(message ?? "")
  const lower = raw.toLowerCase()

  if (!raw) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.UNKNOWN,
      message: "Something went wrong. Try again.",
      fieldHint: "general",
    }
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("load failed") ||
    lower === "typeerror: failed to fetch"
  ) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.NETWORK,
      message: "Connection problem. Check your network and try again.",
      fieldHint: "general",
    }
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("too many attempt")
  ) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.RATE_LIMITED,
      message: "Too many attempts. Wait a few minutes, then try again.",
      fieldHint: "general",
    }
  }

  if (
    lower.includes("email not verified") ||
    lower.includes("verify your email") ||
    lower.includes("unverified") ||
    (lower.includes("email") && lower.includes("not verified"))
  ) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.EMAIL_NOT_VERIFIED,
      message:
        "Confirm your email before signing in. Check your inbox or open Account settings.",
      fieldHint: "email",
    }
  }

  if (
    lower.includes("invalid otp") ||
    lower.includes("invalid code") ||
    lower.includes("wrong code") ||
    lower.includes("expired code") ||
    (lower.includes("otp") &&
      (lower.includes("invalid") || lower.includes("expired")))
  ) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.INVALID_OTP,
      message: "That code did not work. Request a new code or check for typos.",
      fieldHint: "otp",
    }
  }

  if (
    lower.includes("two-factor") ||
    lower.includes("two factor") ||
    lower.includes("2fa") ||
    lower.includes("totp") ||
    lower.includes("authenticator") ||
    lower.includes("second factor") ||
    lower.includes("mfa required") ||
    lower.includes("multi-factor")
  ) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.MFA_REQUIRED,
      message:
        "Your account requires a second step. Sign in with a method that supports your authenticator app, or complete 2FA from Account → Security.",
      fieldHint: "general",
    }
  }

  if (
    lower.includes("invalid credentials") ||
    lower.includes("incorrect password") ||
    lower.includes("wrong password") ||
    (lower.includes("invalid") &&
      (lower.includes("email") || lower.includes("password"))) ||
    lower.includes("user not found")
  ) {
    return {
      code: AUTH_CLIENT_ERROR_CODE.INVALID_CREDENTIALS,
      message:
        "Email or password does not match. Try again or use Forgot password.",
      fieldHint: "password",
    }
  }

  return {
    code: AUTH_CLIENT_ERROR_CODE.UNKNOWN,
    message: raw,
    fieldHint: "general",
  }
}
