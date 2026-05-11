"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Separator } from "#components/ui/separator"
import { Textarea } from "#components/ui/textarea"

import {
  createPayrollPeriodAction,
  lockPayrollPeriodAction,
  preparePayrollRunsAction,
} from "../actions/payroll-period.actions"
import {
  approvePayrollPeriodLockApprovalAction,
  rejectPayrollPeriodLockApprovalAction,
  requestPayrollPeriodLockApprovalAction,
} from "../actions/payroll-lock-approval.actions"
import type {
  LockPayrollPeriodFormState,
  PayrollLockApprovalFormState,
  PayrollPeriodCreateFormState,
  PreparePayrollRunsFormState,
} from "../types"
import type {
  PayrollPeriodRow,
  PayrollRunRow,
} from "../data/payroll.queries.server"
import type { PayrollPeriodTraceability } from "../data/payroll-engine.server"

// ---------------------------------------------------------------------------
// Period state badge
// ---------------------------------------------------------------------------

type PeriodState = "open" | "preparing" | "locked" | "finalized" | "posted"

const STATE_VARIANT: Record<
  PeriodState,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "secondary",
  preparing: "default",
  locked: "outline",
  finalized: "outline",
  posted: "outline",
}

const STATE_LABELS: Record<PeriodState, string> = {
  open: "Open",
  preparing: "Preparing",
  locked: "Locked",
  finalized: "Finalized",
  posted: "Posted",
}

function PeriodStateBadge({ state }: { state: string }) {
  const s =
    (state as PeriodState) in STATE_LABELS ? (state as PeriodState) : "open"
  return (
    <Badge variant={STATE_VARIANT[s] ?? "secondary"}>{STATE_LABELS[s]}</Badge>
  )
}

// ---------------------------------------------------------------------------
// Create period form
// ---------------------------------------------------------------------------

const initialCreateState: PayrollPeriodCreateFormState = {
  ok: false,
  errors: {},
}

