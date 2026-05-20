import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { DemoEmployeePortalSectionNav } from "#components2/demo/demo-employee-portal-section-nav"
import { GovernedEmpty, GovernedPatternCListSection } from "#features/governed-surface"
import {
  buildLeaveBalanceListSurfaceConfiguration,
  buildLeaveMyHistoryListSurfaceConfiguration,
  getEmployeePortalSectionNavLabels,
} from "#features/hrm/server"

import type { DemoEmployeeLeaveFixture } from "../data/demo-employee-leave.fixture.server"

type DemoEmployeeLeaveReadOnlySurfaceProps = {
  fixture: DemoEmployeeLeaveFixture
}

export async function DemoEmployeeLeaveReadOnlySurface({
  fixture,
}: DemoEmployeeLeaveReadOnlySurfaceProps) {
  const [t, navLabels] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getEmployeePortalSectionNavLabels(),
  ])

  const stateLabelFor = (state: string) => t(`state.${state}` as "state.draft")

  const historyRows = fixture.requests.filter((row) => row.state !== "submitted")

  const balanceConfiguration = buildLeaveBalanceListSurfaceConfiguration(
    fixture.balances,
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("portalEmployee", {
            employeeNumber: fixture.employeeNumber,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-normal">
            {t("portalPageTitle")}
          </h2>
          <Badge variant="outline">{fixture.legalName}</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("portalPageDescription")}
        </p>
      </header>

      <DemoEmployeePortalSectionNav labels={navLabels} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{t("myBalancesTitle")}</CardTitle>
              <CardDescription>{t("myBalancesDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <GovernedPatternCListSection
                layout="embedded"
                title=""
                listConfiguration={balanceConfiguration}
                surfaceKey="demo:hrm:portal:leave-balances"
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
                surfaceKey="demo:hrm:portal:leave-history"
                resolveConfiguredPermission={false}
              />
            </CardContent>
          </Card>
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("requestLeaveTitle")}</CardTitle>
            <CardDescription>{t("requestLeaveDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <GovernedEmpty
              model={{
                variant: "muted",
                title: t("requestLeaveTitle"),
                description:
                  "Demo mode — sign in to your organization to submit leave requests.",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
