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
  assignEmployeePlacementAction,
  createDepartmentAction,
  createJobGradeAction,
  createPositionAction,
} from "#features/hrm/client"

import type {
  DepartmentListRow,
  JobGradeListRow,
} from "../data/org-structure.queries.server"

type ParentChoice = { readonly id: string; readonly label: string }
type Choice = { readonly id: string; readonly label: string }

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
          <Field>
            <FieldLabel htmlFor="dept-cost-center">
              {t("fieldCostCenter")}
            </FieldLabel>
            <Input
              id="dept-cost-center"
              name="costCenterCode"
              autoComplete="off"
            />
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
          <Field>
            <FieldLabel htmlFor="grade-ordinal">{t("fieldOrdinal")}</FieldLabel>
            <Input
              id="grade-ordinal"
              name="ordinal"
              type="number"
              min={0}
              defaultValue={0}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="grade-min-salary">
                {t("fieldMinSalary")}
              </FieldLabel>
              <Input
                id="grade-min-salary"
                name="minSalaryAmount"
                inputMode="decimal"
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="grade-max-salary">
                {t("fieldMaxSalary")}
              </FieldLabel>
              <Input
                id="grade-max-salary"
                name="maxSalaryAmount"
                inputMode="decimal"
                autoComplete="off"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="grade-currency">
                {t("fieldCurrency")}
              </FieldLabel>
              <Input
                id="grade-currency"
                name="currency"
                defaultValue="MYR"
                maxLength={3}
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="grade-benefit-tier">
                {t("fieldBenefitTier")}
              </FieldLabel>
              <Input
                id="grade-benefit-tier"
                name="benefitTierCode"
                autoComplete="off"
              />
            </Field>
          </div>
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
  positions,
  onClose,
}: {
  orgSlug: string
  departments: readonly DepartmentListRow[]
  grades: readonly JobGradeListRow[]
  positions: readonly Choice[]
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
          <Field>
            <FieldLabel htmlFor="pos-reports-to">
              {t("fieldReportsTo")}
            </FieldLabel>
            <select
              id="pos-reports-to"
              name="reportsToPositionId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              defaultValue=""
            >
              <option value="">{t("reportsToNone")}</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="pos-employment-type">
                {t("fieldEmploymentType")}
              </FieldLabel>
              <Input
                id="pos-employment-type"
                name="employmentType"
                defaultValue="permanent"
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="pos-headcount">
                {t("fieldHeadcountBudget")}
              </FieldLabel>
              <Input
                id="pos-headcount"
                name="headcountBudget"
                type="number"
                min={0}
              />
            </Field>
          </div>
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
  positions,
}: {
  orgSlug: string
  departments: readonly DepartmentListRow[]
  grades: readonly JobGradeListRow[]
  positions: readonly Choice[]
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
          positions={positions}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Dialog>
  )
}

function OrganizationAssignmentDialogBody({
  orgSlug,
  employees,
  departments,
  positions,
  grades,
  onClose,
}: {
  orgSlug: string
  employees: readonly Choice[]
  departments: readonly Choice[]
  positions: readonly Choice[]
  grades: readonly Choice[]
  onClose: () => void
}) {
  const t = useTranslations("Dashboard.Hrm.organization.assignments")
  const [state, formAction, pending] = useActionState(
    assignEmployeePlacementAction,
    undefined
  )

  return (
    <DialogContent className="sm:max-w-lg">
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
            <FieldLabel htmlFor="assign-employee">
              {t("fieldEmployee")}
            </FieldLabel>
            <select
              id="assign-employee"
              name="employeeId"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              defaultValue={employees[0]?.id ?? ""}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
            {state && !state.ok && state.errors.employeeId ? (
              <FieldError>{state.errors.employeeId}</FieldError>
            ) : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="assign-dept">
                {t("fieldDepartment")}
              </FieldLabel>
              <select
                id="assign-dept"
                name="departmentId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                defaultValue=""
              >
                <option value="">{t("none")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="assign-position">
                {t("fieldPosition")}
              </FieldLabel>
              <select
                id="assign-position"
                name="positionId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                defaultValue=""
              >
                <option value="">{t("none")}</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="assign-grade">{t("fieldGrade")}</FieldLabel>
              <select
                id="assign-grade"
                name="jobGradeId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                defaultValue=""
              >
                <option value="">{t("none")}</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="assign-manager">
                {t("fieldManager")}
              </FieldLabel>
              <select
                id="assign-manager"
                name="managerEmployeeId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                defaultValue=""
              >
                <option value="">{t("none")}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="assign-effective">
                {t("fieldEffectiveFrom")}
              </FieldLabel>
              <Input
                id="assign-effective"
                name="effectiveFrom"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
              {state && !state.ok && state.errors.effectiveFrom ? (
                <FieldError>{state.errors.effectiveFrom}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="assign-location">
                {t("fieldWorkLocation")}
              </FieldLabel>
              <Input
                id="assign-location"
                name="workLocationCode"
                autoComplete="off"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="assign-cost-center">
                {t("fieldCostCenter")}
              </FieldLabel>
              <Input
                id="assign-cost-center"
                name="costCenterCode"
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="assign-reason">
                {t("fieldReason")}
              </FieldLabel>
              <Input id="assign-reason" name="reason" autoComplete="off" />
            </Field>
          </div>
          <Button type="submit" disabled={pending || employees.length === 0}>
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

export function OrganizationAssignmentDialog({
  orgSlug,
  employees,
  departments,
  positions,
  grades,
}: {
  orgSlug: string
  employees: readonly Choice[]
  departments: readonly Choice[]
  positions: readonly Choice[]
  grades: readonly Choice[]
}) {
  const t = useTranslations("Dashboard.Hrm.organization.assignments")
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
        <Button size="sm" type="button" disabled={employees.length === 0}>
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("create")}
        </Button>
      </DialogTrigger>
      {open ? (
        <OrganizationAssignmentDialogBody
          key={mountKey}
          orgSlug={orgSlug}
          employees={employees}
          departments={departments}
          positions={positions}
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
