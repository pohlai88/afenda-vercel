import { ensureAppLocale } from "#lib/i18n/locales.shared"

import { SignUpForm } from "./sign-up-form"

export default async function SignUpPage({
  params,
}: PageProps<"/[locale]/sign-up">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  return <SignUpForm locale={locale} />
}
