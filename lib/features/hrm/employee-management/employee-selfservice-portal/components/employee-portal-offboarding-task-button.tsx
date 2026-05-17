"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { completePortalOffboardingTaskAction } from "#features/hrm/client"
import type { ContractMutationFormState } from "#features/hrm/types"

type EmployeePortalOffboardingTaskButtonProps = {
  portalSlug: string
  instanceId: string
  taskKey: string
  disabled?: boolean
}

export function EmployeePortalOffboardingTaskButton({
  portalSlug,
  instanceId,
  taskKey,
  disabled,
}: EmployeePortalOffboardingTaskButtonProps) {
  const t = useTranslations("Dashboard.Hrm.portalOffboarding")
  const [state, formAction, pending] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(completePortalOffboardingTaskAction, undefined)

  if (disabled) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("taskCompleted")}
      </span>
    )
  }

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="portalSlug" value={portalSlug} />
      <input type="hidden" name="orgSlug" value="portal" />
      <input type="hidden" name="instanceId" value={instanceId} />
      <input type="hidden" name="taskKey" value={taskKey} />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        className="min-h-11"
        disabled={pending}
      >
        {pending ? t("completing") : t("completeTask")}
      </Button>
      {state && !state.ok && state.errors?.form ? (
        <p className="mt-1 text-xs text-destructive">{state.errors.form}</p>
      ) : null}
    </form>
  )
}
