import "server-only"

import { getTranslations } from "next-intl/server"

import { toLocalePath, type AppLocale } from "#lib/i18n/locales.shared"

import { AUTH_STATUS, type AuthStatusCode } from "./auth-status.shared"

export type AuthResultVariant = "neutral" | "warning" | "destructive"

export type AuthStatusResolvedContent = {
  variant: AuthResultVariant
  title: string
  description: string
  trustNote?: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
}

function signInHref(
  locale: AppLocale,
  callbackPath: string,
  opts?: { stepUp?: boolean }
): string {
  const q = new URLSearchParams()
  q.set("callbackUrl", callbackPath)
  if (opts?.stepUp) q.set("stepUp", "1")
  return `${toLocalePath(locale, "/sign-in")}?${q.toString()}`
}

export type ResolveAuthStatusContentOptions = {
  locale: AppLocale
  callbackUrl: string
  context?: string
}

/**
 * Map a canonical status code to calm, operational copy and default CTAs.
 * Callers may still override strings in the UI when needed.
 */
export async function resolveAuthStatusContent(
  code: AuthStatusCode,
  options: ResolveAuthStatusContentOptions
): Promise<AuthStatusResolvedContent> {
  const { locale, callbackUrl, context } = options
  const t = await getTranslations({ locale, namespace: "AuthStatus" })
  const primaryHref = signInHref(locale, callbackUrl)
  const secondaryHref = toLocalePath(locale, "/")
  const secondaryLabel = t("goHome")
  switch (code) {
    case AUTH_STATUS.SESSION_EXPIRED:
      return {
        variant: "warning",
        title: t("session_expired.title"),
        description: context
          ? t("session_expired.descriptionWithContext", {
              context,
            })
          : t("session_expired.description"),
        trustNote: t("session_expired.trustNote"),
        primaryLabel: t("session_expired.primary"),
        primaryHref,
        secondaryLabel,
        secondaryHref,
      }
    case AUTH_STATUS.STEP_UP_REQUIRED:
      return {
        variant: "warning",
        title: t("step_up_required.title"),
        description: t("step_up_required.description"),
        trustNote: t("step_up_required.trustNote"),
        primaryLabel: t("step_up_required.primary"),
        primaryHref: signInHref(locale, callbackUrl, { stepUp: true }),
        secondaryLabel,
        secondaryHref,
      }
    case AUTH_STATUS.MFA_REQUIRED:
      return {
        variant: "warning",
        title: t("mfa_required.title"),
        description: t("mfa_required.description"),
        trustNote: t("mfa_required.trustNote"),
        primaryLabel: t("mfa_required.primary"),
        primaryHref,
        secondaryLabel,
        secondaryHref,
      }
    case AUTH_STATUS.EMAIL_UNVERIFIED:
      return {
        variant: "neutral",
        title: t("email_unverified.title"),
        description: t("email_unverified.description"),
        trustNote: t("email_unverified.trustNote"),
        primaryLabel: t("email_unverified.primary"),
        primaryHref: toLocalePath(locale, "/verify-email"),
        secondaryLabel,
        secondaryHref,
      }
    case AUTH_STATUS.ORG_REQUIRED:
      return {
        variant: "neutral",
        title: t("org_required.title"),
        description: t("org_required.description"),
        trustNote: t("org_required.trustNote"),
        primaryLabel: t("org_required.primary"),
        primaryHref: toLocalePath(locale, "/console"),
        secondaryLabel,
        secondaryHref,
      }
    case AUTH_STATUS.INVITATION_EXPIRED:
      return {
        variant: "destructive",
        title: t("invitation_expired.title"),
        description: t("invitation_expired.description"),
        primaryLabel: t("invitation_expired.primary"),
        primaryHref,
        secondaryLabel,
        secondaryHref,
      }
    case AUTH_STATUS.RATE_LIMITED:
      return {
        variant: "warning",
        title: t("rate_limited.title"),
        description: t("rate_limited.description"),
        trustNote: t("rate_limited.trustNote"),
        primaryLabel: t("rate_limited.primary"),
        primaryHref,
        secondaryLabel,
        secondaryHref,
      }
    case AUTH_STATUS.SIGN_IN_FAILED:
      return {
        variant: "warning",
        title: t("sign_in_failed.title"),
        description: t("sign_in_failed.description"),
        primaryLabel: t("sign_in_failed.primary"),
        primaryHref,
        secondaryLabel,
        secondaryHref,
      }
    case AUTH_STATUS.UNKNOWN_FAILURE:
      return {
        variant: "warning",
        title: t("unknown_failure.title"),
        description: t("unknown_failure.description"),
        primaryLabel: t("unknown_failure.primary"),
        primaryHref,
        secondaryLabel,
        secondaryHref,
      }
  }
}

/** `<title>` for interruption routes (`/verify-email`, `/session-expired`) from `VerifyEmail.meta.*`. */
export async function resolveAuthInterruptionMetaTitle(
  locale: AppLocale,
  code: AuthStatusCode
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "VerifyEmail" })
  const meta: Record<AuthStatusCode, () => string> = {
    [AUTH_STATUS.EMAIL_UNVERIFIED]: () => t("meta.email_unverified"),
    [AUTH_STATUS.SESSION_EXPIRED]: () => t("meta.session_expired"),
    [AUTH_STATUS.STEP_UP_REQUIRED]: () => t("meta.step_up_required"),
    [AUTH_STATUS.MFA_REQUIRED]: () => t("meta.mfa_required"),
    [AUTH_STATUS.ORG_REQUIRED]: () => t("meta.org_required"),
    [AUTH_STATUS.INVITATION_EXPIRED]: () => t("meta.invitation_expired"),
    [AUTH_STATUS.RATE_LIMITED]: () => t("meta.rate_limited"),
    [AUTH_STATUS.SIGN_IN_FAILED]: () => t("meta.sign_in_failed"),
    [AUTH_STATUS.UNKNOWN_FAILURE]: () => t("meta.unknown_failure"),
  }
  return meta[code]()
}