export function CreatePayrollPeriodForm() {
  const t = useTranslations("Dashboard.Hrm.payroll")
  const [state, action, pending] = useActionState(
    createPayrollPeriodAction,
    initialCreateState
  )

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          data-invalid={
            !state.ok &&
            Boolean(
              (state as { errors: { periodStart?: string } }).errors.periodStart
            )
          }
        >
          <FieldLabel htmlFor="payroll-period-start">
            {t("fieldPeriodStart")}
          </FieldLabel>
          <Input
            id="payroll-period-start"
            name="periodStart"
            type="date"
            required
            disabled={pending}
          />
          {!state.ok &&
            (state as { errors: { periodStart?: string } }).errors
              .periodStart && (
              <FieldError>
                {
                  (state as { errors: { periodStart?: string } }).errors
                    .periodStart
                }
              </FieldError>
            )}
        </Field>
        <Field
          data-invalid={
            !state.ok &&
            Boolean(
              (state as { errors: { periodEnd?: string } }).errors.periodEnd
            )
          }
        >
          <FieldLabel htmlFor="payroll-period-end">
            {t("fieldPeriodEnd")}
          </FieldLabel>
          <Input
            id="payroll-period-end"
            name="periodEnd"
            type="date"
            required
            disabled={pending}
          />
          {!state.ok &&
            (state as { errors: { periodEnd?: string } }).errors.periodEnd && (
              <FieldError>
                {(state as { errors: { periodEnd?: string } }).errors.periodEnd}
              </FieldError>
            )}
        </Field>
        <Field
          data-invalid={
            !state.ok &&
            Boolean(
              (state as { errors: { paymentDate?: string } }).errors.paymentDate
            )
          }
        >
          <FieldLabel htmlFor="payroll-payment-date">
            {t("fieldPaymentDate")}
          </FieldLabel>
          <Input
            id="payroll-payment-date"
            name="paymentDate"
            type="date"
            required
            disabled={pending}
          />
          {!state.ok &&
            (state as { errors: { paymentDate?: string } }).errors
              .paymentDate && (
              <FieldError>
                {
                  (state as { errors: { paymentDate?: string } }).errors
                    .paymentDate
                }
              </FieldError>
            )}
        </Field>
      </div>
      <div className="flex items-end gap-3">
        <Field className="w-24">
          <FieldLabel htmlFor="payroll-currency">
            {t("fieldCurrency")}
          </FieldLabel>
          <Input
            id="payroll-currency"
            name="currency"
            defaultValue="MYR"
            maxLength={3}
            disabled={pending}
          />
        </Field>
        <Button type="submit" disabled={pending} size="sm" className="mb-px">
          {pending ? t("creating") : t("createPeriod")}
        </Button>
      </div>
      {!state.ok && (state as { errors: { form?: string } }).errors.form && (
        <p className="text-sm text-destructive">
          {(state as { errors: { form?: string } }).errors.form}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {t("periodCreated")}
        </p>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Prepare runs button
// ---------------------------------------------------------------------------

const initialPrepareState: PreparePayrollRunsFormState = {
  ok: false,
  errors: {},
}

export function PreparePayrollRunsButton({ periodId }: { periodId: string }) {
  const t = useTranslations("Dashboard.Hrm.payroll")
  const [state, action, pending] = useActionState(
    preparePayrollRunsAction,
    initialPrepareState
  )

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="periodId" value={periodId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? t("preparing") : t("prepareRuns")}
      </Button>
      {state.ok && (
        <span className="text-xs text-muted-foreground">
          {t("runsCreated", { count: state.runCount })}
        </span>
      )}
      {!state.ok && (state as { errors: { form?: string } }).errors.form && (
        <span className="text-xs text-destructive">
          {(state as { errors: { form?: string } }).errors.form}
        </span>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Phase 3B — lock certification + period lock (MYR / MY rule pack)
// ---------------------------------------------------------------------------

const initialPayrollLockApproval: PayrollLockApprovalFormState = {
  ok: false,
  errors: {},
}

const initialLockPeriod: LockPayrollPeriodFormState = {
  ok: false,
  errors: {},
}

export function RequestPayrollLockApprovalButton({
  periodId,
  disabled,
}: {
  periodId: string
  disabled: boolean
}) {
  const t = useTranslations("Dashboard.Hrm.payroll")
  const [state, action, pending] = useActionState(
    requestPayrollPeriodLockApprovalAction,
    initialPayrollLockApproval
  )

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="periodId" value={periodId} />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={disabled || pending}
      >
        {pending ? t("requestingLockApproval") : t("requestLockApproval")}
      </Button>
      {state.ok && (
        <span className="text-xs text-muted-foreground">
          {t("lockApprovalRequested")}
        </span>
      )}
      {!state.ok && state.errors.form && (
        <span className="text-xs text-destructive">{state.errors.form}</span>
      )}
    </form>
  )
}

export function ApprovePayrollLockButton({
  approvalId,
}: {
  approvalId: string
}) {
  const t = useTranslations("Dashboard.Hrm.payroll")
  const [state, action, pending] = useActionState(
    approvePayrollPeriodLockApprovalAction,
    initialPayrollLockApproval
  )

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="approvalId" value={approvalId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("approvingLockApproval") : t("approveLockApproval")}
      </Button>
      {!state.ok && state.errors.form && (
        <span className="text-xs text-destructive">{state.errors.form}</span>
      )}
    </form>
  )
}

export function RejectPayrollLockForm({ approvalId }: { approvalId: string }) {
  const t = useTranslations("Dashboard.Hrm.payroll")
  const [state, action, pending] = useActionState(
    rejectPayrollPeriodLockApprovalAction,
    initialPayrollLockApproval
  )

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-md border border-border bg-background p-3"
    >
      <input type="hidden" name="approvalId" value={approvalId} />
      <Field>
        <FieldLabel htmlFor={`reject-lock-${approvalId}`}>
          {t("rejectReasonLabel")}
        </FieldLabel>
        <Textarea
          id={`reject-lock-${approvalId}`}
          name="rejectedReason"
          required
          disabled={pending}
          rows={2}
          className="min-h-0"
        />
      </Field>
      <Button type="submit" size="sm" variant="destructive" disabled={pending}>
        {pending ? t("rejectingLockApproval") : t("rejectLockApproval")}
      </Button>
      {!state.ok && state.errors.form && (
        <span className="text-xs text-destructive">{state.errors.form}</span>
      )}
    </form>
  )
}

export function LockPayrollPeriodButton({
  periodId,
  disabled,
}: {
  periodId: string
  disabled: boolean
}) {
  const t = useTranslations("Dashboard.Hrm.payroll")
  const [state, action, pending] = useActionState(
    lockPayrollPeriodAction,
    initialLockPeriod
  )

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="periodId" value={periodId} />
      <Button type="submit" size="sm" disabled={disabled || pending}>
        {pending ? t("lockingPeriod") : t("lockPeriod")}
      </Button>
      {state.ok && (
        <span className="text-xs text-green-600 dark:text-green-400">
          {t("periodLocked")}
        </span>
      )}
      {!state.ok && state.errors.form && (
        <span className="text-xs text-destructive">{state.errors.form}</span>
      )}
      {!state.ok && state.errors.periodId && (
        <span className="text-xs text-destructive">
          {state.errors.periodId}
        </span>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Traceability panel (7 questions)
// ---------------------------------------------------------------------------

function TraceabilityRow({
  label,
  ok,
  value,
}: {
  label: string
  ok: boolean
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium ${ok ? "text-foreground" : "text-amber-600 dark:text-amber-400"}`}
        >
          {value}
        </span>
        <span
          className={`inline-flex size-2 rounded-full ${ok ? "bg-green-500" : "bg-amber-400"}`}
          aria-hidden
        />
      </div>
    </div>
  )
}

export function PayrollTraceabilityPanel({
  traceability,
}: {
  traceability: PayrollPeriodTraceability
}) {
  const t = useTranslations("Dashboard.Hrm.payroll")

  return (
    <div className="divide-y divide-border">
      <TraceabilityRow
        label={t("trace.q1")}
        ok={traceability.employeeCount > 0}
        value={String(traceability.employeeCount)}
      />
      <TraceabilityRow
        label={t("trace.q2")}
        ok={traceability.allContractsSnapshotted}
        value={
          traceability.allContractsSnapshotted
            ? t("trace.complete")
            : t("trace.missing")
        }
      />
      <TraceabilityRow
        label={t("trace.q3")}
        ok={traceability.allProfilesSnapshotted}
        value={
          traceability.allProfilesSnapshotted
            ? t("trace.complete")
            : t("trace.missing")
        }
      />
      <TraceabilityRow
        label={t("trace.q4")}
        ok={traceability.attendanceComplete}
        value={
          traceability.attendanceComplete
            ? t("trace.complete")
            : t("trace.pending")
        }
      />
      <TraceabilityRow
        label={t("trace.q5")}
        ok={traceability.rulePackVersion !== null}
        value={traceability.rulePackVersion ?? t("trace.notPinned")}
      />
      <TraceabilityRow
        label={t("trace.q6")}
        ok={traceability.runsWithBlockers === 0}
        value={
          traceability.runsWithBlockers === 0
            ? t("trace.none")
            : t("trace.blockerCount", {
                count: traceability.runsWithBlockers,
              })
        }
      />
      <TraceabilityRow
        label={t("trace.q7")}
        ok={traceability.approvalExists}
        value={
          traceability.approvalExists ? t("trace.approved") : t("trace.pending")
        }
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Run summary table
// ---------------------------------------------------------------------------

export function PayrollRunTable({ runs }: { runs: PayrollRunRow[] }) {
  const t = useTranslations("Dashboard.Hrm.payroll")
  if (runs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {t("noRuns")}
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-4 text-left font-medium">
              {t("colEmployee")}
            </th>
            <th className="py-2 pr-4 text-left font-medium">{t("colState")}</th>
            <th className="py-2 pr-4 text-right font-medium">
              {t("colGrossPay")}
            </th>
            <th className="py-2 pr-4 text-right font-medium">
              {t("colNetPay")}
            </th>
            <th className="py-2 text-right font-medium">
              {t("colEmployerCost")}
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="border-b border-border/50 last:border-0"
            >
              <td className="py-2 pr-4">
                <span className="font-medium">{run.employeeLegalName}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {run.employeeNumber}
                </span>
              </td>
              <td className="py-2 pr-4">
                <Badge
                  variant={
                    run.state === "computed"
                      ? "default"
                      : run.state === "locked"
                        ? "outline"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {run.state}
                </Badge>
                {run.validationIssues.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {t("hasIssues", { count: run.validationIssues.length })}
                  </Badge>
                )}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {run.grossPay}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {run.netPay}
              </td>
              <td className="py-2 text-right tabular-nums">
                {run.employerCost}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Period detail card (with traceability + runs)
// ---------------------------------------------------------------------------

export function PayrollPeriodDetailCard({
  period,
  runs,
  traceability,
  pendingLockApprovalId,
}: {
  period: PayrollPeriodRow
  runs: PayrollRunRow[]
  traceability: PayrollPeriodTraceability
  pendingLockApprovalId: string | null
}) {
  const t = useTranslations("Dashboard.Hrm.payroll")
  const isOpen = period.state === "open"
  const isPreparing = period.state === "preparing"
  const isLocked = period.state === "locked"
  const allRunsComputed =
    runs.length > 0 &&
    runs.every((r) => r.state === "computed" || r.state === "locked")
  const canRequestApproval =
    isPreparing &&
    allRunsComputed &&
    traceability.runsWithBlockers === 0 &&
    traceability.attendanceComplete &&
    !traceability.approvalExists &&
    pendingLockApprovalId === null
  const canLock =
    isPreparing &&
    traceability.approvalExists &&
    allRunsComputed &&
    traceability.runsWithBlockers === 0 &&
    traceability.attendanceComplete &&
    period.currency === "MYR"

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold">
            {period.periodStart} — {period.periodEnd}
          </CardTitle>
          <CardDescription>
            {t("paymentDateLabel")} {period.paymentDate} · {period.currency}
            {period.rulePackVersion ? (
              <>
                {" "}
                · {t("pinnedRulePackLabel")} {period.rulePackVersion}
              </>
            ) : null}
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PeriodStateBadge state={period.state} />
          {isOpen && <PreparePayrollRunsButton periodId={period.id} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-1 block text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {t("traceabilityTitle")}
          </Label>
          <PayrollTraceabilityPanel traceability={traceability} />
        </div>
        {(isPreparing || !isOpen) && runs.length > 0 && (
          <>
            <Separator />
            <div>
              <Label className="mb-3 block text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {t("runsTitle")}
              </Label>
              <PayrollRunTable runs={runs} />
            </div>
          </>
        )}
        {isPreparing && !isLocked && (
          <div className="space-y-4 rounded-md border border-border bg-muted/30 px-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t("lockWorkflowHint")}
            </p>
            <div className="flex flex-col gap-4">
              {canRequestApproval && (
                <RequestPayrollLockApprovalButton
                  periodId={period.id}
                  disabled={false}
                />
              )}
              {pendingLockApprovalId !== null && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("pendingLockApprovalTitle")}
                  </p>
                  <ApprovePayrollLockButton
                    approvalId={pendingLockApprovalId}
                  />
                  <RejectPayrollLockForm approvalId={pendingLockApprovalId} />
                </div>
              )}
              {canLock && (
                <LockPayrollPeriodButton
                  periodId={period.id}
                  disabled={false}
                />
              )}
              {period.currency !== "MYR" && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t("lockMyrOnly")}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Top-level payroll console (list of periods + create form)
// ---------------------------------------------------------------------------

export function PayrollConsolePage({
  periods,
  periodRuns,
  periodTraceability,
  periodPendingLockApprovalIds,
}: {
  periods: PayrollPeriodRow[]
  periodRuns: Map<string, PayrollRunRow[]>
  periodTraceability: Map<string, PayrollPeriodTraceability>
  periodPendingLockApprovalIds: Map<string, string | null>
}) {
  const t = useTranslations("Dashboard.Hrm.payroll")

  return (
    <div className="space-y-8">
      {/* Create new period */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {t("createPeriodTitle")}
          </CardTitle>
          <CardDescription>{t("createPeriodDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreatePayrollPeriodForm />
        </CardContent>
      </Card>

      {/* Existing periods */}
      {periods.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noPeriods")}</p>
      )}
      {periods.map((period) => (
        <PayrollPeriodDetailCard
          key={period.id}
          period={period}
          runs={periodRuns.get(period.id) ?? []}
          traceability={
            periodTraceability.get(period.id) ?? {
              employeeCount: 0,
              allContractsSnapshotted: false,
              allProfilesSnapshotted: false,
              attendanceComplete: false,
              rulePackVersion: null,
              runsWithBlockers: 0,
              approvalExists: false,
            }
          }
          pendingLockApprovalId={
            periodPendingLockApprovalIds.get(period.id) ?? null
          }
        />
      ))}
    </div>
  )
}
