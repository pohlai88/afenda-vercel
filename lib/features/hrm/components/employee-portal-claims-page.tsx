import type { Route } from "next"

import { getFormatter, getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { Link } from "#i18n/navigation"
import { employeePortalPath } from "#lib/portal"

import { isClaimCancellable } from "../data/claim-helpers.shared"
import {
  listClaimTypesForOrg,
  listClaimsForEmployee,
} from "../data/claim.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalClaimCancelButton } from "./employee-portal-claim-cancel-button.client"
import { EmployeePortalClaimSubmitForm } from "./employee-portal-claim-submit-form.client"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalClaimsPageProps = {
  portalSlug: string
}

function claimDetailHref(portalSlug: string, claimId: string): Route {
  return `${employeePortalPath(portalSlug, "claims")}/${claimId}` as Route
}

export async function EmployeePortalClaimsPage({
  portalSlug,
}: EmployeePortalClaimsPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id

  const [tLeave, t, navLabels, format, claimTypes, claims] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getTranslations("Dashboard.Hrm.portalClaims"),
    getEmployeePortalSectionNavLabels(),
    getFormatter(),
    listClaimTypesForOrg(organizationId, { activeOnly: true }),
    listClaimsForEmployee(organizationId, employeeId, { limit: 25 }),
  ])

  const claimTypeOptions = claimTypes.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    currency: row.currency,
  }))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {tLeave("portalEmployee", {
            employeeNumber: context.employee.employeeNumber,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-normal">
            {t("portalPageTitle")}
          </h1>
          <Badge variant="outline">{context.employee.legalName}</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("portalPageDescription")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="claims"
        labels={navLabels}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("listTitle")}</CardTitle>
            <CardDescription>{t("portalPageDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("listEmpty")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colDate")}</TableHead>
                    <TableHead>{t("colAmount")}</TableHead>
                    <TableHead>{t("colState")}</TableHead>
                    <TableHead>{t("colEvidence")}</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.claimDate}</TableCell>
                      <TableCell>
                        {format.number(Number(row.amount), {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {row.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.state}</Badge>
                      </TableCell>
                      <TableCell>{row.evidenceCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={claimDetailHref(
                                context.portal.portalSlug,
                                row.id
                              )}
                            >
                              View
                            </Link>
                          </Button>
                          {isClaimCancellable(row.state) ? (
                            <EmployeePortalClaimCancelButton
                              portalSlug={context.portal.portalSlug}
                              claimId={row.id}
                              label={t("cancel")}
                            />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("submitTitle")}</CardTitle>
            <CardDescription>{t("portalPageDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeePortalClaimSubmitForm
              portalSlug={context.portal.portalSlug}
              claimTypes={claimTypeOptions}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
