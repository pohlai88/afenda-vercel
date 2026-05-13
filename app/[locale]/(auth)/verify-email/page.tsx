import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { parsePostAuthPath, parsePrefillEmail } from "../auth-flow.shared"
import { VerifyEmailForm } from "./verify-email-form"

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
    <VerifyEmailForm initialEmail={initialEmail} postAuthPath={postAuthPath} />
  )
}
