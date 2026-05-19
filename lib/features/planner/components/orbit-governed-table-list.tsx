import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildOrbitLinksListSurfaceConfiguration } from "../data/orbit-links-list-surface.server"
import { buildOrbitSessionsListSurfaceConfiguration } from "../data/orbit-sessions-list-surface.server"
import { buildOrbitSignalsListSurfaceConfiguration } from "../data/orbit-signals-list-surface.server"
import { ORBIT_LIST_SURFACE_IDS } from "../orbit-surface-metadata.shared"
import type {
  OrbitSurface,
  PlannerLinkRow,
  PlannerSessionRow,
  PlannerSignalRow,
} from "../types"
import {
  orbitSurfaceUsesGovernedTable,
  toUrlSearchParams,
  type OrbitSearchParams,
} from "../views/orbit-page.shared"

type OrbitGovernedTableListProps = {
  surface: OrbitSurface
  basePath: string
  searchParams?: OrbitSearchParams
  sessions: readonly PlannerSessionRow[]
  links: readonly PlannerLinkRow[]
  signals: readonly PlannerSignalRow[]
  parentAccessAllowed: boolean
}

export async function OrbitGovernedTableList({
  surface,
  basePath,
  searchParams,
  sessions,
  links,
  signals,
  parentAccessAllowed,
}: OrbitGovernedTableListProps) {
  if (!orbitSurfaceUsesGovernedTable(surface)) {
    return null
  }

  const t = await getTranslations("Dashboard.Orbit")
  const currentSearchParams = toUrlSearchParams(searchParams)

  if (surface === "sessions") {
    const listConfiguration = buildOrbitSessionsListSurfaceConfiguration(
      sessions,
      {
        empty: t("panels.emptyDescription"),
        colItem: t("panels.listTitle"),
        colStatus: "Status",
        colStarted: "Started",
        colDuration: "Duration",
      },
      basePath,
      currentSearchParams
    )
    return (
      <GovernedPatternCListSection
        title={t("panels.listTitle")}
        description={t(`surfaces.${surface}.description`)}
        listConfiguration={listConfiguration}
        surfaceKey={ORBIT_LIST_SURFACE_IDS.sessions}
        parentAccessAllowed={parentAccessAllowed}
        layout="embedded"
      />
    )
  }

  if (surface === "links") {
    const listConfiguration = buildOrbitLinksListSurfaceConfiguration(
      links,
      {
        empty: t("panels.emptyDescription"),
        colLabel: "Label",
        colModule: "Module",
        colEntity: "Entity",
        colReason: "Causality",
      },
      basePath,
      currentSearchParams
    )
    return (
      <GovernedPatternCListSection
        title={t("panels.listTitle")}
        description={t(`surfaces.${surface}.description`)}
        listConfiguration={listConfiguration}
        surfaceKey={ORBIT_LIST_SURFACE_IDS.links}
        parentAccessAllowed={parentAccessAllowed}
        layout="embedded"
      />
    )
  }

  const listConfiguration = buildOrbitSignalsListSurfaceConfiguration(
    signals,
    {
      empty: t("panels.emptyDescription"),
      colTitle: "Signal",
      colClass: "Class",
      colLifecycle: "Lifecycle",
      colPressure: "Pressure",
    },
    basePath,
    currentSearchParams
  )
  return (
    <GovernedPatternCListSection
      title={t("panels.listTitle")}
      description={t(`surfaces.${surface}.description`)}
      listConfiguration={listConfiguration}
      surfaceKey={ORBIT_LIST_SURFACE_IDS.signals}
      parentAccessAllowed={parentAccessAllowed}
      layout="embedded"
    />
  )
}
