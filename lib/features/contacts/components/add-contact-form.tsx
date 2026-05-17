"use client"

import { useEffect, useRef, useActionState } from "react"
import { CheckIcon, Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { createContact } from "../actions/create-contact"

type AddContactFormProps = {
  /** Called after a successful save — use to close a containing Dialog. */
  onSuccess?: () => void
}

export function AddContactForm({ onSuccess }: AddContactFormProps) {
  const [state, formAction, pending] = useActionState(createContact, undefined)
  const nameInvalid = Boolean(state && !state.ok && state.errors.name)
  const emailInvalid = Boolean(state && !state.ok && state.errors.email)

  // Stable ref so the effect does not re-fire when the parent recreates the callback lambda.
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  // Close the dialog (or run any success side-effect) as soon as the action succeeds.
  useEffect(() => {
    if (state?.ok) {
      onSuccessRef.current?.()
    }
  }, [state])

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {/* Form-level error */}
      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      {/* Inline success — only shown when used outside a Dialog (onSuccess closes it otherwise) */}
      {state?.ok && !onSuccess ? (
        <p
          role="status"
          className="flex items-center gap-1.5 text-sm text-success"
        >
          <CheckIcon className="size-4 shrink-0" aria-hidden />
          Contact saved.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          className="min-w-0 flex-1"
          data-invalid={nameInvalid ? true : undefined}
        >
          <FieldLabel htmlFor="contact-name">Name</FieldLabel>
          <Input
            id="contact-name"
            name="name"
            required
            placeholder="Acme Ltd"
            aria-invalid={nameInvalid}
          />
          {nameInvalid && state && !state.ok ? (
            <FieldError>{state.errors.name}</FieldError>
          ) : null}
        </Field>

        <Field
          className="min-w-0 flex-1"
          data-invalid={emailInvalid ? true : undefined}
        >
          <FieldLabel htmlFor="contact-email">
            Email{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Input
            id="contact-email"
            name="email"
            type="email"
            placeholder="billing@acme.com"
            aria-invalid={emailInvalid}
          />
          {emailInvalid && state && !state.ok ? (
            <FieldError>{state.errors.email}</FieldError>
          ) : null}
        </Field>

        <Button type="submit" disabled={pending} className="sm:shrink-0">
          {pending ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
                aria-hidden
              />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  )
}
