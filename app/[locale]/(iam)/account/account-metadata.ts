import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

type LocaleParams = Promise<{ locale: string }>

type AccountOrbitSurface =
  | "queue"
  | "triage"
  | "today"
  | "timeline"
  | "signals"
  | "sessions"
  | "links"

async function resolveLocale(params: LocaleParams) {
  const { locale: localeRaw } = await params
  return ensureAppLocale(localeRaw)
}

function buildPrivateSurfaceMetadata(title: string): Metadata {
  return {
    title,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
    },
  }
}

export async function generateAccountOverviewMetadata(
  params: LocaleParams
): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: "AccountSurface" })
  return buildPrivateSurfaceMetadata(t("overview.title"))
}

export async function generateAccountIdentityMetadata(
  params: LocaleParams
): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({
    locale,
    namespace: "AccountSurface.identity",
  })
  return buildPrivateSurfaceMetadata(t("title"))
}

export async function generateAccountSecurityMetadata(
  params: LocaleParams
): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({
    locale,
    namespace: "AccountSurface.security",
  })
  return buildPrivateSurfaceMetadata(t("title"))
}

export async function generateAccountOrbitMetadata(
  params: LocaleParams,
  surface: AccountOrbitSurface
): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: "Dashboard.Orbit" })
  return buildPrivateSurfaceMetadata(t(`surfaces.${surface}.title` as never))
}
