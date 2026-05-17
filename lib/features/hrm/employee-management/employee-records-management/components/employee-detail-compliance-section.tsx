import { getTranslations } from "next-intl/server"

import type { Route } from "next"

import { Link } from "#i18n/navigation"
import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { organizationHrmPath } from "../../../constants"
import { getEmployeeComplianceSummary } from "../../compliance-regulatory-tracking/data/employee-compliance-summary.queries.server"
import type { HrmComplianceStatus } from "../../compliance-regulatory-tracking/data/compliance-status.shared"

type EmployeeDetailComplianceSectionProps = {
  orgSlug: string
  organizationId: string
  employeeId: string
}

function complianceStatusVariant(
  status: HrmComplianceStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "compliant":
    case "waived":
      return "outline"
    case "pending":
    case "at_risk":
      return "secondary"
    case "overdue":
    case "expired":
    case "non_compliant":
      return "destructive"
    default:
      return "outline"
  }
}

export async function EmployeeDetailComplianceSection({
  orgSlug,
  organizationId,
  employeeId,
}: EmployeeDetailComplianceSectionProps) {
  const [t, summary] = await Promise.all([
    getTranslations("Dashboard.Hrm.workforce"),
    getEmployeeComplianceSummary(organizationId, employeeId),
  ])

  if (!summary) {
    return null
  }

  const complianceHref = organizationHrmPath(orgSlug, "compliance") as Route
  const hasOpenExceptions = summary.openExceptionCount > 0

  return (
    <Card id="compliance" size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {t("complianceSectionTitle")}
          </CardTitle>
          <Badge variant={complianceStatusVariant(summary.overallStatus)}>
            {t(`complianceStatus.${summary.overallStatus}`)}
          </Badge>
        </div>
        <CardDescription>{t("complianceSectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">
              {t("complianceMetricDocuments")}
            </dt>
            <dd className="font-medium">
              {summary.documentAtRisk + summary.documentExpired > 0
                ? t("complianceMetricAtRisk", {
                    count: summary.documentAtRisk + summary.documentExpired,
                  })
                : t("complianceMetricClear")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("complianceMetricTraining")}
            </dt>
            <dd className="font-medium">
              {summary.mandatoryTrainingOverdue +
                summary.mandatoryTrainingAtRisk >
              0
                ? t("complianceMetricAtRisk", {
                    count:
                      summary.mandatoryTrainingOverdue +
                      summary.mandatoryTrainingAtRisk,
                  })
                : t("complianceMetricClear")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("complianceMetricWorkAuth")}
            </dt>
            <dd className="font-medium">
              {summary.workAuthorizationAtRisk +
                summary.workAuthorizationExpired >
              0
                ? t("complianceMetricAtRisk", {
                    count:
                      summary.workAuthorizationAtRisk +
                      summary.workAuthorizationExpired,
                  })
                : t("complianceMetricClear")}
            </dd>
          </div>
          {hasOpenExceptions ? (
            <div>
              <dt className="text-muted-foreground">
                {t("complianceMetricExceptions")}
              </dt>
              <dd className="font-medium">
                {t("complianceOpenExceptions", {
                  count: summary.openExceptionCount,
                })}
              </dd>
            </div>
          ) : null}
        </dl>
        <Link
          href={complianceHref}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("complianceViewOrgDashboard")}
        </Link>
      </CardContent>
    </Card>
  )
}
