import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import { getEnabledSocialProviderIds } from "#lib/auth/social-providers-env.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

import { parsePostAuthPath, parsePrefillEmail } from "#lib/auth/auth-flow.shared"
import { SignInForm } from "#components2/auth/sign-in-form.client"

export async function generateMetadata({
  params,
}: Pick<PageProps<"/[locale]/sign-up">, "params">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations({ locale, namespace: "Auth" })

  return {
    title: t("titleSignUp"),
    openGraph: { title: `${t("titleSignUp")} | ${SITE_NAME}` },
  }
}

export default async function SignUpPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-up">) {
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
      <SignInForm
        postAuthPath={postAuthPath}
        initialEmail={initialEmail}
        enabledSocialProviders={getEnabledSocialProviderIds()}
        initialMode="sign-up"
        lockMode
      />
    </AuthPageFrame>
  )
}
