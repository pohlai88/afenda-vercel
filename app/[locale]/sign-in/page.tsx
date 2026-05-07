import { getEnabledSocialProviderIds } from "#lib/auth/accounts.server"
import { AuthPageFrame } from "#components/auth/auth-page-frame"
import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"

import { SignInForm } from "./sign-in-form"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[] | undefined
    stepUp?: string | string[] | undefined
  }>
}) {
  const sp = await searchParams
  const raw = sp.callbackUrl
  const q =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined
  const postAuthPath = resolvePostAuthCallbackUrl(q)
  const stepRaw = sp.stepUp
  const stepUp =
    stepRaw === "1" ||
    stepRaw === "true" ||
    (Array.isArray(stepRaw) && stepRaw.some((v) => v === "1" || v === "true"))
  const enabledSocialProviders = getEnabledSocialProviderIds()

  return (
    <AuthPageFrame>
      <SignInForm
        postAuthPath={postAuthPath}
        stepUp={stepUp}
        enabledSocialProviders={enabledSocialProviders}
      />
    </AuthPageFrame>
  )
}
