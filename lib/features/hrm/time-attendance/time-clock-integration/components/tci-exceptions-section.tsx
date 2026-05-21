import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  GovernedTrailingActionSlot,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface/client"

import { buildTimeClockExceptionsListSurfaceConfiguration } from "../data/tci-surface-builders.server"
import {
  toTimeClockListLoadError,
  type TimeClockLoadError,
} from "../data/tci-load-error.shared"
import type { TimeClockExceptionRow } from "../data/tci.queries.server"

import { TimeClockExceptionDecisionForms } from "./tci-exception-decision-forms.client"
import { TimeClockExceptionLamCorrection } from "./tci-exception-lam-correction.client"

export async function TimeClockExceptionsSection({
  rows,
  canDecide,
  canCorrectAttendance,
  parentAccessAllowed = true,
  loadError,
}: {
  rows: readonly TimeClockExceptionRow[]
  canDecide: boolean
  canCorrectAttendance: boolean
  parentAccessAllowed?: boolean
  loadError?: TimeClockLoadError
}) {
  const t = await getTranslations("Dashboard.Hrm.timeClock.exceptions")
  const format = await getFormatter()

  const listConfiguration = buildTimeClockExceptionsListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colEmployee: t("colEmployee"),
      colDevice: t("colDevice"),
      colEvent: t("colEvent"),
      colOutcome: t("colOutcome"),
      colOccurred: t("colOccurred"),
      formatOccurred: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
      decideLabel: t("decideAction"),
    },
    { canDecide }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={t("title")}
      description={t("description")}
      surfaceKey="hrm:time-clock:exceptions"
      listConfiguration={listConfiguration}
      parentAccessAllowed={parentAccessAllowed}
      resolveConfiguredPermission={false}
      loadError={toTimeClockListLoadError(loadError)}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (!row) return null

          const showDecide =
            canDecide &&
            row.state === "submitted" &&
            isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)

          const showCorrection =
            canCorrectAttendance &&
            row.state === "approved" &&
            row.resolvedEventId != null

          if (!showDecide && !showCorrection) return null

          return (
            <div className="flex flex-wrap items-center gap-2">
              {showDecide ? (
                <GovernedTrailingActionSlot
                  trailingAction={surfaceRow.trailingAction}
                >
                  <TimeClockExceptionDecisionForms exceptionId={row.id} />
                </GovernedTrailingActionSlot>
              ) : null}
              {showCorrection && row.resolvedEventId ? (
                <TimeClockExceptionLamCorrection
                  resolvedEventId={row.resolvedEventId}
                  occurredAtIso={row.occurredAt.toISOString()}
                  eventType={row.eventType}
                />
              ) : null}
            </div>
          )
        },
      }}
    />
  )
}
