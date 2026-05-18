"use client"

import { Button } from "#components2/ui/button"

type TrainingAssignmentRowActionsProps = {
  organizationId: string
  orgSlug: string
  assignmentId: string
  courseId: string
  employeeId: string
  completedAt: string
  completeAction: (formData: FormData) => void | Promise<void>
  waiveAction: (formData: FormData) => void | Promise<void>
  cancelAction: (formData: FormData) => void | Promise<void>
  labels: {
    complete: string
    waive: string
    cancel: string
  }
}

export function TrainingAssignmentRowActions({
  organizationId,
  orgSlug,
  assignmentId,
  courseId,
  employeeId,
  completedAt,
  completeAction,
  waiveAction,
  cancelAction,
  labels,
}: TrainingAssignmentRowActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <form action={completeAction}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="completedAt" value={completedAt} />
        <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
          {labels.complete}
        </Button>
      </form>
      <form action={waiveAction}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
          {labels.waive}
        </Button>
      </form>
      <form action={cancelAction}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive"
        >
          {labels.cancel}
        </Button>
      </form>
    </div>
  )
}
