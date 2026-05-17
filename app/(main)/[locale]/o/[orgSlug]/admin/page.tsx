import { getTranslations } from "next-intl/server"

import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { Link } from "#i18n/navigation"

import { organizationAdminPath } from "#features/org-admin"
import { recordOrgAdminPageVisit } from "#features/org-admin/server"

import {
  fetchOrgAdminMembers,
  fetchOrgAdminPendingInvitations,
} from "#lib/auth"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { requireOrgSession } from "#lib/auth"

export default async function OrgAdminOverviewPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin">) {
  const { orgSlug } = await params
  const t = await getTranslations("OrgAdmin.overview")
  const orgSession = await requireOrgSession()
  const [members, invitations] = await Promise.all([
    fetchOrgAdminMembers(orgSession.organizationId),
    fetchOrgAdminPendingInvitations(orgSession.organizationId),
  ])

  // Working Memory Rail — record this page in the operator's recents.
  // Best-effort, deferred via `after()`; never blocks the page render.
  await recordOrgAdminPageVisit({
    orgSession,
    orgSlug,
    segment: "overview",
  })

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
              <Link href={organizationAdminPath(orgSlug, "members")}>
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
              <Link href={organizationAdminPath(orgSlug, "members")}>
                {t("viewInvites")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("accessCardTitle")}</CardTitle>
            <CardDescription>{t("accessCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("accessCardBody")}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={organizationAdminPath(orgSlug, "access")}>
                {t("openAccess")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" asChild>
          <Link href={organizationDashboardPath(orgSlug, "home")}>
            {t("backToErp")}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={organizationAdminPath(orgSlug, "audit")}>
            {t("openAudit")}
          </Link>
        </Button>
      </div>
    </div>
  )
}
