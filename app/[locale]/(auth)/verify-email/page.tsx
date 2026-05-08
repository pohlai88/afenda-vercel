import { ensureAppLocale } from "#lib/i18n/locales.shared"

import { VerifyEmailForm } from "./verify-email-form"

export default async function VerifyEmailPage({
  params,
}: PageProps<"/[locale]/verify-email">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  return <VerifyEmailForm locale={locale} />
}
