import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"
import { requireOrgSession } from "#lib/auth"

import { HrmOnboardingStepForm } from "./hrm-onboarding-step-form"
import { listActiveContractsForOnboardingDashboard } from "../data/onboarding.queries.server"
import { resolveOnboardingSurfaceCapabilities } from "../data/employee-lifecycle-capabilities.server"

type HrmOnboardingPageProps = {
  orgSlug: string
}

function formatChecklist(value: unknown): string {
  if (!value || typeof value !== "object") return "-"
  const o = value as { completedSteps?: unknown }
  if (!Array.isArray(o.completedSteps) || o.completedSteps.length === 0) {
    return "-"
  }
  return o.completedSteps.join(", ")
}

export async function HrmOnboardingPage({ orgSlug }: HrmOnboardingPageProps) {
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.onboarding")
  const capabilities = await resolveOnboardingSurfaceCapabilities()

  const rows = capabilities.canRead
    ? await listActiveContractsForOnboardingDashboard(session.organizationId)
    : []

  return (
    <div className="p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {!capabilities.canRead ? (
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
                        disabled={!capabilities.canUpdate}
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
