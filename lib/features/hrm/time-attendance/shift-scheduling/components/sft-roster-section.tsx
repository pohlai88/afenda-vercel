import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildSftEmbeddedListSurfaceErrorConfiguration } from "../data/sft-embedded-list-surface-error.server"
import { buildSftRosterListSurfaceConfiguration } from "../data/sft-surface-builders.server"
import {
  listRosterAssignmentsForOrg,
  type SftRosterListFilters,
} from "../data/sft-roster.queries.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"
import { SftRosterFilters } from "./sft-roster-filters"

export async function SftRosterSection({
  organizationId,
  orgSlug,
  rangeStart,
  rangeEnd,
  rosterFilters = {},
}: {
  organizationId: string
  orgSlug: string
  rangeStart: string
  rangeEnd: string
  rosterFilters?: SftRosterListFilters
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")

  let rows: Awaited<ReturnType<typeof listRosterAssignmentsForOrg>>
  try {
    rows = await listRosterAssignmentsForOrg({
      organizationId,
      rangeStart,
      rangeEnd,
      filters: rosterFilters,
    })
  } catch (err) {
    logUnexpectedServerError("sft-roster-section: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("rosterTitle")}</CardTitle>
          <CardDescription>
            {t("rosterDescription", { rangeStart, rangeEnd })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildSftEmbeddedListSurfaceErrorConfiguration({
              columnsId: SFT_LIST_SURFACE_IDS.roster,
              emptyTitle: t("rosterEmpty"),
              firstColumn: { id: "date", header: t("colDate") },
            })}
            surfaceKey="hrm:shift-scheduling:roster:error"
            resolveConfiguredPermission={false}
            loadError={{ variant: "error", title: t("rosterLoadFailed") }}
          />
        </CardContent>
      </Card>
    )
  }

  const listConfiguration = buildSftRosterListSurfaceConfiguration(rows, {
    empty: t("rosterEmpty"),
    colDate: t("colDate"),
    colEmployee: t("colEmployee"),
    colShift: t("colShift"),
    colWindow: t("colWindow"),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("rosterTitle")}</CardTitle>
        <CardDescription>
          {t("rosterDescription", { rangeStart, rangeEnd })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SftRosterFilters
          organizationId={organizationId}
          orgSlug={orgSlug}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          filters={rosterFilters}
        />
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.roster}
          invalid={{
            variant: "error",
            title: t("rosterLoadFailed"),
          }}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.roster}`}
        />
      </CardContent>
    </Card>
  )
}
