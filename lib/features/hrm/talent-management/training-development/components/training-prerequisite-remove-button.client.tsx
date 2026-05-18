"use client"

import { Button } from "#components2/ui/button"

type TrainingPrerequisiteRemoveButtonProps = {
  organizationId: string
  orgSlug: string
  prerequisiteId: string
  removeAction: (formData: FormData) => void | Promise<void>
  label: string
}

export function TrainingPrerequisiteRemoveButton({
  organizationId,
  orgSlug,
  prerequisiteId,
  removeAction,
  label,
}: TrainingPrerequisiteRemoveButtonProps) {
  return (
    <form action={removeAction}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="prerequisiteId" value={prerequisiteId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-destructive hover:text-destructive"
      >
        {label}
      </Button>
    </form>
  )
}
