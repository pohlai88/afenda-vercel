import type { Metadata } from "next"
import type { Route } from "next"

import { AuthPageFrame } from "#components/auth/auth-page-frame"
import { AuthResult } from "#components/auth/auth-result"
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
import {
  ensureAppLocale,
  stripLeadingLocalePrefix,
  toLocalePath,
} from "#lib/i18n/locales.shared"

/** Locale-prefixed hrefs from {@link resolveAuthStatusContent} → next-intl {@link Route}. */
function localeAwareHrefToRoute(href: string): Route {
  const qIdx = href.indexOf("?")
  const pathOnly = qIdx >= 0 ? href.slice(0, qIdx) : href
  const query = qIdx >= 0 ? href.slice(qIdx) : ""
  const stripped = stripLeadingLocalePrefix(pathOnly)
  const internal =
    stripped?.pathnameWithoutLocale ??
    (pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`)
  return `${internal}${query}` as Route
}

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
  return { title }
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
          href: localeAwareHrefToRoute(content.primaryHref),
        }}
        secondaryAction={{
          label: content.secondaryLabel,
          href: localeAwareHrefToRoute(content.secondaryHref),
        }}
        supportReference={pickFirstParam(sp[AUTH_SUPPORT_REF_QUERY_KEY])}
        className="w-full"
      />
    </AuthPageFrame>
  )
}
