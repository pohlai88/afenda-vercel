import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
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
import { canActInOrganization } from "#lib/auth/permission.server"
import { requireOrgSession } from "#lib/tenant"

import { HrmOnboardingStepForm } from "./hrm-onboarding-step-form"
import { listActiveContractsForOnboardingDashboard } from "../data/onboarding.queries.server"

type HrmOnboardingPageProps = {
  orgSlug: string
}

function formatChecklist(value: unknown): string {
  if (!value || typeof value !== "object") return "—"
  const o = value as { completedSteps?: unknown }
  if (!Array.isArray(o.completedSteps) || o.completedSteps.length === 0) {
    return "—"
  }
  return o.completedSteps.join(", ")
}

export async function HrmOnboardingPage({ orgSlug }: HrmOnboardingPageProps) {
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.onboarding")
  const isAdmin = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )

  const rows = isAdmin
    ? await listActiveContractsForOnboardingDashboard(session.organizationId)
    : []

  return (
    <div className="p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {!isAdmin ? (
        <Card className="mt-6 border-solid border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">
              {t("adminOnlyTitle")}
            </CardTitle>
            <CardDescription>{t("adminOnlyBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="mt-6 border-solid border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">
              {t("emptyTitle")}
            </CardTitle>
            <CardDescription>{t("emptyBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="mt-6 border-solid border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">
              {t("tableTitle")}
            </CardTitle>
            <CardDescription>{t("tableDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colEmployee")}</TableHead>
                  <TableHead>{t("colCompleted")}</TableHead>
                  <TableHead className="w-[320px]">{t("colRecord")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.contractId}>
                    <TableCell className="font-medium">{r.legalName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatChecklist(r.onboardingChecklist)}
                    </TableCell>
                    <TableCell>
                      <HrmOnboardingStepForm
                        orgSlug={orgSlug}
                        contractId={r.contractId}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
