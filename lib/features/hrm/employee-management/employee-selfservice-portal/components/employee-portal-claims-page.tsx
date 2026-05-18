import type { Route } from "next"

import { getTranslations } from "next-intl/server"

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

import { isClaimCancellable } from "../../../payroll-compensation/expenses-reimbursement/data/claim-helpers.shared"
import {
  listClaimTypesForOrg,
  listClaimsForEmployee,
} from "../../../payroll-compensation/expenses-reimbursement/data/claim.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { buildEmployeePortalClaimsListSurfaceConfiguration } from "../data/employee-portal-list-surface.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalClaimCancelButton } from "./employee-portal-claim-cancel-button.client"
import { EmployeePortalClaimSubmitForm } from "./employee-portal-claim-submit-form.client"
import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
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

  const [t, tClaims, navLabels, claimTypes, claims] = await Promise.all([
    getTranslations("Dashboard.Hrm.portalClaims"),
    getTranslations("Dashboard.Hrm.claims"),
    getEmployeePortalSectionNavLabels(),
    listClaimTypesForOrg(organizationId, { activeOnly: true }),
    listClaimsForEmployee(organizationId, employeeId, { limit: 25 }),
  ])

  const claimTypeOptions = claimTypes.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    currency: row.currency,
  }))

  const stateLabels = {
    draft: tClaims("state.draft"),
    submitted: tClaims("state.submitted"),
    under_review: tClaims("state.under_review"),
    returned: tClaims("state.returned"),
    approved: tClaims("state.approved"),
    rejected: tClaims("state.rejected"),
    cancelled: tClaims("state.cancelled"),
    paid: tClaims("state.paid"),
  } as const

  const trailingContext = { showRowActions: true } as const

  const listConfiguration = buildEmployeePortalClaimsListSurfaceConfiguration(
    claims,
    (claimId) => claimDetailHref(context.portal.portalSlug, claimId),
    {
      empty: t("listEmpty"),
      colClaimDate: t("colDate"),
      colAmount: t("colAmount"),
      colState: t("colState"),
      colEvidence: t("colEvidence"),
      evidenceCountLabel: (count) => String(count),
      stateLabels,
    },
    trailingContext
  )

  const claimById = new Map(claims.map((row) => [row.id, row]))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("portalEmployee", {
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
            <GovernedPatternCListSection
              layout="embedded"
              title=""
              listConfiguration={listConfiguration}
              surfaceKey="hrm:portal:claims"
              resolveConfiguredPermission={false}
              trailingColumn={{
                header: " ",
                render: (surfaceRow) => {
                  const trailingAction = surfaceRow.trailingAction
                  const row = claimById.get(surfaceRow.id)
                  if (
                    !row ||
                    !isListSurfaceTrailingActionRenderable(trailingAction)
                  ) {
                    return null
                  }
                  return (
                    <GovernedTrailingActionSlot trailingAction={trailingAction}>
                      <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={claimDetailHref(
                            context.portal.portalSlug,
                            row.id
                          )}
                        >
                          {t("viewDetail")}
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
                    </GovernedTrailingActionSlot>
                  )
                },
              }}
            />
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