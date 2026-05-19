import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import {
  parsePostAuthPath,
  parsePrefillEmail,
} from "#lib/auth/auth-flow.shared"
import { VerifyEmailForm } from "#components2/auth/verify-email-form.client"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export async function generateMetadata({
  params,
}: Pick<PageProps<"/[locale]/verify-email">, "params">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations({ locale, namespace: "VerifyEmail" })

  return {
    title: t("title"),
    openGraph: { title: `${t("title")} | ${SITE_NAME}` },
  }
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/verify-email">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const postAuthPath = parsePostAuthPath(
    sp.callbackUrl,
    toLocalePath(locale, "/o")
  )
  const initialEmail = parsePrefillEmail(sp.email)

  return (
    <AuthPageFrame>
      <VerifyEmailForm
        initialEmail={initialEmail}
        postAuthPath={postAuthPath}
      />
    </AuthPageFrame>
  )
}
