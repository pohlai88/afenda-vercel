"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"

import { KanbanBoardView } from "#components2/metadata/renderers/kanban-board-view"

import {
  parseGovernedKanbanBoardConfiguration,
  type GovernedKanbanBoardConfigurationInput,
  type KanbanCard,
} from "#features/governed-surface/client"
import { GovernedEmpty } from "./governed-empty"

export type GovernedKanbanFooterBoardProps = {
  configuration: GovernedKanbanBoardConfigurationInput
  surfaceKey?: string
  renderCardFooter?: (card: KanbanCard) => ReactNode
  /** When true, invalid-config copy includes schema id (dev / operator). */
  showOperatorDiagnostics?: boolean
}

/**
 * Client bridge for `interactionMode: "footer-actions"` kanban boards.
 * Domain modules supply Server Action forms via `renderCardFooter`.
 */
export function GovernedKanbanFooterBoard({
  configuration,
  surfaceKey,
  renderCardFooter,
  showOperatorDiagnostics = false,
}: GovernedKanbanFooterBoardProps) {
  const t = useTranslations("Dashboard.GovernedSurface.kanban")
  const parsed = parseGovernedKanbanBoardConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: t("invalidConfigTitle"),
          description: showOperatorDiagnostics
            ? t("invalidConfigDescriptionOperator")
            : t("invalidConfigDescription"),
        }}
      />
    )
  }

  if (parsed.data.interactionMode !== "footer-actions") {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: t("invalidConfigTitle"),
          description: t("invalidInteractionMode"),
        }}
      />
    )
  }

  return (
    <KanbanBoardView
      board={parsed.data}
      surfaceKey={surfaceKey}
      renderCardFooter={renderCardFooter}
    />
  )
}
