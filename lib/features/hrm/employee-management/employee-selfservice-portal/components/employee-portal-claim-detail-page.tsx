import { notFound } from "next/navigation"

import { getFormatter, getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Link } from "#i18n/navigation"
import { employeePortalPath } from "#lib/portal"

import { getClaimDetail } from "../../../payroll-compensation/expenses-reimbursement/data/claim.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { buildEmployeePortalClaimEvidenceListSurfaceConfiguration } from "../data/employee-portal-list-surface.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalGovernedTable } from "./employee-portal-governed-table"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalClaimDetailPageProps = {
  portalSlug: string
  claimId: string
}

export async function EmployeePortalClaimDetailPage({
  portalSlug,
  claimId,
}: EmployeePortalClaimDetailPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const detail = await getClaimDetail(context.portal.organizationId, claimId)

  if (!detail || detail.claim.employeeId !== context.employee.id) {
    notFound()
  }

  const [tLeave, t, navLabels, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getTranslations("Dashboard.Hrm.portalClaims"),
    getEmployeePortalSectionNavLabels(),
    getFormatter(),
  ])

  const evidenceConfiguration =
    buildEmployeePortalClaimEvidenceListSurfaceConfiguration(detail.evidence, {
      empty: t("listEmpty"),
      colTitle: "Title",
      colType: "Type",
    })

  const evidenceById = new Map(detail.evidence.map((ev) => [ev.id, ev]))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {tLeave("portalEmployee", {
            employeeNumber: context.employee.employeeNumber,
          })}
        </p>
        <h1 className="text-2xl font-semibold tracking-normal">
          {t("detailTitle")}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {detail.claim.claimNumber ?? detail.claim.id}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="claims"
        labels={navLabels}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={employeePortalPath(context.portal.portalSlug, "claims")}>
            Back
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("timelineTitle")}</CardTitle>
            <CardDescription>{detail.claim.claimDate}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{detail.claim.state}</Badge>
              <span className="text-muted-foreground">
                {format.number(Number(detail.claim.amount), {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {detail.claim.currency}
              </span>
            </div>
            {detail.claim.description ? (
              <p className="text-foreground">{detail.claim.description}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("evidenceTitle")}</CardTitle>
            <CardDescription>{t("colEvidence")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeePortalGovernedTable
              configuration={evidenceConfiguration}
              surfaceKey="hrm:portal:claim-evidence"
              trailingColumn={{
                header: " ",
                render: (surfaceRow) => {
                  const ev = evidenceById.get(surfaceRow.id)
                  if (!ev?.documentBlobUrl) return null
                  return (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={ev.documentBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </a>
                    </Button>
                  )
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
