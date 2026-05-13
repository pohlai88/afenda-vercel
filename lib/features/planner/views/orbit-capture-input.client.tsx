"use client"

import { useMemo, useState } from "react"

import { Badge } from "#components/ui/badge"
import { Input } from "#components/ui/input"

import {
  DEFAULT_PLANNER_CAPTURE_TIME_ZONE,
  parsePlannerCaptureInput,
  type PlannerCaptureParseWarning,
} from "../commands/planner-capture-parser.shared"

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value)
}

export function OrbitCaptureInput({
  timeZone = DEFAULT_PLANNER_CAPTURE_TIME_ZONE,
}: {
  timeZone?: string
}) {
  const [rawText, setRawText] = useState("")
  const preview = useMemo(
    () =>
      rawText.trim().length > 0
        ? parsePlannerCaptureInput(rawText, { timeZone })
        : null,
    [rawText, timeZone]
  )

  return (
    <div className="space-y-2">
      <Input
        name="rawText"
        aria-label="Orbit item capture"
        placeholder="Review payroll variance tomorrow 9am"
        value={rawText}
        onChange={(event) => setRawText(event.target.value)}
        required
      />
      <input type="hidden" name="timeZone" value={timeZone} />
      {preview ? (
        <div
          className="flex min-h-7 flex-wrap gap-1.5"
          aria-live="polite"
          aria-label="Orbit capture preview"
        >
          {preview.title ? (
            <Badge variant="outline">Title: {preview.title}</Badge>
          ) : null}
          {preview.dueAt ? (
            <Badge variant="secondary">
              Due: {formatDateTime(preview.dueAt)}
            </Badge>
          ) : null}
          {preview.reminder ? (
            <Badge variant="info">
              Reminder: {formatDateTime(preview.reminder.remindAt)}
            </Badge>
          ) : null}
          {preview.recurrence ? (
            <Badge variant="warning">Repeats: {preview.recurrence.rrule}</Badge>
          ) : null}
          {preview.warnings.map((warning: PlannerCaptureParseWarning) => (
            <Badge key={warning} variant="critical">
              {warning.replaceAll("_", " ")}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
