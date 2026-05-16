import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
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

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import {
  listAdvanceInstallmentsForEmployee,
  listSalaryAdvancesForEmployee,
} from "../data/salary-advance.queries.server"

import { EmployeePortalAdvanceCancelButton } from "./employee-portal-advance-cancel-button"
import { EmployeePortalAdvanceRequestForm } from "./employee-portal-advance-request-form"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalAdvancesPageProps = {
  portalSlug: string
}

function formatIsoDate(iso: string): string {
  // YYYY-MM-DD — safe for any timezone since we store calendar dates
  return iso.slice(0, 10)
}

type AdvanceStateKey =
  | "stateLabels.pending"
  | "stateLabels.approved"
  | "stateLabels.rejected"
  | "stateLabels.cancelled"
  | "stateLabels.repaid"
  | "stateLabels.deducted"

const STATE_KEY_MAP: Record<string, AdvanceStateKey> = {
  pending: "stateLabels.pending",
  approved: "stateLabels.approved",
  rejected: "stateLabels.rejected",
  cancelled: "stateLabels.cancelled",
  repaid: "stateLabels.repaid",
  deducted: "stateLabels.deducted",
}

export async function EmployeePortalAdvancesPage({
  portalSlug,
}: EmployeePortalAdvancesPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id

  const [tLeave, t, navLabels, advances, installments] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getTranslations("Dashboard.Hrm.portalAdvances"),
    getEmployeePortalSectionNavLabels(),
    listSalaryAdvancesForEmployee(organizationId, employeeId),
    listAdvanceInstallmentsForEmployee(organizationId, employeeId),
  ])

  // Group installments by advanceId for O(1) lookup
  const installmentsByAdvance = new Map<string, typeof installments>()
  for (const inst of installments) {
    const existing = installmentsByAdvance.get(inst.advanceId) ?? []
    installmentsByAdvance.set(inst.advanceId, [...existing, inst])
  }

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
        current="advances"
        labels={navLabels}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("requestTitle")}</CardTitle>
          <CardDescription>{t("requestDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeePortalAdvanceRequestForm portalSlug={portalSlug} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("listTitle")}</CardTitle>
          <CardDescription>{t("listDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {advances.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("listEmpty")}</p>
          ) : (
            <div className="flex flex-col gap-6">
              {advances.map((row) => {
                const advInstallments = installmentsByAdvance.get(row.id) ?? []
                return (
                  <div key={row.id} className="flex flex-col gap-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("colAmount")}</TableHead>
                          <TableHead>{t("colState")}</TableHead>
                          <TableHead>{t("colRequested")}</TableHead>
                          <TableHead>{t("colReason")}</TableHead>
                          <TableHead className="text-right">
                            {t("colActions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            {row.amount} {row.currency}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {STATE_KEY_MAP[row.state]
                                ? t(STATE_KEY_MAP[row.state]!)
                                : row.state}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatIsoDate(row.requestedAt.toISOString())}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {row.reason ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.state === "pending" ? (
                              <EmployeePortalAdvanceCancelButton
                                portalSlug={portalSlug}
                                advanceId={row.id}
                              />
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {advInstallments.length > 0 && (
                      <div className="ml-4 border-l pl-4">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          {t("installmentsTitle")}
                        </p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                {t("colInstallment")}
                              </TableHead>
                              <TableHead>
                                {t("colInstallmentPeriodEnd")}
                              </TableHead>
                              <TableHead>{t("colInstallmentAmount")}</TableHead>
                              <TableHead>{t("colInstallmentState")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {advInstallments.map((inst) => (
                              <TableRow key={inst.id}>
                                <TableCell className="text-muted-foreground">
                                  {inst.sequence}
                                </TableCell>
                                <TableCell>
                                  {formatIsoDate(inst.dueAfterPeriodEndIso)}
                                </TableCell>
                                <TableCell>
                                  {inst.plannedAmount} {row.currency}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {STATE_KEY_MAP[inst.state]
                                      ? t(STATE_KEY_MAP[inst.state]!)
                                      : inst.state}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {advances.length === 0 && installments.length === 0 ? null : (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("installmentsTitle")}
            </CardTitle>
            <CardDescription>{t("installmentsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {installments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("installmentsEmpty")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      {t("colInstallment")}
                    </TableHead>
                    <TableHead>{t("colInstallmentPeriodEnd")}</TableHead>
                    <TableHead>{t("colInstallmentAmount")}</TableHead>
                    <TableHead>{t("colInstallmentState")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => {
                    const advance = advances.find(
                      (a) => a.id === inst.advanceId
                    )
                    return (
                      <TableRow key={inst.id}>
                        <TableCell className="text-muted-foreground">
                          {inst.sequence}
                        </TableCell>
                        <TableCell>
                          {formatIsoDate(inst.dueAfterPeriodEndIso)}
                        </TableCell>
                        <TableCell>
                          {inst.plannedAmount} {advance?.currency ?? ""}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {STATE_KEY_MAP[inst.state]
                              ? t(STATE_KEY_MAP[inst.state]!)
                              : inst.state}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
