import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

import {
  buildVerifyEmailHref,
  parsePostAuthPath,
  parsePrefillEmail,
} from "../auth-flow.shared"
import { CheckEmailClient } from "#components2/auth/check-email-client"

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
