import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import type { EmptyState } from "#features/governed-surface/schemas/list-surface.schema"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import {
  fwaArrangementKindMessageKey,
  formatFwaDateRange,
} from "../data/fwa-display.shared"
import {
  buildFwaActiveListSurfaceConfiguration,
  buildFwaActiveManageListSurfaceConfiguration,
  buildFwaArrangementTypesListSurfaceConfiguration,
} from "../data/fwa-surface-builders.server"
import { FwaLifecycleForms } from "./fwa-lifecycle-forms.client"
import { FWA_LIST_SURFACE_IDS } from "../data/fwa-surface-metadata.shared"
import type {
  FwaArrangementTypeChoiceRow,
  OrgFwaRequestRow,
} from "../data/fwa.types.shared"
import type { HrmFwaArrangementKind } from "../schemas/fwa-workflow-state.shared"
import { FwaCreateTypeDialog } from "./fwa-create-type-dialog"
import { FwaSeedTypesButton } from "./fwa-seed-types-button"

type FwaListLoadError = Pick<EmptyState, "title"> & {
  variant?: EmptyState["variant"]
}

export async function FwaArrangementTypesSection({
  types,
  canManage,
  loadError,
}: {
  types: readonly FwaArrangementTypeChoiceRow[]
  canManage: boolean
  loadError?: FwaListLoadError
}) {
  const t = await getTranslations("Dashboard.Hrm.flexibleWork")

  if (loadError) {
    return (
      <GovernedPatternCListSection
        title={t("typesTitle")}
        description={t("typesDescription")}
        surfaceKey="hrm:flexible-work:types:error"
        resolveConfiguredPermission={false}
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: FWA_LIST_SURFACE_IDS.types },
            columnsId: FWA_LIST_SURFACE_IDS.types,
            rowKey: "id",
            empty: { variant: "muted", title: t("typesEmpty") },
          },
          columns: [{ id: "code", header: t("colCode") }],
          rows: [],
        }}
        loadError={{
          variant: loadError.variant ?? "error",
          title: loadError.title,
        }}
      />
    )
  }

  if (types.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("noTypesTitle")}</CardTitle>
          <CardDescription>{t("noTypesBody")}</CardDescription>
        </CardHeader>
        {canManage ? (
          <CardContent className="flex flex-wrap gap-2">
            <FwaSeedTypesButton />
            <FwaCreateTypeDialog />
          </CardContent>
        ) : null}
      </Card>
    )
  }

  return (
    <GovernedPatternCListSection
      title={t("typesTitle")}
      description={t("typesDescription")}
      surfaceKey="hrm:flexible-work:types"
      listConfiguration={buildFwaArrangementTypesListSurfaceConfiguration(
        types,
        {
          empty: t("typesEmpty"),
          colCode: t("colCode"),
          colLabel: t("colLabel"),
          colKind: t("colKind"),
          colRemoteRequired: t("colRemoteRequired"),
          kindLabelFor: (kind) =>
            t(fwaArrangementKindMessageKey(kind as HrmFwaArrangementKind)),
          yesNo: (value) => (value ? t("yes") : t("no")),
        }
      )}
      headerSlot={canManage ? <FwaCreateTypeDialog /> : undefined}
    />
  )
}

export async function FwaMyArrangementsSection({
  rows,
  loadError,
}: {
  rows: readonly OrgFwaRequestRow[]
  loadError?: FwaListLoadError
}) {
  const t = await getTranslations("Dashboard.Hrm.flexibleWork")
  const format = await getFormatter()

  return (
    <GovernedPatternCListSection
      title={t("myActiveTitle")}
      description={t("myActiveDescription")}
      surfaceKey="hrm:flexible-work:my-active"
      listConfiguration={buildFwaActiveListSurfaceConfiguration(rows, {
        columnsId: FWA_LIST_SURFACE_IDS.myActive,
        empty: t("myActiveEmpty"),
        colEmployee: t("colEmployee"),
        colType: t("colType"),
        colDates: t("colDates"),
        colState: t("colState"),
        colRequested: t("colRequested"),
        formatRequestedAt: (date) =>
          format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
        stateLabelFor: (state) =>
          t(`stateLabels.${state}` as "stateLabels.active"),
      })}
      loadError={
        loadError
          ? { variant: loadError.variant ?? "error", title: loadError.title }
          : undefined
      }
    />
  )
}

export async function FwaActiveArrangementsSection({
  rows,
  loadError,
  canManageLifecycle = false,
}: {
  rows: readonly OrgFwaRequestRow[]
  loadError?: FwaListLoadError
  canManageLifecycle?: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.flexibleWork")
  const format = await getFormatter()

  const copy = {
    columnsId: FWA_LIST_SURFACE_IDS.active,
    empty: t("activeEmpty"),
    colEmployee: t("colEmployee"),
    colType: t("colType"),
    colDates: t("colDates"),
    colState: t("colState"),
    colRequested: t("colRequested"),
    formatRequestedAt: (date: Date) =>
      format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
    stateLabelFor: (state: string) =>
      t(`stateLabels.${state}` as "stateLabels.active"),
  }

  const listConfiguration = canManageLifecycle
    ? buildFwaActiveManageListSurfaceConfiguration(rows, copy, {
        canManageLifecycle: true,
        manageLabel: t("manageLifecycleAction"),
      })
    : buildFwaActiveListSurfaceConfiguration(rows, copy)

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={t("activeTitle")}
      description={t("activeDescription")}
      surfaceKey="hrm:flexible-work:active"
      listConfiguration={listConfiguration}
      trailingColumn={
        canManageLifecycle
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const row = rowById.get(surfaceRow.id)
                if (
                  !row ||
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
                    <FwaLifecycleForms
                      requestId={row.id}
                      dateRange={formatFwaDateRange({
                        startDate: row.startDate,
                        endDate: row.endDate,
                      })}
                    />
                  </GovernedTrailingActionSlot>
                )
              },
            }
          : undefined
      }
      loadError={
        loadError
          ? { variant: loadError.variant ?? "error", title: loadError.title }
          : undefined
      }
    />
  )
}
