/** Maps Better Auth HTTP paths to coarse sign-in method labels for IAM audit metadata. */
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

export type IamSessionLifecycleAudit = {
  action: "iam.session.sign_in" | "iam.session.sign_up"
  method: string
}

/**
 * Maps Better Auth endpoint paths to IAM audit actions when a new session is
 * established. OAuth completes on `/callback/:providerId`, not `/sign-in/social`.
 */
export function resolveIamSessionLifecycleAudit(
  path: string
): IamSessionLifecycleAudit | null {
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

/** Strips `/api/auth` prefix from a request pathname for lifecycle mapping. */
export function normalizeAuthApiPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "")
  const prefix = "/api/auth"
  if (trimmed === prefix) return "/"
  if (trimmed.startsWith(`${prefix}/`)) {
    return trimmed.slice(prefix.length) || "/"
  }
  return trimmed
}
