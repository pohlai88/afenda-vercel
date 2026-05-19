import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { StepUpReverifyShell } from "#components2/auth/step-up-reverify-shell"
import { parsePostAuthPath } from "#lib/auth/auth-flow.shared"
import { requireSignedInSession } from "#lib/auth"
import { getEnabledSocialProviderIds } from "#lib/auth/social-providers-env.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"

export default async function IamProfileReverifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
  searchParams: Promise<{ callbackUrl?: string | string[] }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  await requireSignedInSession()

  const sp = await searchParams
  const fallback = toLocalePath(locale, organizationIamProfilePath(orgSlug))
  const postAuthPath = parsePostAuthPath(sp.callbackUrl, fallback) as Route
  const enabledSocialProviders = getEnabledSocialProviderIds()
  const t = await getTranslations("IamProfileSurface.reverify")

  return (
    <StepUpReverifyShell
      title={t("title")}
      subtitle={t("subtitle")}
      postAuthPath={postAuthPath}
      formKey={`reverify:${orgSlug}`}
      enabledSocialProviders={enabledSocialProviders}
    />
  )
}
