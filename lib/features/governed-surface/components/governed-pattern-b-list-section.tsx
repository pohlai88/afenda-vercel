import "server-only"

import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { GovernedComponentRenderer } from "#components2/metadata"
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

export type GovernedPatternBListSectionLayout = "card" | "embedded"

export type GovernedPatternBListSectionProps = {
  title: string
  description?: string
  listConfiguration: ListSurfaceRendererConfigurationInput
  surfaceKey: string
  layout?: GovernedPatternBListSectionLayout
  loadError?: EmptyState
  parentAccessAllowed?: boolean
  resolveConfiguredPermission?: boolean
  forbidden?: EmptyState
  invalid?: EmptyState
  headerSlot?: ReactNode
  /** Rendered inside `CardHeader` via `CardAction` (e.g. Add contact). */
  headerAction?: ReactNode
  contentBeforeList?: ReactNode
  contentAfterList?: ReactNode
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
  layout: GovernedPatternBListSectionLayout
  className?: string
  sectionTestId: string
  headerSlot?: ReactNode
  title: string
  description?: string
  headerAction?: ReactNode
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
  headerAction,
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
        headerAction={headerAction}
        className={cardClassName}
        contentClassName={contentClassName}
      />
    </div>
  )
}

export async function GovernedPatternBListSection({
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
  headerAction,
  contentBeforeList,
  contentAfterList,
  className,
  cardClassName,
  contentClassName,
}: GovernedPatternBListSectionProps) {
  const t = await getTranslations("Dashboard")
  const sectionTestId = buildGovernedListSectionTestId(surfaceKey)

  const shellInput = {
    layout,
    className,
    sectionTestId,
    headerSlot,
    title,
    description,
    headerAction,
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
      "GovernedPatternBListSection invalid list configuration",
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
          <GovernedComponentRenderer
            component={{
              type: "governed:list-surface",
              serverType: "governed:list-surface",
              configuration: parsed.data,
            }}
            surfaceKey={surfaceKey}
          />
          {contentAfterList}
        </>
      ),
    }
  }

  return renderSectionShell({ ...shellInput, body })
}
