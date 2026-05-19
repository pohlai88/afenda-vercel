import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import {
  buildVerifyEmailHref,
  parsePostAuthPath,
  parsePrefillEmail,
} from "#lib/auth/auth-flow.shared"
import { CheckEmailClient } from "#components2/auth/check-email-client"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export async function generateMetadata({
  params,
}: Pick<PageProps<"/[locale]/check-email">, "params">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations({ locale, namespace: "CheckEmail" })

  return {
    title: t("title"),
    openGraph: { title: `${t("title")} | ${SITE_NAME}` },
  }
}

export default async function CheckEmailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/check-email">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const email = parsePrefillEmail(sp.email)
  const postAuthPath = parsePostAuthPath(
    sp.callbackUrl,
    toLocalePath(locale, "/o")
  )
  const verifyHref = buildVerifyEmailHref({
    email,
    callbackUrl: postAuthPath,
  })

  return (
    <AuthPageFrame>
      <CheckEmailClient email={email} verifyHref={verifyHref} />
    </AuthPageFrame>
  )
}
