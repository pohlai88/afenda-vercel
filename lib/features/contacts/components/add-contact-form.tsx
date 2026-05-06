"use client"

import { useActionState } from "react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

import { createContact } from "../actions/create-contact"

export function AddContactForm() {
  const [state, formAction, pending] = useActionState(createContact, undefined)

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive" className="w-full">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            name="name"
            required
            placeholder="Acme Ltd"
            aria-invalid={state && !state.ok && !!state.errors.name}
          />
          {state && !state.ok && state.errors.name ? (
            <p className="text-destructive text-xs" role="alert">
              {state.errors.name}
            </p>
          ) : null}
        </div>
        <div className="grid flex-1 gap-2">
          <Label htmlFor="contact-email">Email (optional)</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            placeholder="billing@acme.com"
            aria-invalid={state && !state.ok && !!state.errors.email}
          />
          {state && !state.ok && state.errors.email ? (
            <p className="text-destructive text-xs" role="alert">
              {state.errors.email}
            </p>
          ) : null}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  )
}
