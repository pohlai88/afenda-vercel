import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import { getEnabledSocialProviderIds } from "#lib/auth/social-providers-env.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

import {
  parsePostAuthPath,
  parsePrefillEmail,
  parseStepUp,
} from "#lib/auth/auth-flow.shared"
import { SignInForm } from "#components2/auth/sign-in-form.client"

export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const prefillEmail = parsePrefillEmail(sp.email)
  // Default lands at the org resolver which redirects to Nexus when an org is active.
  // Users without an active org receive ORG_REQUIRED → primary CTA `/console` (loading bay).
  // See AGENTS.md §5 and docs/decisions/0003-post-login-loading-bay-nexus.md.
  const postAuthPath = parsePostAuthPath(
    sp.callbackUrl,
    toLocalePath(locale, "/o")
  )
  const stepUp = parseStepUp(sp.stepUp)
  const enabledSocialProviders = getEnabledSocialProviderIds()

  return (
    <AuthPageFrame>
      <SignInForm
        key={prefillEmail ? `prefill:${prefillEmail}` : "sign-in-v2"}
        postAuthPath={postAuthPath}
        stepUp={stepUp}
        initialEmail={prefillEmail}
        enabledSocialProviders={enabledSocialProviders}
        initialMode="sign-in"
      />
    </AuthPageFrame>
  )
}
