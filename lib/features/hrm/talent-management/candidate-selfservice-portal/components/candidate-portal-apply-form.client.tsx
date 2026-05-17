"use client"

import { useActionState } from "react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"

import {
  submitPublicApplicationAction,
  type CandidatePortalFormState,
} from "../actions/candidate-portal-application.actions"

type CandidatePortalApplyFormProps = {
  portalSlug: string
  requisitionId: string
  requisitionTitle: string
}

async function applyWithActionState(
  prev: CandidatePortalFormState | undefined,
  formData: FormData
): Promise<CandidatePortalFormState> {
  return submitPublicApplicationAction(prev, formData)
}

export function CandidatePortalApplyForm({
  portalSlug,
  requisitionId,
  requisitionTitle,
}: CandidatePortalApplyFormProps) {
  const [state, formAction, pending] = useActionState<
    CandidatePortalFormState | undefined,
    FormData
  >(applyWithActionState, undefined)

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <CandidateApplyFormFields
        portalSlug={portalSlug}
        requisitionId={requisitionId}
        requisitionTitle={requisitionTitle}
        state={state}
        formAction={formAction}
        pending={pending}
      />
    </div>
  )
}

function CandidateApplyFormFields({
  portalSlug,
  requisitionId,
  requisitionTitle,
  state,
  formAction,
  pending,
}: {
  portalSlug: string
  requisitionId: string
  requisitionTitle: string
  state: CandidatePortalFormState | undefined
  formAction: (payload: FormData) => void
  pending: boolean
}) {
  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Apply</h2>
        <p className="mt-2 text-sm text-muted-foreground">{requisitionTitle}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="portalSlug" value={portalSlug} />
        <input type="hidden" name="requisitionId" value={requisitionId} />

        {state && !state.ok ? (
          <Alert variant="destructive">
            <AlertTitle>Could not submit</AlertTitle>
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="legalName">Full name</Label>
          <Input id="legalName" name="legalName" required autoComplete="name" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="skills">Skills (comma-separated)</Label>
          <Input id="skills" name="skills" placeholder="TypeScript, React" />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="consented"
            name="consented"
            type="checkbox"
            value="on"
            required
            className="size-4 rounded border border-input"
          />
          <Label htmlFor="consented" className="font-normal">
            I agree to the processing of my application data.
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </>
  )
}
