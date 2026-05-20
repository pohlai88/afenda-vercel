"use client"

import { useActionState, useId, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"
import { Checkbox } from "#components2/ui/checkbox"
import { Field, FieldError } from "#components2/ui/field"
import { Label } from "#components2/ui/label"

import {
  bulkApproveOtmRequestsAction,
  type OtmBulkApprovalFormState,
} from "#features/hrm/client"

export type OtmPendingBulkRow = {
  id: string
  label: string
}

export function OtmPendingBulkApproveToolbar({
  rows,
}: {
  rows: readonly OtmPendingBulkRow[]
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const listId = useId()
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [state, formAction, pending] = useActionState<
    OtmBulkApprovalFormState | undefined,
    FormData
  >(bulkApproveOtmRequestsAction, undefined)

  const allSelected = rows.length > 0 && selected.size === rows.length
  const selectedCount = selected.size

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set())
  }

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const summary = useMemo(() => {
    if (!state?.ok) return null
    if (state.failed.length === 0) {
      return t("bulkApproveSuccessAll", { count: state.approved.length })
    }
    return t("bulkApproveSuccessPartial", {
      approved: state.approved.length,
      failed: state.failed.length,
    })
  }, [state, t])

  const formError = state && !state.ok ? state.errors.form : null

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{t("bulkApproveTitle")}</p>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${listId}-all`}
            checked={allSelected}
            onCheckedChange={(value) => toggleAll(value === true)}
            aria-label={t("bulkApproveSelectAll")}
          />
          <Label htmlFor={`${listId}-all`} className="text-sm font-normal">
            {t("bulkApproveSelectAll")}
          </Label>
        </div>
      </div>

      <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
        {rows.map((row) => {
          const checkboxId = `${listId}-${row.id}`
          return (
            <li key={row.id} className="flex items-start gap-2">
              <Checkbox
                id={checkboxId}
                checked={selected.has(row.id)}
                onCheckedChange={(value) =>
                  toggleOne(row.id, value === true)
                }
                aria-label={t("bulkApproveSelectRow", { label: row.label })}
              />
              <Label
                htmlFor={checkboxId}
                className="font-normal leading-snug text-foreground"
              >
                {row.label}
              </Label>
            </li>
          )
        })}
      </ul>

      <form action={formAction} className="flex flex-col gap-2">
        {Array.from(selected).map((requestId) => (
          <input
            key={requestId}
            type="hidden"
            name="requestIds"
            value={requestId}
          />
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={pending || selectedCount === 0}
          >
            {pending ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                  aria-hidden
                />
                {t("bulkApproving")}
              </>
            ) : (
              t("bulkApproveSubmit", { count: selectedCount })
            )}
          </Button>
          {selectedCount === 0 ? (
            <span className="text-xs text-muted-foreground">
              {t("bulkApproveNoneSelected")}
            </span>
          ) : null}
        </div>
        {formError ? (
          <Field>
            <FieldError>{formError}</FieldError>
          </Field>
        ) : null}
        {summary ? (
          <p className="text-sm text-muted-foreground" role="status">
            {summary}
          </p>
        ) : null}
        {state?.ok && state.failed.length > 0 ? (
          <ul className="list-inside list-disc text-xs text-destructive">
            {state.failed.map((item) => (
              <li key={item.requestId}>{item.message}</li>
            ))}
          </ul>
        ) : null}
      </form>
    </div>
  )
}
