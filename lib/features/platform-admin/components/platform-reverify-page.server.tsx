import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { StepUpReverifyShell } from "#components2/auth/step-up-reverify-shell"
import { parsePostAuthPath } from "#lib/auth/auth-flow.shared"
import { requireGlobalAdminSession } from "#lib/auth"
import { getEnabledSocialProviderIds } from "#lib/auth/social-providers-env.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

import { platformPath } from "../constants"

export default async function PlatformReverifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ callbackUrl?: string | string[] }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  await requireGlobalAdminSession()

  const sp = await searchParams
  const fallback = toLocalePath(locale, platformPath())
  const postAuthPath = parsePostAuthPath(sp.callbackUrl, fallback) as Route
  const enabledSocialProviders = getEnabledSocialProviderIds()
  const t = await getTranslations("PlatformAdmin.reverify")

  return (
    <StepUpReverifyShell
      title={t("title")}
      subtitle={t("subtitle")}
      postAuthPath={postAuthPath}
      formKey="platform-reverify"
      enabledSocialProviders={enabledSocialProviders}
    />
  )
}
