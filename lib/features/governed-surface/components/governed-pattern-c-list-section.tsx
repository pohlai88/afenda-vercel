import "server-only"

import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import {
  GovernedListSurfaceWithTrailingColumn,
  type ListSurfaceTableTrailingColumn,
} from "#components2/metadata"
import { logUnexpectedServerError } from "#lib/logger.server"

import type { EmptyState } from "../schemas/list-surface.schema"
import {
  parseListSurfaceRendererConfiguration,
  type ListSurfaceRendererConfigurationInput,
} from "../schemas/list-surface-renderer.schema"
import { resolveGovernedErpPermissionAllowed } from "../data/governed-permission-gate.server"
import { logGovernedListSurfaceRender } from "../log-governed-list-surface-render.server"
import {
  governedListSectionTestId as buildGovernedListSectionTestId,
  summarizeListSurfaceTrailingActions,
} from "../list-surface-identity.shared"
import { GovernedEmpty } from "./governed-empty"
import {
  GovernedSurfaceSectionCard,
  type GovernedSurfaceSectionCardBody,
} from "./governed-surface-section-card"

export type GovernedPatternCListSectionLayout = "card" | "embedded"

export type GovernedPatternCListSectionProps = {
  title: string
  description?: string
  listConfiguration: ListSurfaceRendererConfigurationInput
  surfaceKey: string
  layout?: GovernedPatternCListSectionLayout
  /** Query/load failure before permission or parse — uses same card/embedded shell as other states. */
  loadError?: EmptyState
  /**
   * Parent section already decided read access (e.g. page-level ERP permission).
   * Default `true`.
   */
  parentAccessAllowed?: boolean
  /**
   * When `true`, evaluate `listConfiguration.requiresErpPermission` via
   * `resolveGovernedErpPermissionAllowed`. Default `true`.
   */
  resolveConfiguredPermission?: boolean
  forbidden?: EmptyState
  invalid?: EmptyState
  headerSlot?: ReactNode
  contentBeforeList?: ReactNode
  contentAfterList?: ReactNode
  trailingColumn?: ListSurfaceTableTrailingColumn
  className?: string
  cardClassName?: string
  contentClassName?: string
}

function renderListBody(body: GovernedSurfaceSectionCardBody) {
  if (body.state === "forbidden" || body.state === "invalid") {
    return <GovernedEmpty model={body.model} />
  }
  return body.children
}

type RenderSectionShellInput = {
  layout: GovernedPatternCListSectionLayout
  className?: string
  sectionTestId: string
  headerSlot?: ReactNode
  title: string
  description?: string
  body: GovernedSurfaceSectionCardBody
  cardClassName?: string
  contentClassName?: string
}

function renderSectionShell({
  layout,
  className,
  sectionTestId,
  headerSlot,
  title,
  description,
  body,
  cardClassName,
  contentClassName,
}: RenderSectionShellInput) {
  const listBody = renderListBody(body)

  if (layout === "embedded") {
    return (
      <div className={className} data-testid={sectionTestId}>
        {headerSlot}
        <div className={contentClassName}>{listBody}</div>
      </div>
    )
  }

  return (
    <div className={className} data-testid={sectionTestId}>
      {headerSlot}
      <GovernedSurfaceSectionCard
        title={title}
        description={description}
        body={body}
        className={cardClassName}
        contentClassName={contentClassName}
      />
    </div>
  )
}

export async function GovernedPatternCListSection({
  title,
  description,
  listConfiguration,
  surfaceKey,
  layout = "card",
  loadError,
  parentAccessAllowed = true,
  resolveConfiguredPermission = true,
  forbidden,
  invalid,
  headerSlot,
  contentBeforeList,
  contentAfterList,
  trailingColumn,
  className,
  cardClassName,
  contentClassName,
}: GovernedPatternCListSectionProps) {
  const t = await getTranslations("Dashboard")
  const sectionTestId = buildGovernedListSectionTestId(surfaceKey)

  const shellInput = {
    layout,
    className,
    sectionTestId,
    headerSlot,
    title,
    description,
    cardClassName,
    contentClassName,
  }

  if (loadError) {
    const body: GovernedSurfaceSectionCardBody = {
      state: "invalid",
      model: loadError,
    }
    return renderSectionShell({ ...shellInput, body })
  }

  const [allowedFromConfig, parsed] = await Promise.all([
    resolveConfiguredPermission
      ? resolveGovernedErpPermissionAllowed(
          listConfiguration.requiresErpPermission
        )
      : Promise.resolve(true),
    Promise.resolve(parseListSurfaceRendererConfiguration(listConfiguration)),
  ])
  const allowed = parentAccessAllowed && allowedFromConfig

  const forbiddenModel: EmptyState = forbidden ?? {
    variant: "forbidden",
    title: t("GovernedSurface.forbiddenTitle"),
    description: t("GovernedSurface.forbiddenDescription"),
  }
  const invalidModel: EmptyState = invalid ?? {
    variant: "error",
    title: t("GovernedSurface.invalidConfigTitle"),
    description: t("GovernedSurface.invalidConfigDescription"),
  }

  let body: GovernedSurfaceSectionCardBody
  if (!allowed) {
    body = { state: "forbidden", model: forbiddenModel }
  } else if (!parsed.success) {
    logUnexpectedServerError(
      "GovernedPatternCListSection invalid list configuration",
      parsed.error,
      { surfaceKey }
    )
    body = { state: "invalid", model: invalidModel }
  } else {
    const isEmpty = parsed.data.rows.length === 0
    const listState = isEmpty ? "empty" : "ready"
    const tableDensity = parsed.data.presentation?.tableDensity ?? "compact"
    const presentationVariant =
      parsed.data.presentation?.variant ?? "table-only"

    logGovernedListSurfaceRender({
      surfaceKey,
      columnsId: parsed.data.surface.columnsId,
      dataNature: parsed.data.dataNature,
      presentationVariant,
      density: tableDensity,
      state: listState,
      rowCount: parsed.data.rows.length,
      trailing: summarizeListSurfaceTrailingActions(parsed.data.rows),
    })

    body = {
      state: listState,
      children: (
        <>
          {contentBeforeList}
          <GovernedListSurfaceWithTrailingColumn
            surfaceKey={surfaceKey}
            columnsId={parsed.data.surface.columnsId}
            dataNature={parsed.data.dataNature}
            presentationVariant={presentationVariant}
            columns={parsed.data.columns}
            rows={parsed.data.rows}
            empty={parsed.data.surface.empty}
            trailingColumn={trailingColumn}
            density={tableDensity}
          />
          {contentAfterList}
        </>
      ),
    }
  }

  return renderSectionShell({ ...shellInput, body })
}
