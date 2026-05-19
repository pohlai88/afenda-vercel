import type { Metadata } from "next"
import type { Route } from "next"

import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import { AuthResult } from "#components2/auth/auth-result"
import { localeAwarePathToClientRoute } from "#lib/auth/auth-flow.shared"
import {
  AUTH_CONTEXT_QUERY_KEY,
  AUTH_STATUS,
  AUTH_STATUS_QUERY_KEY,
  AUTH_SUPPORT_REF_QUERY_KEY,
  parseAuthStatusParam,
  pickFirstParam,
  sanitizeAuthContext,
} from "#lib/auth/auth-status.shared"
import {
  resolveAuthInterruptionMetaTitle,
  resolveAuthStatusContent,
} from "#lib/auth/auth-status-copy"
import { SITE_NAME } from "#lib/site"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export async function generateMetadata({
  params,
  searchParams,
}: Pick<
  PageProps<"/[locale]/session-expired">,
  "params" | "searchParams"
>): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const status =
    parseAuthStatusParam(sp[AUTH_STATUS_QUERY_KEY]) ??
    AUTH_STATUS.SESSION_EXPIRED
  const title = await resolveAuthInterruptionMetaTitle(locale, status)
  return {
    title,
    openGraph: { title: `${title} | ${SITE_NAME}` },
  }
}

export default async function SessionExpiredPage({
  params,
  searchParams,
}: PageProps<"/[locale]/session-expired">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const status =
    parseAuthStatusParam(sp[AUTH_STATUS_QUERY_KEY]) ??
    AUTH_STATUS.SESSION_EXPIRED
  const callbackUrl =
    pickFirstParam(sp.callbackUrl) ?? toLocalePath(locale, "/")
  const context = sanitizeAuthContext(sp[AUTH_CONTEXT_QUERY_KEY])
  const content = await resolveAuthStatusContent(status, {
    locale,
    callbackUrl,
    ...(context ? { context } : {}),
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
          href: localeAwarePathToClientRoute(content.primaryHref) as Route,
        }}
        secondaryAction={{
          label: content.secondaryLabel,
          href: localeAwarePathToClientRoute(content.secondaryHref) as Route,
        }}
        supportReference={pickFirstParam(sp[AUTH_SUPPORT_REF_QUERY_KEY])}
        className="w-full"
      />
    </AuthPageFrame>
  )
}
