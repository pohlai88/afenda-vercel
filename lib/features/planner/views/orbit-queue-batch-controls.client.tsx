"use client"

import { useEffect, useEffectEvent, useId, useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"

import type { PlannerBatchQueueItemOperation } from "../domain/planner.schemas"

type QueueBatchOperation = PlannerBatchQueueItemOperation

type OrbitQueueBatchControlsProps = {
  itemCount: number
}

export function OrbitQueueBatchControls({
  itemCount,
}: OrbitQueueBatchControlsProps) {
  const t = useTranslations("Dashboard.Orbit.queueBatch")
  const rootId = useId()
  const [operation, setOperation] =
    useState<QueueBatchOperation>("activate_items")
  const [selectedItemCount, setSelectedItemCount] = useState(0)

  const syncSelection = useEffectEvent(() => {
    const root = document.getElementById(rootId)
    const form = root?.closest("form")
    if (!form) return
    setSelectedItemCount(
      form.querySelectorAll<HTMLInputElement>('input[name="itemIds"]:checked')
        .length
    )
  })

  useEffect(() => {
    const root = document.getElementById(rootId)
    const form = root?.closest("form")
    if (!form) return
    form.addEventListener("change", syncSelection)
    return () => form.removeEventListener("change", syncSelection)
  }, [rootId])

  const operationAllowed = selectedItemCount > 0
  const selectionCopy =
    selectedItemCount === 0
      ? t("selectRowsFirst")
      : t("itemsSelected", { count: selectedItemCount })

  return (
    <div
      id={rootId}
      className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)_auto]">
        <select
          name="operation"
          value={operation}
          onChange={(event) =>
            setOperation(event.target.value as QueueBatchOperation)
          }
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          aria-label={t("operationLabel")}
        >
          <option value="activate_items">{t("ops.activate")}</option>
          <option value="block_items">{t("ops.block")}</option>
          <option value="ready_items">{t("ops.review")}</option>
          <option value="verify_items">{t("ops.verify")}</option>
          <option value="assign_items">{t("ops.assign")}</option>
        </select>
        <Input
          name="subjectLabel"
          aria-label={t("assigneeAria")}
          placeholder={t("assigneePlaceholder")}
          disabled={operation !== "assign_items"}
        />
        <Button type="submit" size="sm" disabled={!operationAllowed}>
          {t("apply")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("help")} · {itemCount} {t("itemsInView")} · {selectionCopy}
      </p>
    </div>
  )
}
