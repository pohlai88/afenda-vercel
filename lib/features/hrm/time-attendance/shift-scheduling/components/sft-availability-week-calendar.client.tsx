"use client"

import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "#components2/ui/badge"
import { cn } from "#lib/utils"

import { addDaysIso } from "../data/sft-conflict-detect.shared"

export type SftAvailabilityWeekEntry = {
  readonly id: string
  readonly employeeId: string
  readonly attendanceDate: string
  readonly kind: "unavailable" | "preferred"
  readonly reason: string | null
}

function buildWeekDates(anchor: string, rangeEnd: string): string[] {
  const dates: string[] = []
  let cursor = anchor
  for (let i = 0; i < 7 && cursor <= rangeEnd; i += 1) {
    dates.push(cursor)
    cursor = addDaysIso(cursor, 1)
  }
  return dates
}

export function SftAvailabilityWeekCalendar({
  rangeStart,
  rangeEnd,
  entries,
}: {
  rangeStart: string
  rangeEnd: string
  entries: readonly SftAvailabilityWeekEntry[]
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const format = useFormatter()

  const weekDates = useMemo(
    () => buildWeekDates(rangeStart, rangeEnd),
    [rangeStart, rangeEnd]
  )

  const entriesByDate = useMemo(() => {
    const map = new Map<string, SftAvailabilityWeekEntry[]>()
    for (const entry of entries) {
      if (!weekDates.includes(entry.attendanceDate)) continue
      const bucket = map.get(entry.attendanceDate) ?? []
      bucket.push(entry)
      map.set(entry.attendanceDate, bucket)
    }
    return map
  }, [entries, weekDates])

  if (weekDates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("availabilityWeekEmpty")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t("availabilityWeekTitle")}</p>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${weekDates.length}, minmax(0, 1fr))`,
        }}
      >
        {weekDates.map((date) => {
          const dayEntries = entriesByDate.get(date) ?? []
          return (
            <div
              key={date}
              className="flex min-w-0 flex-col gap-1 rounded-md border border-border p-2"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {format.dateTime(new Date(`${date}T12:00:00`), {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {dayEntries.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                <ul className="flex flex-col gap-1">
                  {dayEntries.map((entry) => (
                    <li key={entry.id} className="flex flex-col gap-0.5">
                      <Badge
                        variant={
                          entry.kind === "unavailable"
                            ? "destructive"
                            : "secondary"
                        }
                        className={cn("w-fit text-[10px]")}
                      >
                        {entry.kind === "unavailable"
                          ? t("availabilityKindUnavailable")
                          : t("availabilityKindPreferred")}
                      </Badge>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {entry.employeeId}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
