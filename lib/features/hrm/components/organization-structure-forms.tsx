"use client"

import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, PlusIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog"
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"

import {
  archiveDepartmentAction,
  archiveJobGradeAction,
  archivePositionAction,
  createDepartmentAction,
  createJobGradeAction,
  createPositionAction,
} from "#features/hrm/client"

import type {
  DepartmentListRow,
  JobGradeListRow,
} from "../data/org-structure.queries.server"

type ParentChoice = { readonly id: string; readonly label: string }

function OrganizationDepartmentCreateDialogBody({
  orgSlug,
  parentChoices,
  onClose,
}: {
  orgSlug: string
  parentChoices: readonly ParentChoice[]
  onClose: () => void
}) {
  const t = useTranslations("Dashboard.Hrm.organization.departments")
  const [state, formAction, pending] = useActionState(
    createDepartmentAction,
    undefined
  )

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("createTitle")}</DialogTitle>
        <DialogDescription>{t("createDescription")}</DialogDescription>
      </DialogHeader>
      {state?.ok ? (
        <div className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>{t("createSuccess")}</AlertTitle>
          </Alert>
          <Button type="button" onClick={onClose}>
            {t("dialogClose")}
          </Button>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          {state && !state.ok && state.errors.form ? (
            <Alert variant="destructive">
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="dept-code">{t("fieldCode")}</FieldLabel>
            <Input id="dept-code" name="code" required autoComplete="off" />
            {state && !state.ok && state.errors.code ? (
              <FieldError>{state.errors.code}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-name">{t("fieldName")}</FieldLabel>
            <Input id="dept-name" name="name" required autoComplete="off" />
            {state && !state.ok && state.errors.name ? (
              <FieldError>{state.errors.name}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-parent">{t("fieldParent")}</FieldLabel>
            <select
              id="dept-parent"
              name="parentDepartmentId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              defaultValue=""
            >
              <option value="">{t("parentNone")}</option>
              {parentChoices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("saving")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>
      )}
    </DialogContent>
  )
}

export function OrganizationDepartmentCreateDialog({
  orgSlug,
  parentChoices,
}: {
  orgSlug: string
  parentChoices: readonly ParentChoice[]
}) {
  const t = useTranslations("Dashboard.Hrm.organization.departments")
  const [open, setOpen] = useState(false)
  const [mountKey, setMountKey] = useState(0)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setMountKey((k) => k + 1)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("create")}
        </Button>
      </DialogTrigger>
      {open ? (
        <OrganizationDepartmentCreateDialogBody
          key={mountKey}
          orgSlug={orgSlug}
          parentChoices={parentChoices}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Dialog>
  )
}

export function OrganizationDepartmentArchiveForm({
  orgSlug,
  departmentId,
}: {
  orgSlug: string
  departmentId: string
}) {
  const t = useTranslations("Dashboard.Hrm.organization.departments")
  const [state, formAction, pending] = useActionState(
    archiveDepartmentAction,
    undefined
  )
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="departmentId" value={departmentId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? t("archiving") : t("archive")}
      </Button>
      {state && !state.ok && state.errors.form ? (
        <span className="ml-2 text-xs text-destructive">
          {state.errors.form}
        </span>
      ) : null}
    </form>
  )
}

function OrganizationJobGradeCreateDialogBody({
  orgSlug,
  onClose,
}: {
  orgSlug: string
  onClose: () => void
}) {
  const t = useTranslations("Dashboard.Hrm.organization.grades")
  const [state, formAction, pending] = useActionState(
    createJobGradeAction,
    undefined
  )

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("createTitle")}</DialogTitle>
        <DialogDescription>{t("createDescription")}</DialogDescription>
      </DialogHeader>
      {state?.ok ? (
        <div className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>{t("createSuccess")}</AlertTitle>
          </Alert>
          <Button type="button" onClick={onClose}>
            {t("dialogClose")}
          </Button>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          {state && !state.ok && state.errors.form ? (
            <Alert variant="destructive">
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="grade-code">{t("fieldCode")}</FieldLabel>
            <Input id="grade-code" name="code" required autoComplete="off" />
            {state && !state.ok && state.errors.code ? (
              <FieldError>{state.errors.code}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="grade-name">{t("fieldName")}</FieldLabel>
            <Input id="grade-name" name="name" required autoComplete="off" />
            {state && !state.ok && state.errors.name ? (
              <FieldError>{state.errors.name}</FieldError>
            ) : null}
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("saving")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>
      )}
    </DialogContent>
  )
}

export function OrganizationJobGradeCreateDialog({
  orgSlug,
}: {
  orgSlug: string
}) {
  const t = useTranslations("Dashboard.Hrm.organization.grades")
  const [open, setOpen] = useState(false)
  const [mountKey, setMountKey] = useState(0)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setMountKey((k) => k + 1)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("create")}
        </Button>
      </DialogTrigger>
      {open ? (
        <OrganizationJobGradeCreateDialogBody
          key={mountKey}
          orgSlug={orgSlug}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Dialog>
  )
}

export function OrganizationJobGradeArchiveForm({
  orgSlug,
  gradeId,
}: {
  orgSlug: string
  gradeId: string
}) {
  const t = useTranslations("Dashboard.Hrm.organization.grades")
  const [state, formAction, pending] = useActionState(
    archiveJobGradeAction,
    undefined
  )
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="gradeId" value={gradeId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? t("archiving") : t("archive")}
      </Button>
      {state && !state.ok && state.errors.form ? (
        <span className="ml-2 text-xs text-destructive">
          {state.errors.form}
        </span>
      ) : null}
    </form>
  )
}

function OrganizationPositionCreateDialogBody({
  orgSlug,
  departments,
  grades,
  onClose,
}: {
  orgSlug: string
  departments: readonly DepartmentListRow[]
  grades: readonly JobGradeListRow[]
  onClose: () => void
}) {
  const t = useTranslations("Dashboard.Hrm.organization.positions")
  const [state, formAction, pending] = useActionState(
    createPositionAction,
    undefined
  )

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("createTitle")}</DialogTitle>
        <DialogDescription>{t("createDescription")}</DialogDescription>
      </DialogHeader>
      {state?.ok ? (
        <div className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>{t("createSuccess")}</AlertTitle>
          </Alert>
          <Button type="button" onClick={onClose}>
            {t("dialogClose")}
          </Button>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          {state && !state.ok && state.errors.form ? (
            <Alert variant="destructive">
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="pos-code">{t("fieldCode")}</FieldLabel>
            <Input id="pos-code" name="code" required autoComplete="off" />
            {state && !state.ok && state.errors.code ? (
              <FieldError>{state.errors.code}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="pos-title">{t("fieldTitle")}</FieldLabel>
            <Input id="pos-title" name="title" required autoComplete="off" />
            {state && !state.ok && state.errors.title ? (
              <FieldError>{state.errors.title}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="pos-dept">{t("fieldDepartment")}</FieldLabel>
            <select
              id="pos-dept"
              name="departmentId"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              defaultValue={departments[0]?.id ?? ""}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
            {state && !state.ok && state.errors.departmentId ? (
              <FieldError>{state.errors.departmentId}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="pos-grade">
              {t("fieldDefaultGrade")}
            </FieldLabel>
            <select
              id="pos-grade"
              name="defaultGradeId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              defaultValue=""
            >
              <option value="">{t("gradeNone")}</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} — {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={pending || departments.length === 0}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("saving")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>
      )}
    </DialogContent>
  )
}

export function OrganizationPositionCreateDialog({
  orgSlug,
  departments,
  grades,
}: {
  orgSlug: string
  departments: readonly DepartmentListRow[]
  grades: readonly JobGradeListRow[]
}) {
  const t = useTranslations("Dashboard.Hrm.organization.positions")
  const [open, setOpen] = useState(false)
  const [mountKey, setMountKey] = useState(0)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setMountKey((k) => k + 1)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" type="button" disabled={departments.length === 0}>
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("create")}
        </Button>
      </DialogTrigger>
      {open ? (
        <OrganizationPositionCreateDialogBody
          key={mountKey}
          orgSlug={orgSlug}
          departments={departments}
          grades={grades}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Dialog>
  )
}

export function OrganizationPositionArchiveForm({
  orgSlug,
  positionId,
}: {
  orgSlug: string
  positionId: string
}) {
  const t = useTranslations("Dashboard.Hrm.organization.positions")
  const [state, formAction, pending] = useActionState(
    archivePositionAction,
    undefined
  )
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="positionId" value={positionId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? t("archiving") : t("archive")}
      </Button>
      {state && !state.ok && state.errors.form ? (
        <span className="ml-2 text-xs text-destructive">
          {state.errors.form}
        </span>
      ) : null}
    </form>
  )
}
