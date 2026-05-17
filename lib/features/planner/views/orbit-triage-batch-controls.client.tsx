"use client"

import { useEffect, useEffectEvent, useId, useState } from "react"

import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"

const SIGNAL_OPERATIONS = [
  "promote_signals",
  "defer_signals",
  "suppress_signals",
] as const

const ITEM_OPERATIONS = [
  "activate_items",
  "block_items",
  "ready_items",
  "verify_items",
  "assign_items",
] as const

type PlannerBatchOperation =
  | (typeof SIGNAL_OPERATIONS)[number]
  | (typeof ITEM_OPERATIONS)[number]

type SelectionState = {
  itemCount: number
  signalCount: number
}

type OrbitTriageBatchControlsProps = {
  automationAttentionCount: number
  blockedRecoveryCount: number
  highPressureCount: number
  signalIntakeCount: number
  manualFollowUpCount: number
  itemCount: number
  signalCount: number
}

function allowedOperations(
  selection: SelectionState
): readonly PlannerBatchOperation[] {
  if (selection.itemCount > 0 && selection.signalCount === 0) {
    return ITEM_OPERATIONS
  }
  if (selection.signalCount > 0 && selection.itemCount === 0) {
    return SIGNAL_OPERATIONS
  }
  return []
}

export function OrbitTriageBatchControls({
  automationAttentionCount,
  blockedRecoveryCount,
  highPressureCount,
  signalIntakeCount,
  manualFollowUpCount,
  itemCount,
  signalCount,
}: OrbitTriageBatchControlsProps) {
  const rootId = useId()
  const [operation, setOperation] =
    useState<PlannerBatchOperation>("promote_signals")
  const [selection, setSelection] = useState<SelectionState>({
    itemCount: 0,
    signalCount: 0,
  })

  const syncSelection = useEffectEvent(() => {
    const root = document.getElementById(rootId)
    const form = root?.closest("form")
    if (!form) return

    setSelection({
      itemCount: form.querySelectorAll<HTMLInputElement>(
        'input[name="itemIds"]:checked'
      ).length,
      signalCount: form.querySelectorAll<HTMLInputElement>(
        'input[name="signalIds"]:checked'
      ).length,
    })
  })

  useEffect(() => {
    const root = document.getElementById(rootId)
    const form = root?.closest("form")
    if (!form) return

    form.addEventListener("change", syncSelection)
    return () => form.removeEventListener("change", syncSelection)
  }, [rootId])

  const allowed = allowedOperations(selection)
  const hasMixedSelection = selection.itemCount > 0 && selection.signalCount > 0
  const hasSelection = selection.itemCount > 0 || selection.signalCount > 0
  const effectiveOperation =
    allowed.includes(operation) && !hasMixedSelection ? operation : allowed[0]
  const operationAllowed =
    !hasMixedSelection && hasSelection && effectiveOperation != null

  const selectionCopy = hasMixedSelection
    ? "Choose only items or only signals for one batch operation."
    : !hasSelection
      ? "Select one or more rows below to enable batch triage."
      : selection.itemCount > 0
        ? `${selection.itemCount} item${selection.itemCount === 1 ? "" : "s"} selected`
        : `${selection.signalCount} signal${selection.signalCount === 1 ? "" : "s"} selected`

  return (
    <div
      id={rootId}
      className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{itemCount} items</Badge>
        <Badge variant="secondary">{signalCount} signals</Badge>
        <Badge variant="warning">{automationAttentionCount} automation</Badge>
        <Badge variant="warning">{blockedRecoveryCount} blocked</Badge>
        <Badge variant="critical">{highPressureCount} high pressure</Badge>
        <Badge variant="outline">{signalIntakeCount} signal intake</Badge>
        <Badge variant="outline">{manualFollowUpCount} manual follow-up</Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)_auto]">
        <select
          name="operation"
          value={effectiveOperation ?? operation}
          onChange={(event) =>
            setOperation(event.target.value as PlannerBatchOperation)
          }
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          aria-label="Orbit batch triage operation"
        >
          <option
            value="promote_signals"
            disabled={
              selection.itemCount > 0 ||
              (hasSelection && !allowed.includes("promote_signals"))
            }
          >
            Promote selected signals
          </option>
          <option
            value="defer_signals"
            disabled={
              selection.itemCount > 0 ||
              (hasSelection && !allowed.includes("defer_signals"))
            }
          >
            Defer selected signals
          </option>
          <option
            value="suppress_signals"
            disabled={
              selection.itemCount > 0 ||
              (hasSelection && !allowed.includes("suppress_signals"))
            }
          >
            Suppress selected signals
          </option>
          <option
            value="activate_items"
            disabled={
              selection.signalCount > 0 ||
              (hasSelection && !allowed.includes("activate_items"))
            }
          >
            Activate selected items
          </option>
          <option
            value="block_items"
            disabled={
              selection.signalCount > 0 ||
              (hasSelection && !allowed.includes("block_items"))
            }
          >
            Block selected items
          </option>
          <option
            value="ready_items"
            disabled={
              selection.signalCount > 0 ||
              (hasSelection && !allowed.includes("ready_items"))
            }
          >
            Move items to review
          </option>
          <option
            value="verify_items"
            disabled={
              selection.signalCount > 0 ||
              (hasSelection && !allowed.includes("verify_items"))
            }
          >
            Verify selected items
          </option>
          <option
            value="assign_items"
            disabled={
              selection.signalCount > 0 ||
              (hasSelection && !allowed.includes("assign_items"))
            }
          >
            Assign selected items
          </option>
        </select>
        <Input
          name="subjectLabel"
          aria-label="Orbit batch assignee"
          placeholder="Assignee label for assign action"
          disabled={effectiveOperation !== "assign_items"}
        />
        <Button type="submit" size="sm" disabled={!operationAllowed}>
          Apply batch action
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{selectionCopy}</p>
    </div>
  )
}
