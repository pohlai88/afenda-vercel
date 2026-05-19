import { getTranslations } from "next-intl/server"
import Link from "next/link"

import { organizationNexusPath } from "#features/nexus"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export default async function OrgIamProfileNotFound({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations("IamProfileSurface.notFound")

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <div className="flex flex-wrap justify-center gap-2 text-sm">
        <Link
          href={toLocalePath(locale, organizationIamProfilePath(orgSlug))}
          className="underline"
        >
          {t("personalLink")}
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link
          href={toLocalePath(locale, organizationNexusPath(orgSlug))}
          className="underline"
        >
          {t("workspaceLink")}
        </Link>
      </div>
    </main>
  )
}
