import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedEmpty } from "#features/governed-surface"

import {
  buildLeaveBalanceListSurfaceConfiguration,
  buildLeaveMyHistoryListSurfaceConfiguration,
} from "../../../time-attendance/leave-attendance-management/data/leave-list-surface.server"
import {
  listActiveLeaveTypesForOrg,
  listLeaveBalancesForEmployee,
  listLeaveRequestsForEmployee,
} from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { EmployeePortalLeaveCancelButton } from "./employee-portal-leave-cancel-button"
import { EmployeePortalLeaveRequestForm } from "./employee-portal-leave-request-form"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalLeavePageProps = {
  portalSlug: string
}

export async function EmployeePortalLeavePage({
  portalSlug,
}: EmployeePortalLeavePageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id

  const [t, navLabels, leaveTypes, balances, requests] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getEmployeePortalSectionNavLabels(),
    listActiveLeaveTypesForOrg(organizationId),
    listLeaveBalancesForEmployee(
      organizationId,
      employeeId,
      new Date().getFullYear()
    ),
    listLeaveRequestsForEmployee(organizationId, employeeId),
  ])

  const stateLabelFor = (state: string) => t(`state.${state}` as "state.draft")

  const historyRows = requests.slice(0, 10)
  const balanceConfiguration = buildLeaveBalanceListSurfaceConfiguration(
    balances,
    {
      empty: t("myBalancesEmpty"),
      colLeaveType: t("colLeaveType"),
      colEntitled: t("colEntitled"),
      colTaken: t("colTaken"),
      colPending: t("colPending"),
      colAvailable: t("colAvailable"),
    }
  )
  const historyConfiguration = buildLeaveMyHistoryListSurfaceConfiguration(
    historyRows,
    {
      empty: t("myHistoryEmpty"),
      colLeaveType: t("colLeaveType"),
      colDates: t("colDates"),
      colDuration: t("colDuration"),
      colState: t("colState"),
      stateLabelFor,
    }
  )
  const requestById = new Map(historyRows.map((row) => [row.id, row]))

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
        current="leave"
        labels={navLabels}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">
                {t("myBalancesTitle")}
              </CardTitle>
              <CardDescription>{t("myBalancesDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <GovernedPatternCListSection
                layout="embedded"
                title=""
                listConfiguration={balanceConfiguration}
                surfaceKey="hrm:portal:leave-balances"
                resolveConfiguredPermission={false}
              />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{t("myHistoryTitle")}</CardTitle>
              <CardDescription>{t("myHistoryDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <GovernedPatternCListSection
                layout="embedded"
                title=""
                listConfiguration={historyConfiguration}
                surfaceKey="hrm:portal:leave-history"
                resolveConfiguredPermission={false}
                trailingColumn={{
                  header: t("colActions"),
                  render: (surfaceRow) => {
                    const trailingAction = surfaceRow.trailingAction
                    const request = requestById.get(surfaceRow.id)
                    if (
                      !request ||
                      request.state !== "submitted" ||
                      !isListSurfaceTrailingActionRenderable(trailingAction)
                    ) {
                      return null
                    }
                    return (
                      <GovernedTrailingActionSlot
                        trailingAction={trailingAction}
                      >
                        <EmployeePortalLeaveCancelButton
                          portalSlug={context.portal.portalSlug}
                          requestId={request.id}
                        />
                      </GovernedTrailingActionSlot>
                    )
                  },
                }}
              />
            </CardContent>
          </Card>
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("requestLeaveTitle")}
            </CardTitle>
            <CardDescription>{t("requestLeaveDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {leaveTypes.length === 0 ? (
              <GovernedEmpty
                model={{
                  variant: "muted",
                  title: t("requestLeaveNoTypes"),
                }}
              />
            ) : (
              <EmployeePortalLeaveRequestForm
                portalSlug={context.portal.portalSlug}
                leaveTypes={leaveTypes}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
