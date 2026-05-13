import * as chrono from "chrono-node/en"

import {
  nextPlannerRunFromRecurrence,
  normalizePlannerRRule,
} from "../recurrence/planner-recurrence.shared"

export const DEFAULT_PLANNER_CAPTURE_TIME_ZONE = "Asia/Kuala_Lumpur"

export type PlannerCaptureParseConfidence = "none" | "partial" | "structured"

export type PlannerCaptureParseWarning =
  | "unsupported_recurrence"
  | "empty_title"
  | "reminder_without_due_date"
  | "unsupported_reminder"

export type PlannerCaptureParsedReminder = {
  remindAt: Date
  matchedText: string
}

export type PlannerCaptureParsedRecurrence = {
  rrule: string
  matchedText: string
  nextRunAt: Date | null
}

export type PlannerCaptureParseResult = {
  rawText: string
  title: string
  dueAt: Date | null
  reminder: PlannerCaptureParsedReminder | null
  recurrence: PlannerCaptureParsedRecurrence | null
  confidence: PlannerCaptureParseConfidence
  warnings: PlannerCaptureParseWarning[]
}

export type PlannerCaptureParseOptions = {
  now?: Date
  timeZone?: string | null
}

type TextRange = {
  start: number
  end: number
}

type RelativeReminderMatch = TextRange & {
  kind: "relative"
  matchedText: string
  amount: number
  unit: "minute" | "hour" | "day"
}

type AbsoluteReminderMatch = TextRange & {
  kind: "absolute"
  matchedText: string
  phrase: string
}

type ReminderMatch = RelativeReminderMatch | AbsoluteReminderMatch

type RecurrenceMatch = TextRange & {
  matchedText: string
  rrule: string
}

const WEEKDAY_ALIASES = {
  monday: "MO",
  mon: "MO",
  tuesday: "TU",
  tue: "TU",
  tues: "TU",
  wednesday: "WE",
  wed: "WE",
  thursday: "TH",
  thu: "TH",
  thur: "TH",
  thurs: "TH",
  friday: "FR",
  fri: "FR",
  saturday: "SA",
  sat: "SA",
  sunday: "SU",
  sun: "SU",
} as const

const WEEKDAY_WORDS = Object.keys(WEEKDAY_ALIASES).join("|")

function normalizeCaptureTitle(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "")
    .trim()
}

function normalizeTimeZone(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0
    ? trimmed
    : DEFAULT_PLANNER_CAPTURE_TIME_ZONE
}

function toParsingReference(options: PlannerCaptureParseOptions) {
  return {
    instant: options.now ?? new Date(),
    timezone: normalizeTimeZone(options.timeZone),
  }
}

function maskRanges(text: string, ranges: readonly TextRange[]): string {
  const chars = [...text]

  for (const range of ranges) {
    for (let index = range.start; index < range.end; index += 1) {
      chars[index] = " "
    }
  }

  return chars.join("")
}

function removeRanges(text: string, ranges: readonly TextRange[]): string {
  if (ranges.length === 0) return normalizeCaptureTitle(text)

  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged: TextRange[] = []

  for (const range of sorted) {
    const last = merged.at(-1)
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end)
      continue
    }
    merged.push({ ...range })
  }

  let next = ""
  let cursor = 0
  for (const range of merged) {
    next += text.slice(cursor, range.start)
    cursor = range.end
  }
  next += text.slice(cursor)

  return normalizeCaptureTitle(next)
}

function weekdayCode(value: string | undefined): string | null {
  if (!value) return null
  return WEEKDAY_ALIASES[value.toLowerCase() as keyof typeof WEEKDAY_ALIASES]
}

function findReminderMatch(text: string): ReminderMatch | null {
  const relative = text.match(
    /\bremind(?:\s+me)?\s+(?<amount>\d{1,3})\s+(?<unit>minutes?|hours?|days?)\s+before\b/i
  )

  if (relative?.index != null && relative.groups) {
    const unitText = relative.groups.unit.toLowerCase()
    const unit = unitText.startsWith("minute")
      ? "minute"
      : unitText.startsWith("hour")
        ? "hour"
        : "day"

    return {
      kind: "relative",
      start: relative.index,
      end: relative.index + relative[0].length,
      matchedText: relative[0],
      amount: Number(relative.groups.amount),
      unit,
    }
  }

  const absolute = text.match(/\bremind(?:\s+me)?\s+(?<phrase>[^,;]+)$/i)
  if (absolute?.index == null || !absolute.groups) return null

  const phrase = absolute.groups.phrase.trim()
  if (phrase.length === 0 || phrase.toLowerCase().startsWith("to ")) {
    return null
  }

  return {
    kind: "absolute",
    start: absolute.index,
    end: absolute.index + absolute[0].length,
    matchedText: absolute[0],
    phrase,
  }
}

