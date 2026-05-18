"use client"

import { useState } from "react"

import { Button } from "#components2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "#components2/ui/card"
import { Checkbox } from "#components2/ui/checkbox"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components2/ui/select"
import { Textarea } from "#components2/ui/textarea"
import {
  resolveFormFieldRuleState,
  type FormRuleValues,
} from "#features/governed-surface/form-rules.evaluate.shared"
import type {
  GovernedFormField,
  GovernedMultiStepFormConfiguration,
  MultiStepFormDataNature,
} from "#features/governed-surface/schemas/multi-step-form.schema"
import { densityGapClass } from "#features/governed-surface/schemas/surface-chrome.classes"
import { cn } from "#lib/utils"

const DATA_NATURE_CLASS: Record<MultiStepFormDataNature, string> = {
  wizard: "@container flex flex-col gap-4",
}

function buildInitialWizardValues(
  form: GovernedMultiStepFormConfiguration
): FormRuleValues {
  const initial: FormRuleValues = {}
  for (const step of form.steps) {
    for (const field of step.fields) {
      initial[field.id] = field.kind === "checkbox" ? false : ""
    }
  }
  return initial
}

export function MultiStepFormSurface({
  form,
}: {
  form: GovernedMultiStepFormConfiguration
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [values, setValues] = useState<FormRuleValues>(() =>
    buildInitialWizardValues(form)
  )
  const step = form.steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === form.steps.length - 1

  function setFieldValue(fieldId: string, next: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: next }))
  }

  return (
    <section
      aria-label="Multi-step form"
      className={DATA_NATURE_CLASS[form.dataNature]}
    >
      <Card>
        <CardHeader className="pb-2">
          <p className="text-xs text-muted-foreground">
            Step {stepIndex + 1} of {form.steps.length}
          </p>
          <CardTitle className="text-base">{step.title}</CardTitle>
          {step.description ? (
            <p className="text-sm text-muted-foreground">{step.description}</p>
          ) : null}
        </CardHeader>
        <CardContent
          className={cn(
            "flex flex-col",
            densityGapClass(form.chrome?.density)
          )}
        >
          <ol className="flex flex-wrap gap-2" aria-label="Form steps">
            {form.steps.map((s, index) => (
              <li key={s.id}>
                <Button
                  type="button"
                  size="sm"
                  variant={index === stepIndex ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setStepIndex(index)}
                  aria-current={index === stepIndex ? "step" : undefined}
                >
                  {s.title}
                </Button>
              </li>
            ))}
          </ol>
          <div
            className={cn(
              "flex flex-col",
              densityGapClass(form.chrome?.density)
            )}
          >
            {step.fields.map((field) => (
              <WizardField
                key={field.id}
                field={field}
                values={values}
                onValueChange={setFieldValue}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFirst}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </Button>
            {isLast ? (
              <Button type="button" size="sm" data-form-id={form.formId}>
                {form.submitLabel}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  setStepIndex((i) => Math.min(form.steps.length - 1, i + 1))
                }
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function WizardField({
  field,
  values,
  onValueChange,
}: {
  field: GovernedFormField
  values: FormRuleValues
  onValueChange: (fieldId: string, next: unknown) => void
}) {
  const id = `wizard-field-${field.id}`
  const { visible, enabled } = resolveFormFieldRuleState(field.rules, values)

  if (!visible) {
    return null
  }

  return (
    <div className="flex flex-col gap-1.5">
      {field.kind === "checkbox" ? (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            name={field.id}
            required={field.required}
            disabled={!enabled}
            checked={Boolean(values[field.id])}
            onCheckedChange={(checked) =>
              onValueChange(field.id, checked === true)
            }
          />
          <Label htmlFor={id}>{field.label}</Label>
        </div>
      ) : (
        <>
          <Label htmlFor={id}>
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </Label>
          {field.kind === "textarea" ? (
            <Textarea
              id={id}
              name={field.id}
              placeholder={field.placeholder}
              required={field.required}
              disabled={!enabled}
              value={String(values[field.id] ?? "")}
              onChange={(event) => onValueChange(field.id, event.target.value)}
            />
          ) : field.kind === "select" ? (
            <Select
              name={field.id}
              required={field.required}
              disabled={!enabled}
              value={String(values[field.id] ?? "")}
              onValueChange={(next) => onValueChange(field.id, next)}
            >
              <SelectTrigger id={id} className="w-full">
                <SelectValue placeholder={field.placeholder ?? "Select…"} />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={id}
              name={field.id}
              type={field.kind === "email" ? "email" : "text"}
              placeholder={field.placeholder}
              required={field.required}
              disabled={!enabled}
              value={String(values[field.id] ?? "")}
              onChange={(event) => onValueChange(field.id, event.target.value)}
            />
          )}
        </>
      )}
    </div>
  )
}
