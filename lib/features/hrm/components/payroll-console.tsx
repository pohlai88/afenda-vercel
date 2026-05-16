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
  generatePayrollPayslipsAction,
  postPayrollPeriodAction,
  publishPayrollPayslipsAction,
  refreshPayrollCloseSnapshotAction,
} from "../actions/payroll-close.actions"
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
import type {
  PayrollCloseActionFormState,
  PayrollCloseSnapshot,
} from "../data/payroll-close.shared"
import {
  resolvePayrollPostingState,
} from "../data/payroll-posting.shared"
import type {
  PayrollPostingRecord,
  PayrollPostingState,
} from "../data/payroll-posting.shared"

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

const initialPayrollCloseAction: PayrollCloseActionFormState = {
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
// Payroll close passport
// ---------------------------------------------------------------------------

function ChecklistStatusBadge({
  status,
}: {
  status: PayrollCloseSnapshot["checklist"][number]["status"]
}) {
  const t = useTranslations("Dashboard.Hrm.payroll")
  const label = {
    passed: t("close.status.passed"),
    warning: t("close.status.warning"),
    blocked: t("close.status.blocked"),
    pending: t("close.status.pending"),
  }[status]
  const variant =
    status === "blocked"
      ? "destructive"
      : status === "passed"
        ? "default"
        : status === "warning"
          ? "secondary"
          : "outline"

  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  )
}

function PostingStateBadge({ state }: { state: PayrollPostingState }) {
  const t = useTranslations("Dashboard.Hrm.payroll")
  const variant =
    state === "posted"
      ? "default"
      : state === "ready_to_post"
        ? "secondary"
        : state === "posting_mismatch"
          ? "destructive"
          : "outline"

  return (
    <Badge variant={variant} className="text-xs">
      {t(`close.postingState.${state}`)}
    </Badge>
  )
}

function PayrollCloseActionButton({
  periodId,
  action,
  label,
  pendingLabel,
  variant = "outline",
  disabled = false,
}: {
  periodId: string
  action: (
    prev: PayrollCloseActionFormState,
    formData: FormData
  ) => Promise<PayrollCloseActionFormState>
  label: string
  pendingLabel: string
  variant?: "default" | "outline" | "secondary"
  disabled?: boolean
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialPayrollCloseAction
  )

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="periodId" value={periodId} />
      <Button
        type="submit"
        size="sm"
        variant={variant}
        disabled={disabled || pending}
      >
        {pending ? pendingLabel : label}
      </Button>
      {state.ok && (
        <span className="text-xs text-muted-foreground">{state.message}</span>
      )}
      {!state.ok && state.errors.form && (
        <span className="text-xs text-destructive">{state.errors.form}</span>
      )}
    </form>
  )
}

