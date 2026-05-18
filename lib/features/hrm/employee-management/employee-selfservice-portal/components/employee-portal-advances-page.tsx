import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import {
  listAdvanceInstallmentsForEmployee,
  listSalaryAdvancesForEmployee,
} from "../../../payroll-compensation/payroll-processing/data/salary-advance.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import {
  buildEmployeePortalAdvanceInstallmentListSurfaceConfiguration,
  buildEmployeePortalAdvanceListSurfaceConfiguration,
  type PortalAdvanceInstallmentDisplayRow,
} from "../data/employee-portal-list-surface.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalAdvanceCancelButton } from "./employee-portal-advance-cancel-button"
import { EmployeePortalAdvanceRequestForm } from "./employee-portal-advance-request-form"
import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalAdvancesPageProps = {
  portalSlug: string
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

  const stateLabelFor = (state: string) =>
    STATE_KEY_MAP[state] ? t(STATE_KEY_MAP[state]!) : state

  const trailingContext = { showRowActions: true } as const

  const advanceConfiguration = buildEmployeePortalAdvanceListSurfaceConfiguration(
    advances,
    {
      empty: t("listEmpty"),
      colAmount: t("colAmount"),
      colState: t("colState"),
      colRequested: t("colRequested"),
      colReason: t("colReason"),
      stateLabelFor,
    },
    trailingContext
  )

  const advanceById = new Map(advances.map((row) => [row.id, row]))

  const installmentsByAdvance = new Map<string, PortalAdvanceInstallmentDisplayRow[]>()
  for (const inst of installments) {
    const advance = advanceById.get(inst.advanceId)
    const existing = installmentsByAdvance.get(inst.advanceId) ?? []
    installmentsByAdvance.set(inst.advanceId, [
      ...existing,
      {
        id: inst.id,
        sequence: inst.sequence,
        dueAfterPeriodEndIso: inst.dueAfterPeriodEndIso,
        plannedAmount: inst.plannedAmount,
        currency: advance?.currency ?? "",
        state: inst.state,
      },
    ])
  }

  const allInstallmentRows: PortalAdvanceInstallmentDisplayRow[] = installments.map(
    (inst) => {
      const advance = advanceById.get(inst.advanceId)
      return {
        id: inst.id,
        sequence: inst.sequence,
        dueAfterPeriodEndIso: inst.dueAfterPeriodEndIso,
        plannedAmount: inst.plannedAmount,
        currency: advance?.currency ?? "",
        state: inst.state,
      }
    }
  )

  const installmentConfiguration =
    buildEmployeePortalAdvanceInstallmentListSurfaceConfiguration(
      allInstallmentRows,
      {
        empty: t("installmentsEmpty"),
        colSequence: t("colInstallment"),
        colPeriodEnd: t("colInstallmentPeriodEnd"),
        colAmount: t("colInstallmentAmount"),
        colState: t("colInstallmentState"),
        stateLabelFor,
      }
    )

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
        <CardContent className="flex flex-col gap-6">
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={advanceConfiguration}
            surfaceKey="hrm:portal:advances"
            resolveConfiguredPermission={false}
            trailingColumn={{
              header: t("colActions"),
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const row = advanceById.get(surfaceRow.id)
                if (
                  !row ||
                  row.state !== "pending" ||
                  !isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot trailingAction={trailingAction}>
                    <EmployeePortalAdvanceCancelButton
                      portalSlug={portalSlug}
                      advanceId={row.id}
                    />
                  </GovernedTrailingActionSlot>
                )
              },
            }}
          />

          {advances.map((advance) => {
            const advInstallments = installmentsByAdvance.get(advance.id) ?? []
            if (advInstallments.length === 0) return null
            const nestedConfiguration =
              buildEmployeePortalAdvanceInstallmentListSurfaceConfiguration(
                advInstallments,
                {
                  empty: t("installmentsEmpty"),
                  colSequence: t("colInstallment"),
                  colPeriodEnd: t("colInstallmentPeriodEnd"),
                  colAmount: t("colInstallmentAmount"),
                  colState: t("colInstallmentState"),
                  stateLabelFor,
                }
              )
            return (
              <div key={advance.id} className="border-l pl-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t("installmentsTitle")}
                </p>
                <GovernedPatternCListSection
                  layout="embedded"
                  title=""
                  listConfiguration={nestedConfiguration}
                  surfaceKey={`hrm:portal:advance-installments:${advance.id}`}
                  resolveConfiguredPermission={false}
                />
              </div>
            )
          })}
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
            <GovernedPatternCListSection
              layout="embedded"
              title=""
              listConfiguration={installmentConfiguration}
              surfaceKey="hrm:portal:advance-installments-all"
              resolveConfiguredPermission={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
