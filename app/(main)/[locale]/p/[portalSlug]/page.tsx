import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { employeePortalPath } from "#lib/portal"
import { requirePortalContext } from "#lib/portal/server"

type PortalHomePageProps = {
  params: Promise<{ locale: string; portalSlug: string }>
}

export default async function PortalHomePage({ params }: PortalHomePageProps) {
  const { locale: rawLocale, portalSlug } = await params
  const locale = ensureAppLocale(rawLocale)
  const context = await requirePortalContext(portalSlug)

  if (context.portalAudience === "employee" && context.subjectId) {
    redirect(
      toLocalePath(locale, employeePortalPath(context.portalSlug, "leave"))
    )
  }

  const t = await getTranslations("Portal.Root")

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("homeKicker")}</p>
        <h2 className="mt-2 text-xl font-semibold">
          {context.portalDisplayName}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t("homeDescription", { audience: context.portalAudience })}
        </p>
      </section>

      <section className="rounded-md border border-border p-6">
        <h3 className="text-base font-semibold">{t("homeServicesHeading")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("homeServicesEmpty")}
        </p>
      </section>
    </div>
  )
}
