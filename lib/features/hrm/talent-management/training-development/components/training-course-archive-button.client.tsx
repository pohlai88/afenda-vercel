"use client"

import { Button } from "#components2/ui/button"

type TrainingCourseArchiveButtonProps = {
  organizationId: string
  orgSlug: string
  courseId: string
  archiveAction: (formData: FormData) => void | Promise<void>
  label: string
}

export function TrainingCourseArchiveButton({
  organizationId,
  orgSlug,
  courseId,
  archiveAction,
  label,
}: TrainingCourseArchiveButtonProps) {
  return (
    <form action={archiveAction}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
        {label}
      </Button>
    </form>
  )
}
