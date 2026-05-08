import { AuthPageFrame } from "#components/auth/auth-page-frame"
import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
import { getEnabledSocialProviderIds } from "#lib/auth/social-providers-env.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

import { SignInForm } from "./sign-in-form"

function firstQueryValue(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v
  if (Array.isArray(v)) return v[0]
  return undefined
}

/** Prefill only; auth is unchanged. Caps length to avoid log noise. */
function parsePrefillEmail(
  raw: string | string[] | undefined
): string | undefined {
  const s = firstQueryValue(raw)?.trim().slice(0, 320)
  if (!s?.includes("@")) return undefined
  return s
}

export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const prefillEmail = parsePrefillEmail(sp.email)
  const raw = sp.callbackUrl
  const q =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined
  const postAuthPath = resolvePostAuthCallbackUrl(
    q,
    toLocalePath(locale, "/account")
  )
  const stepRaw = sp.stepUp
  const stepUp =
    stepRaw === "1" ||
    stepRaw === "true" ||
    (Array.isArray(stepRaw) && stepRaw.some((v) => v === "1" || v === "true"))
  const enabledSocialProviders = getEnabledSocialProviderIds()

  return (
    <AuthPageFrame>
      <SignInForm
        key={prefillEmail ? `prefill:${prefillEmail}` : "sign-in-v2"}
        postAuthPath={postAuthPath}
        stepUp={stepUp}
        initialEmail={prefillEmail}
        enabledSocialProviders={enabledSocialProviders}
      />
    </AuthPageFrame>
  )
}
