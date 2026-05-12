"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, RefreshCwIcon } from "lucide-react"

import { Button } from "#components/ui/button"

import {
  regenerateAttendanceDayAction,
  type RegenerateDayFormState,
} from "#features/hrm/client"

type AttendanceRegenerateDayButtonProps = {
  employeeId: string
  /** Resolved employee display name for the aria-label (falls back to id when name is missing). */
  employeeName: string
  attendanceDate: string
}

/**
 * Force-regenerate the attendance day aggregate for one (employee, date)
 * pair. Inline form (no dialog) because the operation is idempotent —
 * re-clicking when the checksum is unchanged is a no-op on the server,
 * not a destructive change.
 *
 * Result feedback appears inline next to the button so the operator
 * knows whether the click did anything (`updated`) or not (`skipped`).
 * Locked-day rejection is surfaced via the action's `form` error.
 */
export function AttendanceRegenerateDayButton({
  employeeId,
  employeeName,
  attendanceDate,
}: AttendanceRegenerateDayButtonProps) {
  const t = useTranslations("Dashboard.Hrm.attendance")
  const [state, formAction, pending] = useActionState<
    RegenerateDayFormState | undefined,
    FormData
  >(regenerateAttendanceDayAction, undefined)

  const error = state && !state.ok ? state.errors : null
  const success = state && state.ok ? state.result : null

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      aria-label={t("regenerateAria", {
        employee: employeeName,
        date: attendanceDate,
      })}
    >
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="attendanceDate" value={attendanceDate} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("regenerating")}
          </>
        ) : (
          <>
            <RefreshCwIcon
              className="size-4"
              data-icon="inline-start"
              aria-hidden
            />
            {t("regenerateDay")}
          </>
        )}
      </Button>
      {success === "updated" ? (
        <span className="text-xs text-success" role="status" aria-live="polite">
          {t("regenerateUpdated")}
        </span>
      ) : success === "skipped" ? (
        <span
          className="text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {t("regenerateSkipped")}
        </span>
      ) : null}
      {error?.form ? (
        <span className="text-xs text-destructive">{error.form}</span>
      ) : null}
    </form>
  )
}
