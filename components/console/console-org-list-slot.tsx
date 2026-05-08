import type { Route } from "next"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { Button } from "#components/ui/button"
import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"
import type { AppLocale } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireSignedInSession } from "#lib/tenant"
import { Link } from "#i18n/navigation"

type Props = { locale: AppLocale }

/**
 * Tier B: org membership list + single-org shortcut redirect.
 * Streams behind Suspense in `app/[locale]/console/page.tsx`.
 */
export async function ConsoleOrgListSlot({ locale }: Props) {
  const session = await requireSignedInSession()
  const orgs = await listUserOrganizationsForSwitcher(session.userId)

  if (orgs.length === 1 && orgs[0]) {
    redirect(toLocalePath(locale, `/o/${orgs[0].slug}/dashboard`) as Route)
  }

  const t = await getTranslations("Console")

  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-16">
      <div className="w-full max-w-xl space-y-10">
        <div className="space-y-2">
          <AfendaBrandLockup className="h-8 w-auto" />
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <section aria-label={t("orgsLabel")}>
          <h1 className="mb-4 text-lg font-semibold">{t("orgsLabel")}</h1>
          {orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noOrgs")}</p>
          ) : (
            <ul className="space-y-3">
              {orgs.map((org) => (
                <li
                  key={org.id}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-card px-5 py-4 shadow-elevation-1"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{org.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                      {org.role}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/o/${org.slug}/dashboard`}>{t("open")}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
