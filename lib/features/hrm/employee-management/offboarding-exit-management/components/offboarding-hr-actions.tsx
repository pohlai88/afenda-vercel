"use client"

import { useActionState } from "react"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Textarea } from "#components2/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components2/ui/select"

import {
  scheduleExitInterviewAction,
  recordExitInterviewFeedbackAction,
  updateSettlementReadinessAction,
  setRehireEligibilityAction,
} from "../actions/offboarding.actions"
import type { ContractMutationFormState } from "../../../types"

type OffboardingHrActionFormProps = {
  orgSlug: string
  instanceId: string
  employeeId: string
}

export function ScheduleExitInterviewForm({
  orgSlug,
  instanceId,
  employeeId,
}: OffboardingHrActionFormProps) {
  const [state, dispatch] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(scheduleExitInterviewAction, undefined)

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="instanceId" value={instanceId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="scheduledAt" className="text-xs">
          Scheduled date
        </Label>
        <Input
          id="scheduledAt"
          type="date"
          name="scheduledAt"
          required
          className="h-8 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="interviewerNote" className="text-xs">
          Interviewer note (optional)
        </Label>
        <Textarea
          id="interviewerNote"
          name="interviewerNote"
          rows={2}
          className="text-sm"
        />
      </div>
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.errors?.form}</p>
      ) : null}
      <Button type="submit" size="sm" variant="secondary">
        Schedule exit interview
      </Button>
    </form>
  )
}

export function RecordExitInterviewFeedbackForm({
  orgSlug,
  instanceId,
  employeeId,
}: OffboardingHrActionFormProps) {
  const [state, dispatch] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(recordExitInterviewFeedbackAction, undefined)

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="instanceId" value={instanceId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="completedAt" className="text-xs">
          Completed date
        </Label>
        <Input
          id="completedAt"
          type="date"
          name="completedAt"
          required
          className="h-8 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="feedbackSummary" className="text-xs">
          Feedback summary
        </Label>
        <Textarea
          id="feedbackSummary"
          name="feedbackSummary"
          rows={3}
          required
          className="text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="wouldRehire" className="text-xs">
          Would rehire?
        </Label>
        <Select name="wouldRehire">
          <SelectTrigger id="wouldRehire" className="h-8 text-sm">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.errors?.form}</p>
      ) : null}
      <Button type="submit" size="sm" variant="secondary">
        Record exit interview feedback
      </Button>
    </form>
  )
}

export function UpdateSettlementReadinessForm({
  orgSlug,
  instanceId,
  employeeId,
}: OffboardingHrActionFormProps) {
  const [state, dispatch] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(updateSettlementReadinessAction, undefined)

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="instanceId" value={instanceId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="settlementReadinessStatus" className="text-xs">
          Settlement readiness
        </Label>
        <Select name="settlementReadinessStatus" required>
          <SelectTrigger
            id="settlementReadinessStatus"
            className="h-8 text-sm"
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_clearance">Pending clearance</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.errors?.form}</p>
      ) : null}
      <Button type="submit" size="sm" variant="secondary">
        Update settlement readiness
      </Button>
    </form>
  )
}

export function SetRehireEligibilityForm({
  orgSlug,
  instanceId,
  employeeId,
}: OffboardingHrActionFormProps) {
  const [state, dispatch] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(setRehireEligibilityAction, undefined)

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="instanceId" value={instanceId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="rehireEligibility" className="text-xs">
          Rehire eligibility
        </Label>
        <Select name="rehireEligibility" required>
          <SelectTrigger id="rehireEligibility" className="h-8 text-sm">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eligible">Eligible</SelectItem>
            <SelectItem value="not_eligible">Ineligible</SelectItem>
            <SelectItem value="conditional">Conditional</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="rehire-note" className="text-xs">
          Note (optional)
        </Label>
        <Textarea id="rehire-note" name="note" rows={2} className="text-sm" />
      </div>
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.errors?.form}</p>
      ) : null}
      <Button type="submit" size="sm" variant="secondary">
        Record rehire eligibility
      </Button>
    </form>
  )
}
