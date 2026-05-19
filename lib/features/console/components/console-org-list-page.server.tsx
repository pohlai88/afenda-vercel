import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

import { ConsoleBootstrapForm } from "#components2/console/console-bootstrap-form.client"
import { AfendaBrandLockup } from "#components2/afenda-brand"
import { Button } from "#components2/ui/button"
import { organizationNexusPath } from "#features/nexus"
import { prepareOrganizationSlugAction } from "#features/org-admin"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { Link } from "#i18n/navigation"

import { resolveConsoleOrgContext } from "../data/console-org-context.server"
import { ConsolePendingInvitesSection } from "./console-pending-invites-section.server"

type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Tier B: org membership list + single-org shortcut redirect + no-org loading bay
 * (pending invites + first-org bootstrap). Streams behind Suspense in console/page.tsx.
 */
export default async function ConsoleOrgListPage({ params }: Props) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const context = await resolveConsoleOrgContext(locale)

  if (context.kind === "redirect") {
    redirect(context.href as Route)
  }

  const t = await getTranslations("Console")

  if (context.kind === "no-orgs") {
    return (
      <div className="flex flex-1 flex-col items-center px-4 py-16">
        <div className="w-full max-w-xl space-y-10">
          <div className="space-y-2">
            <AfendaBrandLockup className="h-8 w-auto" />
            <p className="text-sm text-muted-foreground">
              {t("subtitleNoOrgs")}
            </p>
          </div>
          <ConsolePendingInvitesSection userEmail={context.session.email} />
          <ConsoleBootstrapForm
            prepareSlugAction={prepareOrganizationSlugAction}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="w-full max-w-xl space-y-10">
        <div className="space-y-2">
          <AfendaBrandLockup className="h-8 w-auto" />
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <section aria-label={t("orgsLabel")}>
          <h1 className="mb-4 text-lg font-semibold">{t("orgsLabel")}</h1>
          <ul className="space-y-3">
            {context.orgs.map((org) => (
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
                  <Link href={organizationNexusPath(org.slug)}>
                    {t("open")}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
