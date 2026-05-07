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
import type { AuthStatusCode } from "#lib/auth"
import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

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
    AUTH_STATUS.SESSION_EXPIRED
  return {
    title: await resolveAuthInterruptionMetaTitle(locale, code),
  }
}

export default async function SessionExpiredPage({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const code = (parseAuthStatusParam(sp[AUTH_STATUS_QUERY_KEY]) ??
    AUTH_STATUS.SESSION_EXPIRED) satisfies AuthStatusCode
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
