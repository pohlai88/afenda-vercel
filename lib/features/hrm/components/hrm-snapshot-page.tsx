import { Suspense } from "react"
import { getFormatter, getTranslations } from "next-intl/server"

import type { Route } from "next"

import { ModulePageHeader } from "#components/module-page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { ui } from "#lib/design-system"
import { cn } from "#lib/utils"

import { Link } from "#i18n/navigation"

import { requireOrgSession } from "#lib/tenant"

import { organizationHrmPath } from "../constants"
import { getHrmSnapshotBoard } from "../data/hrm-snapshot.queries.server"

import { ComplianceOperationalHealth } from "./compliance-operational-health"
import { ComplianceOperationalHealthSkeleton } from "./compliance-operational-health-skeleton"

type HrmSnapshotPageProps = {
  orgSlug: string
}

function StatBlock({
  label,
  value,
  href,
}: {
  label: string
  value: number | string
  href: Route
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Card
        size="sm"
        className={cn(
          "h-full border-solid border-border transition-colors hover:border-ring",
          ui.elevation.card
        )}
      >
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-medium tracking-wide uppercase">
            {label}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  )
}

/**
 * Dense read-only HR snapshot — projections from existing aggregates and
 * queries (no new mutation paths).
 */
export async function HrmSnapshotPage({ orgSlug }: HrmSnapshotPageProps) {
  const { organizationId } = await requireOrgSession()
  const [t, format, board] = await Promise.all([
    getTranslations("Dashboard.Hrm.snapshot"),
    getFormatter(),
    getHrmSnapshotBoard(organizationId),
  ])

  const latest = board.latestPayrollPeriod
  const periodLabel =
    latest != null
      ? `${format.dateTime(new Date(latest.periodStart), { dateStyle: "medium" })} – ${format.dateTime(new Date(latest.periodEnd), { dateStyle: "medium" })}`
      : t("noPayrollPeriod")

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <section aria-labelledby="hrm-snapshot-stats-heading">
        <h2
          id="hrm-snapshot-stats-heading"
          className="mb-3 text-sm font-semibold text-foreground"
        >
          {t("statsHeading")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatBlock
            label={t("statActiveEmployees")}
            value={board.activeEmployeeCount}
            href={organizationHrmPath(orgSlug, "employees")}
          />
          <StatBlock
            label={t("statPendingLeave")}
            value={board.pendingLeaveApprovals}
            href={organizationHrmPath(orgSlug, "leave")}
          />
          <StatBlock
            label={t("statPendingClaims")}
            value={board.pendingClaimSubmissions}
            href={organizationHrmPath(orgSlug, "claims")}
          />
          <StatBlock
            label={t("statApprovedUnpaidClaims")}
            value={board.approvedUnpaidClaims}
            href={organizationHrmPath(orgSlug, "claims")}
          />
          <StatBlock
            label={t("statPayrollLockQueue")}
            value={board.pendingPayrollLockApprovals}
            href={organizationHrmPath(orgSlug, "payroll")}
          />
          <StatBlock
            label={t("statComplianceAwaiting")}
            value={board.complianceSubmittedAwaiting}
            href={organizationHrmPath(orgSlug, "compliance")}
          />
          <StatBlock
            label={t("statComplianceFailed")}
            value={board.complianceFailed}
            href={organizationHrmPath(orgSlug, "compliance")}
          />
        </div>
      </section>

      <section aria-labelledby="hrm-snapshot-payroll-heading">
        <h2
          id="hrm-snapshot-payroll-heading"
          className="mb-3 text-sm font-semibold text-foreground"
        >
          {t("payrollHeading")}
        </h2>
        <Card
          size="sm"
          className={cn("border-solid border-border", ui.elevation.card)}
        >
          <CardHeader>
            <CardTitle className="text-base">
              {t("latestPeriodTitle")}
            </CardTitle>
            <CardDescription>{periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {latest != null ? (
              <>
                <span>
                  <span className="font-medium text-foreground">
                    {t("fieldState")}
                  </span>{" "}
                  {latest.state}
                </span>
                <span>
                  <span className="font-medium text-foreground">
                    {t("fieldCurrency")}
                  </span>{" "}
                  {latest.currency}
                </span>
                {latest.rulePackVersion != null ? (
                  <span>
                    <span className="font-medium text-foreground">
                      {t("fieldRulePack")}
                    </span>{" "}
                    {latest.rulePackVersion}
                  </span>
                ) : null}
                <Link
                  href={organizationHrmPath(orgSlug, "payroll") as Route}
                  className="ml-auto font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("openPayroll")}
                </Link>
              </>
            ) : (
              <p>{t("noPayrollPeriodBody")}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="hrm-snapshot-compliance-health-heading">
        <h2
          id="hrm-snapshot-compliance-health-heading"
          className="mb-3 text-sm font-semibold text-foreground"
        >
          {t("complianceHealthHeading")}
        </h2>
        <Suspense fallback={<ComplianceOperationalHealthSkeleton />}>
          <ComplianceOperationalHealth
            organizationId={organizationId}
            orgSlug={orgSlug}
          />
        </Suspense>
      </section>

      <section aria-labelledby="hrm-snapshot-links-heading">
        <h2
          id="hrm-snapshot-links-heading"
          className="mb-3 text-sm font-semibold text-foreground"
        >
          {t("quickLinksHeading")}
        </h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li>
            <Link
              href={organizationHrmPath(orgSlug, "documents") as Route}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("linkDocuments")}
            </Link>
          </li>
          <li>
            <Link
              href={organizationHrmPath(orgSlug, "policies") as Route}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("linkPolicies")}
            </Link>
          </li>
          <li>
            <Link
              href={organizationHrmPath(orgSlug, "attendance") as Route}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("linkAttendance")}
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
