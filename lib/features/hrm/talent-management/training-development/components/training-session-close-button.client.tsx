"use client"

import { Button } from "#components2/ui/button"

type TrainingSessionCloseButtonProps = {
  organizationId: string
  orgSlug: string
  sessionId: string
  closeAction: (formData: FormData) => void | Promise<void>
  label: string
}

export function TrainingSessionCloseButton({
  organizationId,
  orgSlug,
  sessionId,
  closeAction,
  label,
}: TrainingSessionCloseButtonProps) {
  return (
    <form action={closeAction}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button type="submit" variant="outline" size="sm">
        {label}
      </Button>
    </form>
  )
}
