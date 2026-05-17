"use client"

import { useActionState } from "react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"

import {
  withdrawApplicationFromPortalAction,
  type CandidatePortalFormState,
} from "../actions/candidate-portal-application.actions"

type CandidatePortalWithdrawFormProps = {
  portalSlug: string
  token: string
  canWithdraw: boolean
}

async function withdrawWithActionState(
  prev: CandidatePortalFormState | undefined,
  formData: FormData
): Promise<CandidatePortalFormState> {
  return withdrawApplicationFromPortalAction(prev, formData)
}

export function CandidatePortalWithdrawForm({
  portalSlug,
  token,
  canWithdraw,
}: CandidatePortalWithdrawFormProps) {
  const [state, formAction, pending] = useActionState<
    CandidatePortalFormState | undefined,
    FormData
  >(withdrawWithActionState, undefined)

  if (!canWithdraw) {
    return null
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="portalSlug" value={portalSlug} />
      <input type="hidden" name="token" value={token} />

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertTitle>Could not withdraw</AlertTitle>
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      {state?.ok ? (
        <p className="text-sm text-muted-foreground" role="status">
          Your application has been withdrawn.
        </p>
      ) : (
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Withdrawing…" : "Withdraw application"}
        </Button>
      )}
    </form>
  )
}
