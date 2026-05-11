import { getTranslations } from "next-intl/server"

import { Button } from "#components/ui/button"
import { SignOutButton } from "#components/sign-out-button"
import { Link } from "#i18n/navigation"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { organizationNexusPath } from "#features/nexus"

import { getAccountShellData } from "./_components/account-shell-data.server"
import {
  AccountContextBand,
  AccountSurface,
} from "./_components/account-surface"

export const dynamic = "force-dynamic"

function formatRecentTimestamp(
  locale: string,
  value: Date | string | null | undefined
) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export default async function AccountIndexPage({
  params,
}: PageProps<"/[locale]/account">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations("AccountSurface")
  const shellData = await getAccountShellData()

  const workspaceHref = shellData.activeOrganization
    ? toLocalePath(
        locale,
        organizationNexusPath(shellData.activeOrganization.slug)
      )
    : toLocalePath(locale, "/o")

  const nextItems = [
    t("overview.next.addPasskey"),
    shellData.summary.sessionCount > 1
      ? t("overview.next.reviewSessions")
      : t("overview.next.confirmSessions"),
    shellData.activeOrganization
      ? t("overview.next.returnWorkspace", {
          workspace: shellData.activeOrganization.name,
        })
      : t("overview.next.openWorkspace"),
  ]

  const recentItems = shellData.securityActivity.slice(0, 3)

  return (
    <AccountSurface
      breadcrumbs={[
        { label: t("breadcrumbs.personal"), href: "/account" },
        { label: t("overview.title") },
      ]}
      title={t("overview.title")}
      subtitle={t("overview.subtitle")}
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/account/identity">
              {t("overview.actions.identity")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account/security#sessions">
              {t("overview.actions.manageSessions")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account/security#passkeys">
              {t("overview.actions.addPasskey")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={workspaceHref}>
              {t("overview.actions.openWorkspace")}
            </Link>
          </Button>
          <SignOutButton variant="outline" size="default">
            {t("overview.actions.signOut")}
          </SignOutButton>
        </>
      }
    >
      <AccountContextBand label={t("overview.nowLabel")}>
        <div className="space-y-2 text-sm leading-6 text-foreground">
          <p>
            {t("overview.now.signedInAs", {
              email: shellData.summary.email,
            })}
          </p>
          <p>
            {shellData.summary.emailVerified
              ? t("overview.now.emailVerified")
              : t("overview.now.emailPending")}
          </p>
          <p>
            {t("overview.now.sessionSummary", {
              count: shellData.summary.sessionCount,
            })}
          </p>
          <p>
            {shellData.activeOrganization
              ? t("overview.now.workspaceActive", {
                  workspace: shellData.activeOrganization.name,
                })
              : t("overview.now.workspaceMissing")}
          </p>
        </div>
      </AccountContextBand>

      <AccountContextBand label={t("overview.nextLabel")}>
        <ul className="space-y-2 text-sm leading-6 text-foreground">
          {nextItems.map((item) => (
            <li key={item} className="pl-4 -indent-4">
              {item}
            </li>
          ))}
        </ul>
      </AccountContextBand>

      <AccountContextBand label={t("overview.recentLabel")}>
        {recentItems.length > 0 ? (
          <ul className="space-y-3 text-sm">
            {recentItems.map((item) => (
              <li key={item.id} className="space-y-1">
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-muted-foreground">
                  {formatRecentTimestamp(locale, item.createdAt)}
                  {item.path ? ` · ${item.path}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("overview.recentEmpty")}
          </p>
        )}
      </AccountContextBand>
    </AccountSurface>
  )
}
