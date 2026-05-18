"use client"

import { Button } from "#components2/ui/button"

type TrainingMarkPresentButtonProps = {
  organizationId: string
  orgSlug: string
  assignmentId: string
  attendanceAction: (formData: FormData) => void | Promise<void>
  label: string
}

export function TrainingMarkPresentButton({
  organizationId,
  orgSlug,
  assignmentId,
  attendanceAction,
  label,
}: TrainingMarkPresentButtonProps) {
  return (
    <form action={attendanceAction}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="attendance" value="present" />
      <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
        {label}
      </Button>
    </form>
  )
}
