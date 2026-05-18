import { Store } from "lucide-react"
import { getTranslations } from "next-intl/server"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Button } from "#components2/ui/button"
import {
  IntegrationsEndpointsPanel,
  IntegrationsImportsPanel,
  organizationAdminPath,
} from "#features/org-admin"
import { recordOrgAdminPageVisit } from "#features/org-admin/server"
import { organizationMarketplacePath } from "#features/marketplace"
import { Link } from "#i18n/navigation"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAdminIntegrationsPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/integrations">) {
  const { orgSlug } = await params
  const t = await getTranslations("OrgAdmin.integrations")
  const orgSession = await getOrgTenantContext()

  // Working Memory Rail — record this page in the operator's recents.
  await recordOrgAdminPageVisit({
    orgSession,
    orgSlug,
    segment: "integrations",
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <section className="space-y-3">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/35">
                <Store
                  className="size-5 text-foreground/80"
                  aria-hidden
                  strokeWidth={2}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle>{t("marketplaceLinkTitle")}</CardTitle>
                <CardDescription>
                  {t("marketplaceLinkDescription")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardFooter className="border-t border-border/50 pt-surface-md">
            <Button asChild variant="outline" size="sm">
              <Link href={organizationMarketplacePath(orgSlug, "admin")}>
                {t("marketplaceLinkAction")}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section className="space-y-3">
        <header>
          <h3 className="text-lg font-semibold tracking-tight">
            {t("sectionEndpointsTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("sectionEndpointsDescription")}
          </p>
        </header>
        <IntegrationsEndpointsPanel
          organizationId={orgSession.organizationId}
        />
      </section>

      <section className="space-y-3">
        <header>
          <h3 className="text-lg font-semibold tracking-tight">
            {t("sectionImportsTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("sectionImportsDescription")}
          </p>
        </header>
        <IntegrationsImportsPanel organizationId={orgSession.organizationId} />
      </section>

      <p className="text-sm text-muted-foreground">
        <Link
          href={organizationAdminPath(orgSlug, "overview")}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("backAdmin")}
        </Link>
      </p>
    </div>
  )
}
