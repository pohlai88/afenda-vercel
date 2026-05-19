import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import { ForgotPasswordForm } from "#components2/auth/forgot-password-form.client"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export async function generateMetadata({
  params,
}: Pick<PageProps<"/[locale]/forgot-password">, "params">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations({ locale, namespace: "Auth" })

  return {
    title: t("forgotPassword"),
    openGraph: { title: `${t("forgotPassword")} | ${SITE_NAME}` },
  }
}

export default function ForgotPasswordPage() {
  return (
    <AuthPageFrame>
      <ForgotPasswordForm />
    </AuthPageFrame>
  )
}
