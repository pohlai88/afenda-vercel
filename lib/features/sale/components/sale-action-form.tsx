"use client"

import { useActionState } from "react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "#components/ui/native-select"

import { createSaleOrder } from "../actions/create-sale-order"

export function SaleActionForm() {
  const [state, formAction, pending] = useActionState(createSaleOrder, undefined)

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
          <AlertDescription>Sale action stub executed successfully.</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="sale-query">Query</Label>
          <Input
            id="sale-query"
            name="query"
            placeholder="Search quotations or orders"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sale-status">Status</Label>
          <NativeSelect id="sale-status" name="status">
            <NativeSelectOption value="all">All</NativeSelectOption>
            <NativeSelectOption value="draft">Draft</NativeSelectOption>
            <NativeSelectOption value="confirmed">Confirmed</NativeSelectOption>
          </NativeSelect>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Running..." : "Run action"}
        </Button>
      </div>
    </form>
  )
}
