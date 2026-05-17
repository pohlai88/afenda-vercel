import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedSurface } from "#features/governed-surface"
import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Link } from "#i18n/navigation"
import { requireOrgSession } from "#lib/auth"

import { buildGovernedToolsWorkbenchHeader } from "../../_module-governance/tools-governed-page-header.server"
import { toolsSignatureRequestPath } from "../../constants"
import { listSignatureRequestsForOrganization } from "../data/signature-request.queries.server"

type SignaturesPageProps = {
  orgSlug: string
}

export async function SignaturesPage({ orgSlug }: SignaturesPageProps) {
  const { organizationId } = await requireOrgSession()
  const [t, format, rows, header] = await Promise.all([
    getTranslations("Dashboard.Hrm.signatures"),
    getFormatter(),
    listSignatureRequestsForOrganization(organizationId),
    buildGovernedToolsWorkbenchHeader(orgSlug, "Dashboard.Hrm.signatures", {
      eyebrow: "eyebrow",
      title: "pageTitle",
      description: "pageDescription",
    }),
  ])

  return (
    <GovernedSurface header={header} className="flex flex-col gap-6 p-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("listTitle")}</CardTitle>
          <CardDescription>{t("listDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            rows.map((row) => (
              <Link
                key={row.id}
                href={toolsSignatureRequestPath(orgSlug, row.publicSlug)}
                prefetch={false}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {t("requestLabel", { kind: row.kind })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.subjectId}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{row.derivedStatus}</Badge>
                  {row.sentAt ? (
                    <span className="text-xs text-muted-foreground">
                      {format.dateTime(row.sentAt, { dateStyle: "medium" })}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </GovernedSurface>
  )
}
