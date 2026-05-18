import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { Button } from "#components2/ui/button"
import { Textarea } from "#components2/ui/textarea"

import { submitDecideSalaryAdvance } from "../actions/salary-advance.actions"
import { buildSalaryAdvanceOrgListSurfaceConfiguration } from "../data/salary-advance-list-surface.server"
import type { SalaryAdvanceListRow } from "../data/salary-advance.queries.server"

type HrmAdvancesListSectionProps = {
  orgSlug: string
  isAdmin: boolean
  advances: readonly SalaryAdvanceListRow[]
}

export async function HrmAdvancesListSection({
  orgSlug,
  isAdmin,
  advances,
}: HrmAdvancesListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.advances"),
    getFormatter(),
  ])

  const stateLabelFor = (state: string) => {
    if (state === "pending") return t("stateLabels.pending")
    if (state === "approved") return t("stateLabels.approved")
    if (state === "rejected") return t("stateLabels.rejected")
    if (state === "cancelled") return t("stateLabels.cancelled")
    if (state === "repaid") return t("stateLabels.repaid")
    if (state === "deducted") return t("stateLabels.deducted")
    return state
  }

  const listConfiguration = buildSalaryAdvanceOrgListSurfaceConfiguration(
    advances,
    {
      empty: t("tableEmpty"),
      colEmployee: t("fieldEmployee"),
      colAmount: t("fieldAmount"),
      colState: t("colState"),
      colRequested: t("colRequested"),
      colReason: t("fieldReason"),
      stateLabelFor,
      formatRequestedAt: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
    }
  )

  const advanceById = new Map(advances.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:payroll:advances-org"
      trailingColumn={
        isAdmin
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const row = advanceById.get(surfaceRow.id)
                if (!row || row.state !== "pending") return null
                return (
                  <div className="flex min-w-[14rem] flex-col gap-2">
                    <form
                      action={submitDecideSalaryAdvance}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="advanceId" value={row.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <Textarea
                        name="decisionNote"
                        rows={2}
                        placeholder={t("decisionNotePlaceholder")}
                        className="text-xs"
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        className="w-fit"
                      >
                        {t("approve")}
                      </Button>
                    </form>
                    <form
                      action={submitDecideSalaryAdvance}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="advanceId" value={row.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <Textarea
                        name="decisionNote"
                        rows={2}
                        placeholder={t("decisionNotePlaceholder")}
                        className="text-xs"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="w-fit"
                      >
                        {t("reject")}
                      </Button>
                    </form>
                  </div>
                )
              },
            }
          : undefined
      }
    />
  )
}
