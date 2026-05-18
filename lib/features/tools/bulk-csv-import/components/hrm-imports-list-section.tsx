import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildHrmImportListSurfaceConfiguration } from "../data/hrm-import-list-surface.server"
import type { HrmImportSessionListRow } from "../data/hrm-import.queries.server"

import { HrmImportSessionRowActions } from "./hrm-import-session-row-actions.client"

type HrmImportsListSectionProps = {
  orgSlug: string
  sessions: readonly HrmImportSessionListRow[]
}

export async function HrmImportsListSection({
  orgSlug,
  sessions,
}: HrmImportsListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.imports"),
    getFormatter(),
  ])

  const listConfiguration = buildHrmImportListSurfaceConfiguration(sessions, {
    empty: t("recentEmpty"),
    colType: t("rowsLabel"),
    colRows: "Rows",
    colStatus: "Status",
    colUpdated: "Updated",
    formatUpdatedAt: (date) =>
      format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
  })

  const sessionById = new Map(sessions.map((session) => [session.id, session]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="tools:hrm-import:sessions"
      resolveConfiguredPermission={false}
      trailingColumn={{
        header: "Actions",
        render: (surfaceRow) => {
          const session = sessionById.get(surfaceRow.id)
          if (!session) return null
          return (
            <HrmImportSessionRowActions orgSlug={orgSlug} session={session} />
          )
        },
      }}
    />
  )
}
