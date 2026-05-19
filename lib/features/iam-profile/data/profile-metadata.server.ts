import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

type LocaleRouteSegment = { locale: string }
type IamProfileRouteSegment = LocaleRouteSegment & { orgSlug: string }

type MetadataProps<T> = { params: Promise<T> }

async function resolveLocale(
  params: Promise<LocaleRouteSegment>
): Promise<ReturnType<typeof ensureAppLocale>> {
  const { locale: localeRaw } = await params
  return ensureAppLocale(localeRaw)
}

function buildPrivateSurfaceMetadata(title: string): Metadata {
  return {
    title,
    openGraph: { title: `${title} | ${SITE_NAME}` },
  }
}

export async function generateIamProfileOverviewMetadata({
  params,
}: MetadataProps<IamProfileRouteSegment>): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: "IamProfileSurface" })
  return buildPrivateSurfaceMetadata(t("overview.title"))
}

export async function generateIamProfileIdentityMetadata({
  params,
}: MetadataProps<IamProfileRouteSegment>): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({
    locale,
    namespace: "IamProfileSurface.identity",
  })
  return buildPrivateSurfaceMetadata(t("title"))
}

export async function generateIamProfileSecurityMetadata({
  params,
}: MetadataProps<IamProfileRouteSegment>): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({
    locale,
    namespace: "IamProfileSurface.security",
  })
  return buildPrivateSurfaceMetadata(t("title"))
}

export async function generateIamProfileReverifyMetadata({
  params,
}: MetadataProps<IamProfileRouteSegment>): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({
    locale,
    namespace: "IamProfileSurface.reverify",
  })
  return buildPrivateSurfaceMetadata(t("title"))
}
