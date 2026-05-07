import type { Route } from "next"

import { redirect } from "next/navigation"

import {
  AUTH_CONTEXT_QUERY_KEY,
  AUTH_STATUS,
  AUTH_STATUS_QUERY_KEY,
  AUTH_SUPPORT_REF_QUERY_KEY,
  parseAuthStatusParam,
  pickFirstParam,
  resolveAuthInterruptionMetaTitle,
  resolveAuthStatusContent,
  sanitizeAuthContext,
} from "#lib/auth"
import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

import { AuthPageFrame } from "#components/auth/auth-page-frame"
import { AuthResult } from "#components/auth/auth-result"

export async function generateMetadata({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const code =
    parseAuthStatusParam(sp[AUTH_STATUS_QUERY_KEY]) ??
    AUTH_STATUS.EMAIL_UNVERIFIED
  return {
    title: await resolveAuthInterruptionMetaTitle(locale, code),
  }
}

/**
 * Email verification and related auth status messaging. Defaults to
 * `email_unverified`; other `authStatus` values reuse the same shell as
 * `/session-expired` for bookmarkable deep links.
 */
export default async function VerifyEmailPage({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const rawStatus = parseAuthStatusParam(sp[AUTH_STATUS_QUERY_KEY])
  if (rawStatus === AUTH_STATUS.ORG_REQUIRED) {
    const q = new URLSearchParams()
    q.set(AUTH_STATUS_QUERY_KEY, AUTH_STATUS.ORG_REQUIRED)
    const cb = pickFirstParam(sp.callbackUrl)
    if (cb) q.set("callbackUrl", cb)
    const ctx = sanitizeAuthContext(sp[AUTH_CONTEXT_QUERY_KEY])
    if (ctx) q.set(AUTH_CONTEXT_QUERY_KEY, ctx)
    const ref = pickFirstParam(sp[AUTH_SUPPORT_REF_QUERY_KEY])
    if (ref) q.set(AUTH_SUPPORT_REF_QUERY_KEY, ref)
    redirect(
      `${toLocalePath(locale, "/session-expired")}?${q.toString()}` as Route
    )
  }

  const code = rawStatus ?? AUTH_STATUS.EMAIL_UNVERIFIED
  const callbackUrl = resolvePostAuthCallbackUrl(pickFirstParam(sp.callbackUrl))
  const context = sanitizeAuthContext(sp[AUTH_CONTEXT_QUERY_KEY])
  const supportRef = pickFirstParam(sp[AUTH_SUPPORT_REF_QUERY_KEY])

  const content = await resolveAuthStatusContent(code, {
    locale,
    callbackUrl,
    context,
  })

  return (
    <AuthPageFrame>
      <AuthResult
        variant={content.variant}
        title={content.title}
        description={content.description}
        trustNote={content.trustNote}
        primaryAction={{
          label: content.primaryLabel,
          href: content.primaryHref,
        }}
        secondaryAction={{
          label: content.secondaryLabel,
          href: content.secondaryHref,
        }}
        supportReference={supportRef}
      />
    </AuthPageFrame>
  )
}