export function PayrollClosePassport({
  periodId,
  snapshot,
  postingRecord,
}: {
  periodId: string
  snapshot: PayrollCloseSnapshot | null
  postingRecord: PayrollPostingRecord | null
}) {
  const t = useTranslations("Dashboard.Hrm.payroll")

  if (!snapshot) {
    return (
      <div className="rounded-md border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {t("close.title")}
            </Label>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("close.unavailable")}
            </p>
          </div>
          <PayrollCloseActionButton
            periodId={periodId}
            action={refreshPayrollCloseSnapshotAction}
            label={t("close.refresh")}
            pendingLabel={t("close.refreshing")}
          />
        </div>
      </div>
    )
  }

  const canRunGovernedCloseActions =
    snapshot.periodState === "locked" ||
    snapshot.periodState === "finalized" ||
    snapshot.periodState === "posted"
  const postingState = resolvePayrollPostingState({
    snapshot,
    persistedRecord: postingRecord,
  })
  const canPostPayroll = postingState === "ready_to_post"

  return (
    <div className="space-y-5 rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {t("close.title")}
          </Label>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums">
              {snapshot.readinessScore}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("close.readinessScore")}
            </span>
            <Badge variant="outline" className="text-xs">
              {snapshot.primaryCountryCode}
            </Badge>
          </div>
        </div>
        <div className="grid gap-2 text-right text-sm sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">{t("close.runs")}</div>
            <div className="font-medium tabular-nums">
              {snapshot.totals.employeeCount}/{snapshot.totals.runCount}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("close.netPay")}</div>
            <div className="font-medium tabular-nums">
              {snapshot.totals.netPay} {snapshot.currency}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("close.hash")}</div>
            <div className="font-mono text-xs">
              {snapshot.inputHash.slice(0, 12)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {t("close.checklist")}
          </div>
          <div className="divide-y divide-border rounded-md border border-border bg-background">
            {snapshot.checklist.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.detail}
                  </div>
                </div>
                <ChecklistStatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {t("close.exceptions")}
            </div>
            <div className="mt-3 space-y-2">
              {snapshot.exceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("close.noExceptions")}
                </p>
              ) : (
                snapshot.exceptions.map((exception) => (
                  <div
                    key={exception.id}
                    className="rounded-md border border-border bg-background px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {exception.code}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {exception.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{exception.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {t("close.evidence")}
            </div>
            <div className="mt-3 space-y-2">
              {snapshot.evidenceManifest.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("close.noEvidence")}
                </p>
              ) : (
                snapshot.evidenceManifest.map((evidence) => (
                  <div
                    key={evidence.evidenceId}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span>
                      {evidence.countryCode} · {evidence.packType}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {evidence.submissionState}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-border pt-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {t("close.postingPreview")}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span>
              {t("close.debits")}{" "}
              <strong className="tabular-nums">
                {snapshot.postingPreview.totalDebits}
              </strong>
            </span>
            <span>
              {t("close.credits")}{" "}
              <strong className="tabular-nums">
                {snapshot.postingPreview.totalCredits}
              </strong>
            </span>
            <span>
              {t("close.balance")}{" "}
              <strong className="tabular-nums">
                {snapshot.postingPreview.netBalance}
              </strong>
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {snapshot.postingPreview.lines.slice(0, 6).map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="truncate text-muted-foreground">
                  {line.accountName}
                </span>
                <span className="font-medium tabular-nums">
                  {line.side === "debit" ? "Dr" : "Cr"} {line.amount}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-border bg-background px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {t("close.postingStatus")}
              </div>
              <PostingStateBadge state={postingState} />
            </div>
            {postingRecord ? (
              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground">
                    {t("close.journalReference")}
                  </div>
                  <div className="font-medium">{postingRecord.reference}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    {t("close.postedAt")}
                  </div>
                  <div className="font-medium tabular-nums">
                    {postingRecord.postedAt ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    {t("close.postedBy")}
                  </div>
                  <div className="font-medium">
                    {postingRecord.postedByUserId ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    {t("close.postingHash")}
                  </div>
                  <div className="font-mono">
                    {postingRecord.sourceHash.slice(0, 12)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {t(`close.postingStateHint.${postingState}`)}
              </p>
            )}
            {postingState === "posting_mismatch" && (
              <p className="mt-3 text-xs text-destructive">
                {t("close.postingMismatch", {
                  currentHash: snapshot.postingPreview.inputHash.slice(0, 12),
                  postedHash: postingRecord?.sourceHash.slice(0, 12) ?? "missing",
                })}
              </p>
            )}
          </div>
        </div>
        <div className="grid min-w-48 gap-2">
          <PayrollCloseActionButton
            periodId={periodId}
            action={refreshPayrollCloseSnapshotAction}
            label={t("close.refresh")}
            pendingLabel={t("close.refreshing")}
          />
          <PayrollCloseActionButton
            periodId={periodId}
            action={postPayrollPeriodAction}
            label={t("close.postPayroll")}
            pendingLabel={t("close.postingPayroll")}
            variant="default"
            disabled={!canPostPayroll}
          />
          <PayrollCloseActionButton
            periodId={periodId}
            action={generatePayrollPayslipsAction}
            label={t("close.generatePayslips")}
            pendingLabel={t("close.generatingPayslips")}
            disabled={!canRunGovernedCloseActions}
          />
          <PayrollCloseActionButton
            periodId={periodId}
            action={publishPayrollPayslipsAction}
            label={t("close.publishPayslips")}
            pendingLabel={t("close.publishingPayslips")}
            disabled={!canRunGovernedCloseActions}
          />
        </div>
      </div>
    </div>
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
      <TraceabilityRow
        label={t("trace.q8")}
        ok={traceability.approvedUnpaidClaimCount === 0}
        value={
          traceability.approvedUnpaidClaimCount === 0
            ? t("trace.noUnpaidClaims")
            : t("trace.unpaidClaimsCount", {
                count: traceability.approvedUnpaidClaimCount,
              })
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
  closeSnapshot,
  postingRecord,
  traceability,
  pendingLockApprovalId,
}: {
  period: PayrollPeriodRow
  runs: PayrollRunRow[]
  closeSnapshot: PayrollCloseSnapshot | null
  postingRecord: PayrollPostingRecord | null
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
    (closeSnapshot ? closeSnapshot.exceptions.length === 0 : true)

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
        <PayrollClosePassport
          periodId={period.id}
          snapshot={closeSnapshot}
          postingRecord={postingRecord}
        />
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
  periodCloseSnapshots,
  periodPostingRecords,
  periodPendingLockApprovalIds,
}: {
  periods: PayrollPeriodRow[]
  periodRuns: Map<string, PayrollRunRow[]>
  periodTraceability: Map<string, PayrollPeriodTraceability>
  periodCloseSnapshots: Map<string, PayrollCloseSnapshot | null>
  periodPostingRecords: Map<string, PayrollPostingRecord | null>
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
          closeSnapshot={periodCloseSnapshots.get(period.id) ?? null}
          postingRecord={periodPostingRecords.get(period.id) ?? null}
          traceability={
            periodTraceability.get(period.id) ?? {
              employeeCount: 0,
              allContractsSnapshotted: false,
              allProfilesSnapshotted: false,
              attendanceComplete: false,
              rulePackVersion: null,
              runsWithBlockers: 0,
              approvalExists: false,
              approvedUnpaidClaimCount: 0,
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
