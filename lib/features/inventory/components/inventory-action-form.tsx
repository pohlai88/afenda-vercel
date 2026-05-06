"use client"

import { useActionState } from "react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { NativeSelect, NativeSelectOption } from "#components/ui/native-select"

import { reserveStock } from "../actions/reserve-stock"

export function InventoryActionForm() {
  const [state, formAction, pending] = useActionState(reserveStock, undefined)

  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <Alert>
          <AlertTitle>Ready</AlertTitle>
          <AlertDescription>
            Inventory action stub executed successfully.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="inventory-query">Query</Label>
          <Input
            id="inventory-query"
            name="query"
            placeholder="Search SKUs or stock moves"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="inventory-status">Status</Label>
          <NativeSelect id="inventory-status" name="status">
            <NativeSelectOption value="all">All</NativeSelectOption>
            <NativeSelectOption value="available">Available</NativeSelectOption>
            <NativeSelectOption value="reserved">Reserved</NativeSelectOption>
          </NativeSelect>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Running..." : "Run action"}
        </Button>
      </div>
    </form>
  )
}
