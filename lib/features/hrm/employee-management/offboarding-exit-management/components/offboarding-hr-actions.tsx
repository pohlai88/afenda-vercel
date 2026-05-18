"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Field, FieldGroup, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
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
  const t = useTranslations("Dashboard.Hrm.offboarding")
  const [state, dispatch] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(scheduleExitInterviewAction, undefined)

  return (
    <form action={dispatch}>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="instanceId" value={instanceId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="scheduledAt">{t("scheduledAtLabel")}</FieldLabel>
          <Input
            id="scheduledAt"
            type="date"
            name="scheduledAt"
            required
            className="h-8 text-sm"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="interviewerNote">
            {t("interviewerNoteLabel")}
          </FieldLabel>
          <Textarea
            id="interviewerNote"
            name="interviewerNote"
            rows={2}
            className="text-sm"
          />
        </Field>
        {state && !state.ok ? (
          <p className="text-xs text-destructive">{state.errors?.form}</p>
        ) : null}
        <Button type="submit" size="sm" variant="secondary">
          {t("scheduleExitInterviewSubmit")}
        </Button>
      </FieldGroup>
    </form>
  )
}

export function RecordExitInterviewFeedbackForm({
  orgSlug,
  instanceId,
  employeeId,
}: OffboardingHrActionFormProps) {
  const t = useTranslations("Dashboard.Hrm.offboarding")
  const [state, dispatch] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(recordExitInterviewFeedbackAction, undefined)

  return (
    <form action={dispatch}>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="instanceId" value={instanceId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="completedAt">{t("completedAtLabel")}</FieldLabel>
          <Input
            id="completedAt"
            type="date"
            name="completedAt"
            required
            className="h-8 text-sm"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="feedbackSummary">
            {t("feedbackSummaryLabel")}
          </FieldLabel>
          <Textarea
            id="feedbackSummary"
            name="feedbackSummary"
            rows={3}
            required
            className="text-sm"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="wouldRehire">{t("wouldRehireLabel")}</FieldLabel>
          <Select name="wouldRehire">
            <SelectTrigger id="wouldRehire" className="h-8 text-sm">
              <SelectValue placeholder={t("selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("yes")}</SelectItem>
              <SelectItem value="false">{t("no")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {state && !state.ok ? (
          <p className="text-xs text-destructive">{state.errors?.form}</p>
        ) : null}
        <Button type="submit" size="sm" variant="secondary">
          {t("recordExitInterviewFeedbackSubmit")}
        </Button>
      </FieldGroup>
    </form>
  )
}

export function UpdateSettlementReadinessForm({
  orgSlug,
  instanceId,
  employeeId,
}: OffboardingHrActionFormProps) {
  const t = useTranslations("Dashboard.Hrm.offboarding")
  const [state, dispatch] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(updateSettlementReadinessAction, undefined)

  return (
    <form action={dispatch}>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="instanceId" value={instanceId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="settlementReadinessStatus">
            {t("settlementReadinessLabel")}
          </FieldLabel>
          <Select
            name="settlementReadinessStatus"
            required
            defaultValue="pending_clearance"
          >
            <SelectTrigger
              id="settlementReadinessStatus"
              className="h-8 text-sm"
            >
              <SelectValue placeholder={t("selectStatusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending_clearance">
                {t("settlementPendingClearance")}
              </SelectItem>
              <SelectItem value="ready">{t("settlementReady")}</SelectItem>
              <SelectItem value="blocked">{t("settlementBlocked")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="finalSettlementReference">
            {t("finalSettlementReferenceLabel")}
          </FieldLabel>
          <Input
            id="finalSettlementReference"
            name="finalSettlementReference"
            className="h-8 text-sm"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="blockerCode">
            {t("settlementBlockerCodeLabel")}
          </FieldLabel>
          <Input id="blockerCode" name="blockerCode" className="h-8 text-sm" />
        </Field>
        <Field>
          <FieldLabel htmlFor="blockerMessage">
            {t("settlementBlockerMessageLabel")}
          </FieldLabel>
          <Textarea
            id="blockerMessage"
            name="blockerMessage"
            rows={2}
            className="text-sm"
          />
        </Field>
        {state && !state.ok ? (
          <p className="text-xs text-destructive">{state.errors?.form}</p>
        ) : null}
        <Button type="submit" size="sm" variant="secondary">
          {t("updateSettlementReadinessSubmit")}
        </Button>
      </FieldGroup>
    </form>
  )
}

export function SetRehireEligibilityForm({
  orgSlug,
  instanceId,
  employeeId,
}: OffboardingHrActionFormProps) {
  const t = useTranslations("Dashboard.Hrm.offboarding")
  const [state, dispatch] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(setRehireEligibilityAction, undefined)

  return (
    <form action={dispatch}>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="instanceId" value={instanceId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="rehireEligibility">
            {t("rehireEligibilityLabel")}
          </FieldLabel>
          <Select name="rehireEligibility" required defaultValue="eligible">
            <SelectTrigger id="rehireEligibility" className="h-8 text-sm">
              <SelectValue placeholder={t("selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eligible">{t("rehireEligible")}</SelectItem>
              <SelectItem value="not_eligible">
                {t("rehireIneligible")}
              </SelectItem>
              <SelectItem value="conditional">
                {t("rehireConditional")}
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="rehire-note">{t("rehireNoteLabel")}</FieldLabel>
          <Textarea id="rehire-note" name="note" rows={2} className="text-sm" />
        </Field>
        {state && !state.ok ? (
          <p className="text-xs text-destructive">{state.errors?.form}</p>
        ) : null}
        <Button type="submit" size="sm" variant="secondary">
          {t("recordRehireEligibilitySubmit")}
        </Button>
      </FieldGroup>
    </form>
  )
}