function findRecurrenceMatch(text: string): RecurrenceMatch | null {
  const weekday = text.match(/\bevery\s+weekday\b/i)
  if (weekday?.index != null) {
    return {
      start: weekday.index,
      end: weekday.index + weekday[0].length,
      matchedText: weekday[0],
      rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR",
    }
  }

  const daily = text.match(/\bevery\s+day\b/i)
  if (daily?.index != null) {
    return {
      start: daily.index,
      end: daily.index + daily[0].length,
      matchedText: daily[0],
      rrule: "FREQ=DAILY;INTERVAL=1",
    }
  }

  const weekly = text.match(
    new RegExp(
      `\\bevery\\s+(?:(?<interval>\\d{1,2})\\s+)?weeks?(?:\\s+on\\s+(?<weekday>${WEEKDAY_WORDS}))?\\b`,
      "i"
    )
  )
  if (weekly?.index != null && weekly.groups) {
    const interval = Number(weekly.groups.interval ?? "1")
    const byDay = weekdayCode(weekly.groups.weekday)
    const rrule = [
      "FREQ=WEEKLY",
      `INTERVAL=${Number.isFinite(interval) && interval > 0 ? interval : 1}`,
      byDay ? `BYDAY=${byDay}` : null,
    ]
      .filter(Boolean)
      .join(";")

    return {
      start: weekly.index,
      end: weekly.index + weekly[0].length,
      matchedText: weekly[0],
      rrule,
    }
  }

  const monthly = text.match(/\bevery\s+month\b/i)
  if (monthly?.index != null) {
    return {
      start: monthly.index,
      end: monthly.index + monthly[0].length,
      matchedText: monthly[0],
      rrule: "FREQ=MONTHLY;INTERVAL=1",
    }
  }

  return null
}

function hasUnsupportedRecurrence(text: string, recurrence: RecurrenceMatch | null) {
  return recurrence === null && /\bevery\s+\S+/i.test(text)
}

function resultRange(result: chrono.ParsedResult): TextRange {
  return {
    start: result.index,
    end: result.index + result.text.length,
  }
}

function chooseDueDateResult(
  results: readonly chrono.ParsedResult[],
  recurrence: RecurrenceMatch | null
): chrono.ParsedResult | null {
  if (results.length === 0) return null

  if (recurrence?.rrule.includes("BYDAY=")) {
    const weekdayResult = results.find((result) =>
      new RegExp(`\\b(${WEEKDAY_WORDS}|weekday)\\b`, "i").test(result.text)
    )
    if (weekdayResult) return weekdayResult
  }

  return results[0] ?? null
}

function subtractReminderOffset(
  dueAt: Date,
  reminder: RelativeReminderMatch
): Date {
  const factor =
    reminder.unit === "day"
      ? 24 * 60 * 60 * 1000
      : reminder.unit === "hour"
        ? 60 * 60 * 1000
        : 60 * 1000

  return new Date(dueAt.getTime() - reminder.amount * factor)
}

function parseAbsoluteReminder(
  reminder: AbsoluteReminderMatch,
  options: PlannerCaptureParseOptions
): Date | null {
  return chrono.parseDate(reminder.phrase, toParsingReference(options), {
    forwardDate: true,
  })
}

function parseConfidence(input: {
  dueAt: Date | null
  reminder: PlannerCaptureParsedReminder | null
  recurrence: PlannerCaptureParsedRecurrence | null
  warnings: readonly PlannerCaptureParseWarning[]
}): PlannerCaptureParseConfidence {
  if (input.warnings.length > 0) return "partial"
  if (input.dueAt || input.reminder || input.recurrence) return "structured"
  return "none"
}

export function parsePlannerCaptureInput(
  rawText: string,
  options: PlannerCaptureParseOptions = {}
): PlannerCaptureParseResult {
  const raw = rawText.trim()
  const warnings: PlannerCaptureParseWarning[] = []
  const ranges: TextRange[] = []

  const reminderMatch = findReminderMatch(raw)
  const reminderMasked = reminderMatch ? maskRanges(raw, [reminderMatch]) : raw
  const recurrenceMatch = findRecurrenceMatch(reminderMasked)

  if (hasUnsupportedRecurrence(reminderMasked, recurrenceMatch)) {
    warnings.push("unsupported_recurrence")
  }

  if (recurrenceMatch) {
    ranges.push(recurrenceMatch)
  }

  const parsedDates = chrono.parse(reminderMasked, toParsingReference(options), {
    forwardDate: true,
  })
  const dueDateResult = chooseDueDateResult(parsedDates, recurrenceMatch)
  const dueAt = dueDateResult?.date() ?? null

  if (dueDateResult) {
    ranges.push(resultRange(dueDateResult))
  }

  let reminder: PlannerCaptureParsedReminder | null = null
  if (reminderMatch) {
    ranges.push(reminderMatch)

    if (reminderMatch.kind === "relative") {
      if (dueAt) {
        reminder = {
          remindAt: subtractReminderOffset(dueAt, reminderMatch),
          matchedText: reminderMatch.matchedText,
        }
      } else {
        warnings.push("reminder_without_due_date")
      }
    } else {
      const remindAt = parseAbsoluteReminder(reminderMatch, options)
      if (remindAt) {
        reminder = {
          remindAt,
          matchedText: reminderMatch.matchedText,
        }
      } else {
        warnings.push("unsupported_reminder")
      }
    }
  }

  const normalizedRRule = recurrenceMatch
    ? normalizePlannerRRule(recurrenceMatch.rrule)
    : null
  const recurrence: PlannerCaptureParsedRecurrence | null =
    recurrenceMatch && normalizedRRule
      ? {
          rrule: normalizedRRule,
          matchedText: recurrenceMatch.matchedText,
          nextRunAt: nextPlannerRunFromRecurrence(
            normalizedRRule,
            dueAt ?? options.now ?? new Date()
          ),
        }
      : null

  const title = removeRanges(raw, ranges)
  if (title.length === 0) {
    warnings.push("empty_title")
  }

  return {
    rawText: raw,
    title,
    dueAt,
    reminder,
    recurrence,
    confidence: parseConfidence({ dueAt, reminder, recurrence, warnings }),
    warnings,
  }
}
