import type { Route } from "next"

import { getTranslations } from "next-intl/server"

import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { Link } from "#i18n/navigation"

import { organizationAdminPath } from "#features/org-admin"

import {
  fetchOrgWorkbenchMembers,
  fetchOrgWorkbenchPendingInvitations,
} from "#lib/auth"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { requireOrgSession } from "#lib/tenant"

export default async function OrgAdminOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const t = await getTranslations("OrgAdmin.overview")
  const orgSession = await requireOrgSession()
  const [members, invitations] = await Promise.all([
    fetchOrgWorkbenchMembers(orgSession.organizationId),
    fetchOrgWorkbenchPendingInvitations(orgSession.organizationId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("membersCardTitle")}</CardTitle>
            <CardDescription>{t("membersCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-3xl font-semibold tabular-nums">
              {members.length}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={organizationAdminPath(orgSlug, "members") as Route}>
                {t("manageMembers")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("invitesCardTitle")}</CardTitle>
            <CardDescription>{t("invitesCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-3xl font-semibold tabular-nums">
              {invitations.length}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={organizationAdminPath(orgSlug, "members") as Route}>
                {t("viewInvites")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" asChild>
          <Link href={organizationDashboardPath(orgSlug, "home") as Route}>
            {t("backToErp")}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={organizationAdminPath(orgSlug, "audit") as Route}>
            {t("openAudit")}
          </Link>
        </Button>
      </div>
    </div>
  )
}
