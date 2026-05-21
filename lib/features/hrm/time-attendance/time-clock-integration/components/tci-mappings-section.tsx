import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildTimeClockMappingsListSurfaceConfiguration } from "../data/tci-surface-builders.server"
import {
  toTimeClockListLoadError,
  type TimeClockLoadError,
} from "../data/tci-load-error.shared"
import type { TimeClockMappingRow } from "../data/tci.queries.server"

import { TimeClockMappingUpsertDialog } from "./tci-device-forms.client"

type EmployeeChoice = { readonly id: string; readonly label: string }

export async function TimeClockMappingsSection({
  rows,
  canManage,
  employeeChoices,
  deviceChoices,
  loadError,
}: {
  rows: readonly TimeClockMappingRow[]
  canManage: boolean
  employeeChoices: ReadonlyArray<EmployeeChoice>
  deviceChoices: ReadonlyArray<EmployeeChoice>
  loadError?: TimeClockLoadError
}) {
  const t = await getTranslations("Dashboard.Hrm.timeClock.mappings")

  const listConfiguration = buildTimeClockMappingsListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colEmployee: t("colEmployee"),
      colDevice: t("colDevice"),
      colClockUser: t("colClockUser"),
      colBadge: t("colBadge"),
      colState: t("colState"),
    }
  )

  return (
    <GovernedPatternCListSection
      title={t("title")}
      description={t("description")}
      surfaceKey="hrm:time-clock:mappings"
      listConfiguration={listConfiguration}
      loadError={toTimeClockListLoadError(loadError)}
      headerSlot={
        canManage ? (
          <div className="flex justify-end">
            <TimeClockMappingUpsertDialog
              employees={employeeChoices}
              devices={deviceChoices}
            />
          </div>
        ) : null
      }
    />
  )
}
