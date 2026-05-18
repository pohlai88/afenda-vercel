"use client"

import { useMemo, useState } from "react"
import { z } from "zod"

import type { GovernedComponent } from "#features/governed-surface/client"
import { governedComponentDiscriminatedSchema } from "#features/governed-surface/schemas/component.schema"
import { GovernedComponentRenderer } from "#components2/metadata"
import type { GovernedComponentRendererDiagnostics } from "#components2/metadata/registry"
import { Button } from "#components2/ui/button"
import { Textarea } from "#components2/ui/textarea"

export type GalleryFixtureEditorProps = {
  scenarioId: string
  initialComponent: GovernedComponent
  widthPx?: number
  diagnostics: GovernedComponentRendererDiagnostics
}

function parseFixtureJson(jsonText: string): {
  component: GovernedComponent | null
  error: string | null
} {
  try {
    const raw: unknown = JSON.parse(jsonText)
    const parsed = governedComponentDiscriminatedSchema.safeParse(raw)
    if (!parsed.success) {
      return { component: null, error: parsed.error.message }
    }
    return { component: parsed.data, error: null }
  } catch (error) {
    return {
      component: null,
      error: error instanceof Error ? error.message : "Invalid JSON",
    }
  }
}

export function GalleryFixtureEditor({
  scenarioId,
  initialComponent,
  widthPx = 480,
  diagnostics,
}: GalleryFixtureEditorProps) {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(initialComponent, null, 2)
  )

  const { component: parsedComponent, error: parseError } = useMemo(
    () => parseFixtureJson(jsonText),
    [jsonText]
  )

  const jsonSchemaText = useMemo(() => {
    try {
      return JSON.stringify(
        z.toJSONSchema(governedComponentDiscriminatedSchema),
        null,
        2
      )
    } catch {
      return null
    }
  }, [])

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4">
      <p className="text-sm font-medium">Fixture playground</p>
      <Textarea
        value={jsonText}
        onChange={(event) => setJsonText(event.target.value)}
        className="min-h-40 font-mono text-xs"
        spellCheck={false}
        aria-label="Governed component JSON"
      />
      {parseError ? (
        <p className="text-sm text-destructive" role="status">
          {parseError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setJsonText(JSON.stringify(initialComponent, null, 2))}
        >
          Reset fixture
        </Button>
        {jsonSchemaText ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(jsonSchemaText)
            }}
          >
            Copy envelope JSON Schema
          </Button>
        ) : null}
      </div>
      {parsedComponent ? (
        <div
          className="rounded-2xl border border-border/60 bg-card/40 p-4"
          style={{ maxWidth: widthPx }}
        >
          <GovernedComponentRenderer
            component={parsedComponent}
            diagnostics={diagnostics}
            surfaceKey={`gallery:playground:${scenarioId}`}
          />
        </div>
      ) : null}
    </div>
  )
}
