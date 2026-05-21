"use client"

import { useState, useTransition } from "react"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components2/ui/select"
import { Textarea } from "#components2/ui/textarea"

import {
  assignCoachAction,
  assignMentorAction,
  createCareerDiscussionAction,
  createCareerPathFrameworkAction,
  createCareerPathStageAction,
  createDevelopmentGoalAction,
  deleteCareerPathStageAction,
  createDevelopmentMilestoneAction,
  createDevelopmentPlanAction,
  createDevelopmentSessionAction,
  createLearningActionAction,
  createStretchAssignmentAction,
  createTargetRoleAction,
  exportCareerPathReadinessCsvAction,
  updateCareerPathFrameworkStatusAction,
  updateDevelopmentGoalStatusAction,
  updateManagerReviewAction,
  updateMilestoneStatusAction,
  upsertCareerAspirationAction,
} from "#features/hrm/client"
import {
  CAREER_PATH_KINDS,
  DEVELOPMENT_GOAL_TYPES,
} from "../schemas/career-pathing.schema"

type EmployeeChoice = { id: string; label: string }
type CareerPathFrameworkStatus = "draft" | "active" | "archived"

export function CareerPathFrameworkCreateForm({
  organizationId,
  orgSlug,
  labels,
}: {
  organizationId: string
  orgSlug: string
  labels: { submit: string; code: string; name: string; kind: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => start(() => void createCareerPathFrameworkAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="cp-code">{labels.code}</Label>
          <Input id="cp-code" name="code" required maxLength={24} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cp-name">{labels.name}</Label>
          <Input id="cp-name" name="name" required maxLength={200} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="cp-kind">{labels.kind}</Label>
        <Select name="pathKind" defaultValue="vertical">
          <SelectTrigger id="cp-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAREER_PATH_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function FrameworkStatusUpdateForm({
  organizationId,
  orgSlug,
  frameworkId,
  currentStatus,
  labels,
}: {
  organizationId: string
  orgSlug: string
  frameworkId: string
  currentStatus: CareerPathFrameworkStatus
  labels: { activate: string; archive: string; restoreDraft: string }
}) {
  const [pending, start] = useTransition()

  const nextStatus =
    currentStatus === "draft"
      ? "active"
      : currentStatus === "active"
        ? "archived"
        : currentStatus === "archived"
          ? "draft"
          : null

  if (!nextStatus) return null

  const buttonLabel =
    currentStatus === "draft"
      ? labels.activate
      : currentStatus === "active"
        ? labels.archive
        : labels.restoreDraft

  return (
    <form
      action={(formData) =>
        start(() => void updateCareerPathFrameworkStatusAction(formData))
      }
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="frameworkId" value={frameworkId} />
      <input type="hidden" name="status" value={nextStatus} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {buttonLabel}
      </Button>
    </form>
  )
}

export function CareerPathStageCreateForm({
  organizationId,
  orgSlug,
  frameworkId,
  labels,
}: {
  organizationId: string
  orgSlug: string
  frameworkId: string
  labels: { submit: string; title: string; grade: string; months: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
      action={(formData) => start(() => void createCareerPathStageAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="frameworkId" value={frameworkId} />
      <Input name="title" placeholder={labels.title} required className="sm:min-w-48" />
      <Input name="targetGradeRef" placeholder={labels.grade} className="sm:min-w-32" />
      <Input
        name="expectedMonths"
        type="number"
        min={1}
        placeholder={labels.months}
        className="sm:w-28"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function CareerPathStageDeleteForm({
  organizationId,
  orgSlug,
  stageId,
  label,
}: {
  organizationId: string
  orgSlug: string
  stageId: string
  label: string
}) {
  const [pending, start] = useTransition()

  return (
    <form
      action={(formData) => start(() => void deleteCareerPathStageAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="stageId" value={stageId} />
      <Button type="submit" size="sm" variant="destructive" disabled={pending}>
        {label}
      </Button>
    </form>
  )
}

export function TargetRoleCreateForm({
  organizationId,
  orgSlug,
  employees,
  labels,
}: {
  organizationId: string
  orgSlug: string
  employees: readonly EmployeeChoice[]
  labels: { submit: string; employee: string; targetRole: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => start(() => void createTargetRoleAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="tr-employee">{labels.employee}</Label>
        <Select name="employeeId" required>
          <SelectTrigger id="tr-employee">
            <SelectValue placeholder={labels.employee} />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="tr-title">{labels.targetRole}</Label>
        <Input id="tr-title" name="targetRoleTitle" required />
      </div>
      <input type="hidden" name="source" value="hr" />
      <Button type="submit" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function DevelopmentPlanCreateForm({
  organizationId,
  orgSlug,
  employees,
  labels,
}: {
  organizationId: string
  orgSlug: string
  employees: readonly EmployeeChoice[]
  labels: { submit: string; employee: string; title: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => start(() => void createDevelopmentPlanAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <div className="flex flex-col gap-1">
        <Label>{labels.employee}</Label>
        <Select name="employeeId" required>
          <SelectTrigger>
            <SelectValue placeholder={labels.employee} />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="dp-title">{labels.title}</Label>
        <Input id="dp-title" name="title" required />
      </div>
      <Button type="submit" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function DevelopmentGoalCreateForm({
  organizationId,
  orgSlug,
  planId,
  labels,
}: {
  organizationId: string
  orgSlug: string
  planId: string
  labels: { submit: string; title: string; type: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => start(() => void createDevelopmentGoalAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="planId" value={planId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="dg-title">{labels.title}</Label>
        <Input id="dg-title" name="title" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label>{labels.type}</Label>
        <Select name="goalType" defaultValue="skill">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEVELOPMENT_GOAL_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function GoalStatusUpdateForm({
  organizationId,
  orgSlug,
  goalId,
  label,
}: {
  organizationId: string
  orgSlug: string
  goalId: string
  label: string
}) {
  const [pending, start] = useTransition()

  return (
    <form
      action={(formData) =>
        start(() => void updateDevelopmentGoalStatusAction(formData))
      }
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="goalId" value={goalId} />
      <input type="hidden" name="status" value="in_progress" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {label}
      </Button>
    </form>
  )
}

export function MilestoneCreateForm({
  organizationId,
  orgSlug,
  goalId,
  labels,
}: {
  organizationId: string
  orgSlug: string
  goalId: string
  labels: { submit: string; title: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-2"
      action={(formData) =>
        start(() => void createDevelopmentMilestoneAction(formData))
      }
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="goalId" value={goalId} />
      <Input name="title" placeholder={labels.title} required />
      <Button type="submit" size="sm" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function MilestoneCompleteForm({
  organizationId,
  orgSlug,
  milestoneId,
  label,
}: {
  organizationId: string
  orgSlug: string
  milestoneId: string
  label: string
}) {
  const [pending, start] = useTransition()

  return (
    <form
      action={(formData) => start(() => void updateMilestoneStatusAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input type="hidden" name="status" value="completed" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {label}
      </Button>
    </form>
  )
}

export function LearningActionCreateForm({
  organizationId,
  orgSlug,
  goalId,
  label,
}: {
  organizationId: string
  orgSlug: string
  goalId: string
  label: string
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex gap-2"
      action={(formData) => start(() => void createLearningActionAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="goalId" value={goalId} />
      <Input name="title" placeholder={label} className="flex-1" required />
      <Button type="submit" size="sm" disabled={pending}>
        {label}
      </Button>
    </form>
  )
}

export function StretchAssignmentCreateForm({
  organizationId,
  orgSlug,
  planId,
  labels,
}: {
  organizationId: string
  orgSlug: string
  planId: string
  labels: { submit: string; title: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-2"
      action={(formData) =>
        start(() => void createStretchAssignmentAction(formData))
      }
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="assignmentKind" value="project" />
      <Input name="title" placeholder={labels.title} required />
      <Button type="submit" size="sm" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function CoachAssignForm({
  organizationId,
  orgSlug,
  planId,
  employees,
  labels,
}: {
  organizationId: string
  orgSlug: string
  planId: string
  employees: readonly EmployeeChoice[]
  labels: { submit: string; coach: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex gap-2"
      action={(formData) => start(() => void assignCoachAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="planId" value={planId} />
      <Select name="coachEmployeeId" required>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={labels.coach} />
        </SelectTrigger>
        <SelectContent>
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function MentorAssignForm({
  organizationId,
  orgSlug,
  planId,
  employees,
  labels,
}: {
  organizationId: string
  orgSlug: string
  planId: string
  employees: readonly EmployeeChoice[]
  labels: { submit: string; mentor: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex gap-2"
      action={(formData) => start(() => void assignMentorAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="planId" value={planId} />
      <Select name="mentorEmployeeId" required>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={labels.mentor} />
        </SelectTrigger>
        <SelectContent>
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function CareerAspirationUpsertForm({
  organizationId,
  orgSlug,
  employees,
  labels,
}: {
  organizationId: string
  orgSlug: string
  employees: readonly EmployeeChoice[]
  labels: {
    submit: string
    employee: string
    preferredRole: string
    mobility: string
    notes: string
  }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => start(() => void upsertCareerAspirationAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <Select name="employeeId" required>
        <SelectTrigger>
          <SelectValue placeholder={labels.employee} />
        </SelectTrigger>
        <SelectContent>
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input name="preferredRoleTitle" placeholder={labels.preferredRole} />
      <Input name="mobilityPreference" placeholder={labels.mobility} />
      <Textarea name="notes" placeholder={labels.notes} rows={2} />
      <Button type="submit" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function DevelopmentSessionCreateForm({
  organizationId,
  orgSlug,
  planId,
  labels,
}: {
  organizationId: string
  orgSlug: string
  planId: string
  labels: { submit: string; kind: string; date: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      action={(formData) =>
        start(() => void createDevelopmentSessionAction(formData))
      }
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="planId" value={planId} />
      <Select name="sessionKind" defaultValue="mentor" required>
        <SelectTrigger className="w-36">
          <SelectValue placeholder={labels.kind} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mentor">mentor</SelectItem>
          <SelectItem value="coach">coach</SelectItem>
        </SelectContent>
      </Select>
      <Input name="sessionDate" type="date" required aria-label={labels.date} />
      <Button type="submit" size="sm" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

export function ManagerReviewUpdateForm({
  organizationId,
  orgSlug,
  planId,
  labels,
}: {
  organizationId: string
  orgSlug: string
  planId: string
  labels: { submit: string; note: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-2"
      action={(formData) => start(() => void updateManagerReviewAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="planId" value={planId} />
      <Textarea name="managerReviewNote" placeholder={labels.note} rows={3} required />
      <Button type="submit" size="sm" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function CareerPathReadinessExportButton({ label }: { label: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null)
          start(async () => {
            const result = await exportCareerPathReadinessCsvAction()
            if (!result.ok) {
              setError(result.error)
              return
            }
            downloadCsv(result.filename, result.csv)
          })
        }}
      >
        {label}
      </Button>
    </div>
  )
}

export function CareerDiscussionCreateForm({
  organizationId,
  orgSlug,
  employees,
  labels,
}: {
  organizationId: string
  orgSlug: string
  employees: readonly EmployeeChoice[]
  labels: { submit: string; employee: string; date: string; notes: string }
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => start(() => void createCareerDiscussionAction(formData))}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <Select name="employeeId" required>
        <SelectTrigger>
          <SelectValue placeholder={labels.employee} />
        </SelectTrigger>
        <SelectContent>
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input name="discussionDate" type="date" required aria-label={labels.date} />
      <Textarea name="notes" placeholder={labels.notes} rows={3} />
      <Button type="submit" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  )
}
