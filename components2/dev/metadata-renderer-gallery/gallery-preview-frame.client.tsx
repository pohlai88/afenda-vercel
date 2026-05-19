"use client"

import { useState } from "react"

import {
  governedComponentDiscriminatedSchema,
  type GovernedComponent,
  type GovernedKanbanBoardConfigurationInput,
} from "#features/governed-surface/client"
import { GovernedComponentRenderer } from "#components2/metadata"
import type { GovernedComponentRendererDiagnostics } from "#components2/metadata/registry"
import { Button } from "#components2/ui/button"

import { GalleryFixtureEditor } from "./gallery-fixture-editor.client"
import { GalleryKanbanDragPreview } from "./gallery-kanban-drag-preview.client"
import { GalleryKanbanFooterPreview } from "./gallery-kanban-footer-preview.client"
import type { GalleryPreviewMode } from "#features/dev/client"

const WIDTH_PRESETS = [
  { id: "full", label: "Full", px: undefined as number | undefined },
  { id: "960", label: "960px", px: 960 },
  { id: "720", label: "720px", px: 720 },
  { id: "480", label: "480px", px: 480 },
  { id: "280", label: "280px", px: 280 },
] as const

export type GalleryPreviewFrameProps = {
  scenarioId: string
  title: string
  description: string
  minWidthPx?: number
  component: GovernedComponent
  defaultDiagnostics?: GovernedComponentRendererDiagnostics
  previewMode?: GalleryPreviewMode
}

export function GalleryPreviewFrame({
  scenarioId,
  title,
  description,
  minWidthPx,
  component,
  defaultDiagnostics = "user",
  previewMode = "default",
}: GalleryPreviewFrameProps) {
  const [widthPx, setWidthPx] = useState<number | undefined>(minWidthPx ?? 480)
  const [diagnostics, setDiagnostics] =
    useState<GovernedComponentRendererDiagnostics>(defaultDiagnostics)
  const [showPlayground, setShowPlayground] = useState(false)

  return (
    <section id={scenarioId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {description}
          {minWidthPx != null ? ` · contract min ${minWidthPx}px` : null}
        </p>
      </div>
      <GalleryToolbar
        component={component}
        widthPx={widthPx}
        onWidthChange={setWidthPx}
        diagnostics={diagnostics}
        onDiagnosticsChange={setDiagnostics}
        showPlayground={showPlayground}
        onShowPlaygroundChange={setShowPlayground}
      />
      <div
        className="rounded-2xl border border-border/60 bg-card/40 p-4"
        style={widthPx != null ? { maxWidth: widthPx } : undefined}
      >
        {previewMode === "kanban-footer-actions" ? (
          <GalleryKanbanFooterPreview
            configuration={
              component.configuration as GovernedKanbanBoardConfigurationInput
            }
            diagnostics={diagnostics}
          />
        ) : previewMode === "kanban-drag-reorder" ? (
          <GalleryKanbanDragPreview
            configuration={
              component.configuration as GovernedKanbanBoardConfigurationInput
            }
            diagnostics={diagnostics}
          />
        ) : (
          <GovernedComponentRenderer
            component={component}
            diagnostics={diagnostics}
            surfaceKey={`gallery:${scenarioId}`}
          />
        )}
      </div>
      {showPlayground ? (
        <GalleryFixtureEditor
          scenarioId={scenarioId}
          initialComponent={component}
          widthPx={widthPx}
          diagnostics={diagnostics}
        />
      ) : null}
    </section>
  )
}

function GalleryToolbar({
  component,
  widthPx,
  onWidthChange,
  diagnostics,
  onDiagnosticsChange,
  showPlayground,
  onShowPlaygroundChange,
}: {
  component: GovernedComponent
  widthPx: number | undefined
  onWidthChange: (px: number | undefined) => void
  diagnostics: GovernedComponentRendererDiagnostics
  onDiagnosticsChange: (d: GovernedComponentRendererDiagnostics) => void
  showPlayground: boolean
  onShowPlaygroundChange: (value: boolean) => void
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  )

  async function copyFixtureEnvelope() {
    const parsed = governedComponentDiscriminatedSchema.safeParse(component)
    const payload = parsed.success ? parsed.data : component
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setCopyState("copied")
      window.setTimeout(() => setCopyState("idle"), 2000)
    } catch {
      setCopyState("error")
    }
  }

  const copyLabel =
    copyState === "copied"
      ? "Copied"
      : copyState === "error"
        ? "Copy failed"
        : "Copy envelope"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-label-small text-muted-foreground">Width</span>
      {WIDTH_PRESETS.map((preset) => (
        <Button
          key={preset.id}
          type="button"
          size="sm"
          variant={widthPx === preset.px ? "secondary" : "outline"}
          onClick={() => onWidthChange(preset.px)}
        >
          {preset.label}
        </Button>
      ))}
      <span className="mx-2 text-border" aria-hidden>
        |
      </span>
      <span className="text-label-small text-muted-foreground">
        Diagnostics
      </span>
      <Button
        type="button"
        size="sm"
        variant={diagnostics === "user" ? "secondary" : "outline"}
        onClick={() => onDiagnosticsChange("user")}
      >
        user
      </Button>
      <Button
        type="button"
        size="sm"
        variant={diagnostics === "operator" ? "secondary" : "outline"}
        onClick={() => onDiagnosticsChange("operator")}
      >
        operator
      </Button>
      <span className="mx-2 text-border" aria-hidden>
        |
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={copyFixtureEnvelope}
      >
        {copyLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={showPlayground ? "secondary" : "outline"}
        onClick={() => onShowPlaygroundChange(!showPlayground)}
      >
        {showPlayground ? "Hide playground" : "Edit fixture"}
      </Button>
    </div>
  )
}
