"use client"

import { useState } from "react"

import { Button } from "#components2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "#components2/ui/card"
import { Label } from "#components2/ui/label"
import { Textarea } from "#components2/ui/textarea"
import type {
  GovernedScorecardFormConfiguration,
  ScorecardCriterion,
  ScorecardFormDataNature,
} from "#features/governed-surface/schemas/scorecard-form.schema"
import { densityGapClass } from "#features/governed-surface/schemas/surface-chrome.classes"
import { cn } from "#lib/utils"

const DATA_NATURE_CLASS: Record<ScorecardFormDataNature, string> = {
  scoring: "@container flex flex-col gap-4",
}

export function ScorecardFormSurface({
  form,
}: {
  form: GovernedScorecardFormConfiguration
}) {
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(form.criteria.map((c) => [c.id, 0]))
  )

  return (
    <section
      aria-label={form.title}
      className={DATA_NATURE_CLASS[form.dataNature]}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{form.title}</CardTitle>
        </CardHeader>
        <CardContent
          className={cn("flex flex-col", densityGapClass(form.chrome?.density))}
        >
          <ul className="flex flex-col gap-4">
            {form.criteria.map((criterion) => (
              <li key={criterion.id}>
                <CriterionRow
                  criterion={criterion}
                  value={scores[criterion.id] ?? 0}
                  onSelect={(score) =>
                    setScores((prev) => ({ ...prev, [criterion.id]: score }))
                  }
                />
              </li>
            ))}
          </ul>
          {form.notesFieldId ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={form.notesFieldId}>Notes</Label>
              <Textarea
                id={form.notesFieldId}
                name={form.notesFieldId}
                rows={3}
              />
            </div>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="w-fit"
            data-form-id={form.formId}
            data-action-id={form.actionId}
          >
            {form.submitLabel}
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function CriterionRow({
  criterion,
  value,
  onSelect,
}: {
  criterion: ScorecardCriterion
  value: number
  onSelect: (score: number) => void
}) {
  const max = criterion.maxScore

  return (
    <div className="flex flex-col gap-2 border-b border-border/60 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{criterion.label}</p>
        {criterion.description ? (
          <p className="text-xs text-muted-foreground">
            {criterion.description}
          </p>
        ) : null}
      </div>
      <div
        className="flex flex-wrap gap-1"
        role="radiogroup"
        aria-label={`Score for ${criterion.label}`}
      >
        {Array.from({ length: max }, (_, index) => {
          const score = index + 1
          return (
            <Button
              key={score}
              type="button"
              size="sm"
              variant={value === score ? "default" : "outline"}
              className="size-8 p-0 text-xs"
              aria-pressed={value === score}
              onClick={() => onSelect(score)}
            >
              {score}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
