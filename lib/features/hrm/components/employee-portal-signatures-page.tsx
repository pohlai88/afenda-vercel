import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Link } from "#i18n/navigation"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { listPendingSignaturePartiesForEmployee } from "../data/signature-request.queries.server"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalSignaturesPageProps = {
  portalSlug: string
}

export async function EmployeePortalSignaturesPage({
  portalSlug,
}: EmployeePortalSignaturesPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)

  const [t, navLabels, pending] = await Promise.all([
    getTranslations("Dashboard.Hrm.portalSignatures"),
    getEmployeePortalSectionNavLabels(),
    listPendingSignaturePartiesForEmployee(
      context.portal.organizationId,
      context.employee.id
    ),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <EmployeePortalSectionNav
        portalSlug={portalSlug}
        current="signatures"
        labels={navLabels}
      />

      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
      </header>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("pendingTitle")}</CardTitle>
          <CardDescription>{t("pendingDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            pending.map(({ party, request }) => (
              <Link
                key={party.id}
                href={`/p/${portalSlug}/employee/signatures/${party.token}`}
                prefetch={false}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40"
              >
                <span className="text-sm font-medium">
                  {t("requestKind", { kind: request.kind })}
                </span>
                <Badge variant="outline">{request.derivedStatus}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
