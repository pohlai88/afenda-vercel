"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"

import {
  activateContractAction,
  terminateContractAction,
} from "#features/hrm/client"

import type { EmploymentContractSummary } from "../types"

type EmploymentContractLifecycleFormsProps = {
  orgSlug: string
  contract: EmploymentContractSummary
}

export function EmploymentContractLifecycleForms({
  orgSlug,
  contract,
}: EmploymentContractLifecycleFormsProps) {
  const t = useTranslations("Dashboard.Hrm.workforce")

  const [activateState, activateAction, activatePending] = useActionState(
    activateContractAction,
    undefined
  )

  const [terminateState, terminateAction, terminatePending] = useActionState(
    terminateContractAction,
    undefined
  )

  const canActivate =
    contract.state === "draft" && Boolean(contract.signedDocumentId)
  const canTerminate = contract.state === "active"

  if (!canActivate && !canTerminate) {
    return null
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      {canActivate ? (
        <form action={activateAction} className="flex flex-col gap-2">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="contractId" value={contract.id} />
          {activateState && !activateState.ok && activateState.errors.form ? (
            <Alert variant="destructive">
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{activateState.errors.form}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" size="sm" disabled={activatePending}>
            {activatePending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                {t("contractActivating")}
              </>
            ) : (
              t("contractActivate")
            )}
          </Button>
        </form>
      ) : null}

      {canTerminate ? (
        <form action={terminateAction} className="flex flex-col gap-2">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="contractId" value={contract.id} />
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t("contractTerminateTitle")}
          </p>
          {terminateState && !terminateState.ok && terminateState.errors.form ? (
            <Alert variant="destructive">
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{terminateState.errors.form}</AlertDescription>
            </Alert>
          ) : null}
          <Field data-invalid={terminateState && !terminateState.ok && terminateState.errors.terminationDate}>
            <FieldLabel htmlFor={`term-date-${contract.id}`}>
              {t("contractTerminationDate")}
            </FieldLabel>
            <Input
              id={`term-date-${contract.id}`}
              name="terminationDate"
              type="date"
              required
              aria-invalid={Boolean(
                terminateState && !terminateState.ok && terminateState.errors.terminationDate
              )}
            />
            {terminateState && !terminateState.ok && terminateState.errors.terminationDate ? (
              <FieldError>{terminateState.errors.terminationDate}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={`term-reason-${contract.id}`}>
              {t("contractTerminationReason")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("optional")})
              </span>
            </FieldLabel>
            <Input id={`term-reason-${contract.id}`} name="terminationReason" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`term-notice-${contract.id}`}>
              {t("contractTerminationNoticeDays")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("optional")})
              </span>
            </FieldLabel>
            <Input
              id={`term-notice-${contract.id}`}
              name="terminationNoticeDays"
              type="number"
              min={0}
              max={365}
            />
          </Field>
          <Button type="submit" size="sm" variant="secondary" disabled={terminatePending}>
            {terminatePending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                {t("contractTerminating")}
              </>
            ) : (
              t("contractTerminateSubmit")
            )}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
