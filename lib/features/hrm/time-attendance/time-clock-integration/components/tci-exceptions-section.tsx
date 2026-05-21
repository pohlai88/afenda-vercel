import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildTimeClockExceptionsListSurfaceConfiguration } from "../data/tci-surface-builders.server"
import {
  toTimeClockListLoadError,
  type TimeClockLoadError,
} from "../data/tci-load-error.shared"
import type { TimeClockExceptionRow } from "../data/tci.queries.server"

import { TimeClockExceptionDecisionForms } from "./tci-exception-decision-forms.client"

export async function TimeClockExceptionsSection({
  rows,
  canDecide,
  loadError,
}: {
  rows: readonly TimeClockExceptionRow[]
  canDecide: boolean
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
      loadError={toTimeClockListLoadError(loadError)}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (
            !row ||
            !canDecide ||
            !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
          ) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={surfaceRow.trailingAction}>
              <TimeClockExceptionDecisionForms exceptionId={row.id} />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
