import type { Route } from "next"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

import { ConsoleBootstrapForm } from "#components/console/console-bootstrap-form"
import { ConsolePendingInvites } from "#components/console/console-pending-invites"
import { AfendaBrandLockup } from "#components/afenda-brand"
import { Button } from "#components/ui/button"
import { organizationNexusPath } from "#features/nexus"
import { prepareOrganizationSlugAction } from "#features/org-admin"
import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"
import { auth } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireSignedInSession } from "#lib/tenant"
import { Link } from "#i18n/navigation"

type Props = { locale: AppLocale }

/**
 * Tier B: org membership list + single-org shortcut redirect + no-org loading bay
 * (pending invites + first-org bootstrap). Streams behind Suspense in `console/page.tsx`.
 */
export async function ConsoleOrgListSlot({ locale }: Props) {
  const session = await requireSignedInSession()
  const [orgs, authSession] = await Promise.all([
    listUserOrganizationsForSwitcher(session.userId),
    auth.getSession({ fetchOptions: { headers: await headers() } }),
  ])

  const activeOrganizationId =
    (
      authSession.data?.session as {
        activeOrganizationId?: string | null
      } | null
    )?.activeOrganizationId ?? null
  const activeOrganization =
    orgs.find((org) => org.id === activeOrganizationId) ?? null

  if (activeOrganization) {
    redirect(
      toLocalePath(
        locale,
        organizationNexusPath(activeOrganization.slug)
      ) as Route
    )
  }

  if (orgs.length === 1 && orgs[0]) {
    // Single-org shortcut → Nexus root (operational origin field, not /dashboard).
    redirect(toLocalePath(locale, organizationNexusPath(orgs[0].slug)) as Route)
  }

  const t = await getTranslations("Console")

  if (orgs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center px-4 py-16">
        <div className="w-full max-w-xl space-y-10">
          <div className="space-y-2">
            <AfendaBrandLockup className="h-8 w-auto" />
            <p className="text-sm text-muted-foreground">
              {t("subtitleNoOrgs")}
            </p>
          </div>
          <ConsolePendingInvites userEmail={session.user.email} />
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
