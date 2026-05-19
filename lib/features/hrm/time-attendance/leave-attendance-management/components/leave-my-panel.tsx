import { getTranslations } from "next-intl/server"

import {
  GovernedEmpty,
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { requireOrgSession } from "#lib/auth"

import {
  buildLeaveBalanceListSurfaceConfiguration,
  buildLeaveMyHistoryListSurfaceConfiguration,
} from "../data/leave-list-surface.server"
import {
  findLeaveEmployeeForUser,
  listLeaveBalancesForEmployee,
  listLeaveRequestsForEmployee,
  type LeaveTypeChoiceRow,
} from "../data/leave-request.queries.server"

import { LeaveCancelButton } from "./leave-cancel-button"
import { LeaveOwnRequestForm } from "./leave-own-request-form"

type LeaveMyPanelProps = {
  leaveTypes: LeaveTypeChoiceRow[]
}

export async function LeaveMyPanel({ leaveTypes }: LeaveMyPanelProps) {
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.leave")
  const employee = await findLeaveEmployeeForUser(
    session.organizationId,
    session.userId
  )

  if (!employee) {
    return (
      <GovernedEmpty
        model={{
          variant: "muted",
          title: t("selfServiceNoEmployee"),
        }}
      />
    )
  }

  const [balances, requests] = await Promise.all([
    listLeaveBalancesForEmployee(
      session.organizationId,
      employee.id,
      new Date().getFullYear()
    ),
    listLeaveRequestsForEmployee(session.organizationId, employee.id),
  ])

  const stateLabelFor = (state: string) => t(`state.${state}` as "state.draft")

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

  const historyRows = requests.slice(0, 10)
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h3 className="text-label-small font-medium">
            {t("myBalancesTitle")}
          </h3>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={balanceConfiguration}
            surfaceKey="hrm:leave:my-balances"
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-label-small font-medium">
            {t("myHistoryTitle")}
          </h3>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={historyConfiguration}
            surfaceKey="hrm:leave:my-history"
            trailingColumn={{
              header: t("colActions"),
              render: (surfaceRow) => {
                const request = requestById.get(surfaceRow.id)
                if (
                  !request ||
                  !isListSurfaceTrailingActionRenderable(
                    surfaceRow.trailingAction
                  )
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot
                    trailingAction={surfaceRow.trailingAction}
                  >
                    <LeaveCancelButton requestId={request.id} />
                  </GovernedTrailingActionSlot>
                )
              },
            }}
          />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-label-small font-medium">
          {t("requestLeaveTitle")}
        </h3>
        {leaveTypes.length === 0 ? (
          <GovernedEmpty
            model={{
              variant: "muted",
              title: t("requestLeaveNoTypes"),
            }}
          />
        ) : (
          <LeaveOwnRequestForm leaveTypes={leaveTypes} />
        )}
      </section>
    </div>
  )
}
