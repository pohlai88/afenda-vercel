import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import { ModulePageHeader } from "#features/governed-surface"
import { Card, CardHeader, CardTitle } from "#components2/ui/card"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { requireOrgSession } from "#lib/auth"

import { organizationHrmPath } from "../../../constants"
import {
  BONUS_INCENTIVE_DEFAULT_TAB,
  BONUS_INCENTIVE_TABS,
  isBonusIncentiveTab,
  type BonusIncentiveTab,
} from "../data/bonus-incentive-display.shared"
import {
  getBonusReportSnapshot,
  listBonusClawbacksForOrganization,
  listBonusCyclesForOrganization,
  listBonusEmployeeChoices,
  listBonusPayrollPeriodChoices,
  listBonusPayoutsForOrganization,
  listBonusPlansForOrganization,
} from "../data/bonus-incentive.queries.server"

import {
  BonusCycleCreateForm,
  BonusPlanCreateForm,
} from "./bonus-incentive-forms"
import {
  BonusClawbacksSection,
  BonusCyclesSection,
  BonusPayoutsSection,
  BonusPlansSection,
  BonusReportsSection,
} from "./bonus-incentive-sections"

type BonusIncentivesPageProps = {
  readonly orgSlug: string
  readonly tabParam?: string
}

function tabHref(orgSlug: string, tab: BonusIncentiveTab) {
  const base = organizationHrmPath(orgSlug, "bonus-incentives")
  return tab === BONUS_INCENTIVE_DEFAULT_TAB ? base : `${base}?tab=${tab}`
}

function BonusTabNav({
  orgSlug,
  activeTab,
}: {
  readonly orgSlug: string
  readonly activeTab: BonusIncentiveTab
}) {
  return (
    <nav aria-label="Bonus incentive sections" className="flex flex-wrap gap-2">
      {BONUS_INCENTIVE_TABS.map((tab) => (
        <Link
          key={tab}
          href={tabHref(orgSlug, tab)}
          className="rounded-md border px-3 py-2 text-sm data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          data-active={tab === activeTab}
        >
          {tab.replaceAll("_", " ")}
        </Link>
      ))}
    </nav>
  )
}

export async function BonusIncentivesPage({
  orgSlug,
  tabParam,
}: BonusIncentivesPageProps) {
  const activeTab =
    tabParam && isBonusIncentiveTab(tabParam)
      ? tabParam
      : BONUS_INCENTIVE_DEFAULT_TAB
  const session = await requireOrgSession()
  const [
    t,
    isAdmin,
    plans,
    cycles,
    payouts,
    clawbacks,
    employees,
    payrollPeriods,
    reportSnapshot,
  ] = await Promise.all([
    getTranslations("Dashboard.Hrm.bonusIncentives"),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "bonus_incentive",
      function: "update",
    }),
    listBonusPlansForOrganization(session.organizationId),
    listBonusCyclesForOrganization(session.organizationId),
    listBonusPayoutsForOrganization(session.organizationId),
    listBonusClawbacksForOrganization(session.organizationId),
    listBonusEmployeeChoices(session.organizationId),
    listBonusPayrollPeriodChoices(session.organizationId),
    getBonusReportSnapshot(session.organizationId),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      {!isAdmin ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("restricted")}</CardTitle>
          </CardHeader>
        </Card>
      ) : null}

      <BonusTabNav orgSlug={orgSlug} activeTab={activeTab} />

      {activeTab === "plans" ? (
        <>
          <BonusPlanCreateForm isAdmin={isAdmin} />
          <BonusPlansSection rows={plans} />
        </>
      ) : null}

      {activeTab === "cycles" ? (
        <>
          <BonusCycleCreateForm
            isAdmin={isAdmin}
            plans={plans.filter((plan) => plan.isActive)}
            payrollPeriods={payrollPeriods}
          />
          <BonusCyclesSection rows={cycles} employees={employees} />
        </>
      ) : null}

      {activeTab === "payouts" ? (
        <BonusPayoutsSection rows={payouts} payrollPeriods={payrollPeriods} />
      ) : null}

      {activeTab === "reports" ? (
        <BonusReportsSection snapshot={reportSnapshot} />
      ) : null}

      {activeTab === "clawbacks" ? (
        <BonusClawbacksSection rows={clawbacks} />
      ) : null}
    </div>
  )
}
