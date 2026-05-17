import "server-only"

import { createHash } from "node:crypto"

import { put } from "@vercel/blob"
import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApproval,
  hrmDocument,
  hrmEmployee,
  hrmPayrollPeriod,
  hrmPayrollRun,
} from "#lib/db/schema"

import { listComplianceEvidenceForPeriod } from "../../../employee-management/compliance-regulatory-tracking/data/compliance.queries.server"
import {
  buildPayrollPostingPreviewFromInputs,
  classifyPayrollCloseExceptions,
  computePayrollCloseReadinessScore,
  payrollCentsToDecimal,
  payrollDecimalToCents,
  stablePayrollCloseStringify,
} from "./payroll-close.shared"
import {
  getPendingPayrollPeriodLockApprovalId,
  getPayrollPeriod,
  getPayrollPeriodPrimaryCountryCode,
  isAttendancePayrollReadyForPeriod,
  listPayrollLinesForPeriod,
  listPayrollLinesForRun,
  listPayrollRunsForPeriod,
} from "./payroll.queries.server"
import { resolveRulePack } from "../../multi-country-payroll/data/payroll-rule-pack.server"
import { PAYROLL_PERIOD_LOCK_SUBJECT_KIND } from "../schemas/payroll-period.schema"

import type {
  PayrollCloseApprovalSummary,
  PayrollCloseChecklistItem,
  PayrollCloseChecklistStatus,
  PayrollCloseException,
  PayrollCloseSnapshot,
  PayrollCloseTotals,
  PayrollPayslipPersistenceResult,
  PayrollPayslipSnapshot,
  PayrollPostingPreview,
} from "./payroll-close.shared"
import type {
  PayrollLineRow,
  PayrollPeriodRow,
  PayrollRunRow,
} from "./payroll.queries.server"

export type PayrollCloseSnapshotInput = {
  readonly organizationId: string
  readonly periodId: string
}

export type PayrollPayslipSnapshotInput = {
  readonly organizationId: string
  readonly runId: string
}

export type PersistPayrollPayslipSnapshotsInput = {
  readonly organizationId: string
  readonly actorUserId: string
  readonly snapshots: readonly PayrollPayslipSnapshot[]
}

function hashStablePayload(value: unknown): string {
  return createHash("sha256")
    .update(stablePayrollCloseStringify(value))
    .digest("hex")
}

function payrollPayslipBlobPath(
  organizationId: string,
  snapshot: PayrollPayslipSnapshot
): string {
  return [
    "orgs",
    organizationId,
    "hrm",
    snapshot.employeeId,
    "payroll",
    "payslips",
    snapshot.periodId,
    `${snapshot.runId}-${snapshot.inputHash}.json`,
  ].join("/")
}

function payrollPayslipDocumentPayload(
  snapshot: PayrollPayslipSnapshot
): Omit<PayrollPayslipSnapshot, "inputHash"> {
  return {
    runId: snapshot.runId,
    periodId: snapshot.periodId,
    employeeId: snapshot.employeeId,
    employeeNumber: snapshot.employeeNumber,
    employeeLegalName: snapshot.employeeLegalName,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    paymentDate: snapshot.paymentDate,
    currency: snapshot.currency,
    rulePackVersion: snapshot.rulePackVersion,
    grossPay: snapshot.grossPay,
    netPay: snapshot.netPay,
    employerCost: snapshot.employerCost,
    inputDigest: snapshot.inputDigest,
    lines: snapshot.lines,
    generatedAt: snapshot.generatedAt,
  }
}

function payrollPayslipTitle(snapshot: PayrollPayslipSnapshot): string {
  return `Payslip ${snapshot.periodStart} to ${snapshot.periodEnd} - ${snapshot.employeeNumber}`
}

async function getExistingPayslipDocument(input: {
  readonly organizationId: string
  readonly runId: string
}): Promise<{ readonly id: string; readonly payloadHash: string } | null> {
  const rows = await db
    .select({
      id: hrmDocument.id,
      payloadHash: hrmDocument.payloadHash,
    })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, input.organizationId),
        eq(hrmDocument.documentType, "payslip"),
        eq(hrmDocument.subjectKind, "payroll_run"),
        eq(hrmDocument.subjectId, input.runId)
      )
    )
    .orderBy(desc(hrmDocument.createdAt))
    .limit(1)

  return rows[0] ?? null
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null
  if (typeof value === "string") return value
  return value.toISOString()
}

function sumCents(values: readonly string[]): number {
  return values.reduce((sum, value) => sum + payrollDecimalToCents(value), 0)
}

function buildCloseTotals(
  runs: readonly PayrollRunRow[],
  lines: readonly PayrollLineRow[]
): PayrollCloseTotals {
  const employeeIds = new Set(runs.map((run) => run.employeeId))
  const employeeDeductions = lines
    .filter((line) => line.lineKind === "employee_deduction")
    .map((line) => line.amount)
  const taxDeductions = lines
    .filter((line) => line.lineKind === "tax")
    .map((line) => line.amount)
  const employerContributions = lines
    .filter((line) => line.lineKind === "employer_contribution")
    .map((line) => line.amount)
  const claimSettlements = lines
    .filter((line) => line.lineKind === "earning" && line.claimId)
    .map((line) => line.amount)
  const advanceSettlements = lines
    .filter(
      (line) =>
        line.lineKind === "employee_deduction" &&
        (line.salaryAdvanceId || line.code.includes("ADVANCE"))
    )
    .map((line) => line.amount)

  return {
    employeeCount: employeeIds.size,
    runCount: runs.length,
    grossPay: payrollCentsToDecimal(sumCents(runs.map((run) => run.grossPay))),
    netPay: payrollCentsToDecimal(sumCents(runs.map((run) => run.netPay))),
    employerCost: payrollCentsToDecimal(
      sumCents(runs.map((run) => run.employerCost))
    ),
    employeeDeductions: payrollCentsToDecimal(
      Math.abs(sumCents(employeeDeductions))
    ),
    employerContributions: payrollCentsToDecimal(
      Math.abs(sumCents(employerContributions))
    ),
    taxDeductions: payrollCentsToDecimal(Math.abs(sumCents(taxDeductions))),
    claimSettlements: payrollCentsToDecimal(
      Math.abs(sumCents(claimSettlements))
    ),
    advanceSettlements: payrollCentsToDecimal(
      Math.abs(sumCents(advanceSettlements))
    ),
  }
}

async function buildApprovalSummary(
  organizationId: string,
  periodId: string
): Promise<PayrollCloseApprovalSummary> {
  const [approvedRows, pendingApprovalId] = await Promise.all([
    db
      .select({
        id: hrmApproval.id,
        requestedByUserId: hrmApproval.requestedByUserId,
        decisionByUserId: hrmApproval.decisionByUserId,
        decisionAt: hrmApproval.decisionAt,
      })
      .from(hrmApproval)
      .where(
        and(
          eq(hrmApproval.organizationId, organizationId),
          eq(hrmApproval.subjectKind, PAYROLL_PERIOD_LOCK_SUBJECT_KIND),
          eq(hrmApproval.subjectId, periodId),
          eq(hrmApproval.state, "approved")
        )
      )
      .orderBy(desc(hrmApproval.decisionAt), desc(hrmApproval.createdAt))
      .limit(1),
    getPendingPayrollPeriodLockApprovalId(organizationId, periodId),
  ])

  const approved = approvedRows[0] ?? null
  const makerCheckerSatisfied = Boolean(
    approved?.decisionByUserId &&
    approved.requestedByUserId !== approved.decisionByUserId
  )

  return {
    hasApprovedLock: approved !== null,
    pendingApprovalId,
    approvedApprovalId: approved?.id ?? null,
    requestedByUserId: approved?.requestedByUserId ?? null,
    decisionByUserId: approved?.decisionByUserId ?? null,
    decisionAt: iso(approved?.decisionAt ?? null),
    makerCheckerSatisfied,
  }
}

function statusFromException(
  exceptions: readonly PayrollCloseException[],
  code: PayrollCloseException["code"],
  otherwise: PayrollCloseChecklistStatus = "passed"
): PayrollCloseChecklistStatus {
  return exceptions.some((exception) => exception.code === code)
    ? "blocked"
    : otherwise
}

function buildChecklist(params: {
  readonly period: PayrollPeriodRow
  readonly totals: PayrollCloseTotals
  readonly exceptions: readonly PayrollCloseException[]
  readonly evidenceCount: number
  readonly rulePackVersion: string | null
  readonly resolvedRulePackVersion: string | null
  readonly approvalSummary: PayrollCloseApprovalSummary
  readonly postingPreview: PayrollPostingPreview
}): PayrollCloseChecklistItem[] {
  const lockReadyState =
    params.period.state === "locked" ||
    params.period.state === "finalized" ||
    params.period.state === "posted"

  return [
    {
      id: "employees",
      label: "Employees and payroll runs",
      status: params.totals.runCount > 0 ? "passed" : "blocked",
      detail: `${params.totals.employeeCount} employees across ${params.totals.runCount} runs.`,
    },
    {
      id: "contracts",
      label: "Contract snapshots",
      status: statusFromException(params.exceptions, "missing_contract"),
      detail:
        statusFromException(params.exceptions, "missing_contract") === "passed"
          ? "Every run has a contract snapshot."
          : "One or more runs are missing contract snapshots.",
      blockerCode: "missing_contract",
    },
    {
      id: "profiles",
      label: "Payroll profile snapshots",
      status: statusFromException(params.exceptions, "missing_profile"),
      detail:
        statusFromException(params.exceptions, "missing_profile") === "passed"
          ? "Every run has a payroll profile snapshot."
          : "One or more runs are missing payroll profile snapshots.",
      blockerCode: "missing_profile",
    },
    {
      id: "attendance",
      label: "Attendance readiness",
      status: statusFromException(params.exceptions, "attendance_not_ready"),
      detail:
        statusFromException(params.exceptions, "attendance_not_ready") ===
        "passed"
          ? "Attendance rows in this period are payroll-ready."
          : "Attendance is still open or has payroll-blocking exceptions.",
      blockerCode: "attendance_not_ready",
    },
    {
      id: "settlements",
      label: "Claims and advances settlement",
      status: "passed",
      detail: `${params.totals.claimSettlements} claims and ${params.totals.advanceSettlements} advances represented in payroll lines.`,
    },
    {
      id: "rule-pack",
      label: "Rule-pack provenance",
      status: statusFromException(params.exceptions, "rule_pack_missing"),
      detail:
        (params.rulePackVersion ?? params.resolvedRulePackVersion)
          ? `Rule pack ${params.rulePackVersion ?? params.resolvedRulePackVersion} is available.`
          : "No rule pack is available for the period.",
      blockerCode: "rule_pack_missing",
    },
    {
      id: "validations",
      label: "Validation blockers",
      status: statusFromException(params.exceptions, "validation_issue"),
      detail:
        statusFromException(params.exceptions, "validation_issue") === "passed"
          ? "No payroll run validation blockers remain."
          : "One or more payroll runs have validation blockers.",
      blockerCode: "validation_issue",
    },
    {
      id: "approval",
      label: "Maker-checker approval",
      status: statusFromException(
        params.exceptions,
        "approval_missing",
        params.period.state === "open" ? "pending" : "passed"
      ),
      detail: params.approvalSummary.makerCheckerSatisfied
        ? "Lock certification was approved by a second user."
        : "Lock certification is pending second-user approval.",
      blockerCode: "approval_missing",
    },
    {
      id: "evidence",
      label: "Statutory evidence",
      status: statusFromException(
        params.exceptions,
        "evidence_missing",
        lockReadyState ? "passed" : "pending"
      ),
      detail:
        params.evidenceCount > 0
          ? `${params.evidenceCount} statutory evidence pack(s) linked.`
          : "No statutory evidence pack linked yet.",
      blockerCode: "evidence_missing",
    },
    {
      id: "posting",
      label: "Posting preview",
      status: params.postingPreview.isBalanced ? "passed" : "blocked",
      detail: params.postingPreview.isBalanced
        ? `Debits and credits balance at ${params.postingPreview.totalDebits}.`
        : `Posting preview imbalance is ${params.postingPreview.netBalance}.`,
      blockerCode: "posting_unbalanced",
    },
    {
      id: "payslips",
      label: "Payslip snapshots",
      status: lockReadyState ? "passed" : "pending",
      detail: lockReadyState
        ? "Locked payroll runs can produce immutable payslip snapshots."
        : "Payslip snapshots are generated only after payroll lock.",
    },
  ]
}

function buildPostingPreviewForLoadedPeriod(input: {
  readonly period: PayrollPeriodRow
  readonly runs: readonly PayrollRunRow[]
  readonly lines: readonly PayrollLineRow[]
}): PayrollPostingPreview {
  const inputHash = hashStablePayload({
    periodId: input.period.id,
    currency: input.period.currency,
    runs: input.runs.map((run) => ({ id: run.id, netPay: run.netPay })),
    lines: input.lines,
  })

  return buildPayrollPostingPreviewFromInputs({
    periodId: input.period.id,
    currency: input.period.currency,
    runs: input.runs,
    lines: input.lines,
    inputHash,
  })
}

export async function buildPayrollPostingPreview(
  input: PayrollCloseSnapshotInput
): Promise<PayrollPostingPreview | null> {
  const period = await getPayrollPeriod(input.organizationId, input.periodId)
  if (!period) return null

  const runs = await listPayrollRunsForPeriod(
    input.organizationId,
    input.periodId
  )
  const lines = await listPayrollLinesForPeriod(
    input.organizationId,
    input.periodId
  )

  return buildPostingPreviewForLoadedPeriod({
    period,
    runs,
    lines,
  })
}

export async function buildPayrollCloseSnapshot(
  input: PayrollCloseSnapshotInput
): Promise<PayrollCloseSnapshot | null> {
  const period = await getPayrollPeriod(input.organizationId, input.periodId)
  if (!period) return null

  const runs = await listPayrollRunsForPeriod(
    input.organizationId,
    input.periodId
  )
  const lines = await listPayrollLinesForPeriod(
    input.organizationId,
    input.periodId
  )

  const [attendanceReady, approvalSummary, evidenceRows, primaryCountryCode] =
    await Promise.all([
      isAttendancePayrollReadyForPeriod({
        organizationId: input.organizationId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      }),
      buildApprovalSummary(input.organizationId, input.periodId),
      listComplianceEvidenceForPeriod(input.organizationId, input.periodId),
      getPayrollPeriodPrimaryCountryCode(input.organizationId, input.periodId),
    ])

  let resolvedRulePackVersion: string | null = null
  try {
    resolvedRulePackVersion = resolveRulePack(
      primaryCountryCode,
      new Date(`${period.periodEnd}T00:00:00.000Z`)
    ).version
  } catch {
    resolvedRulePackVersion = null
  }

  const postingPreview = buildPostingPreviewForLoadedPeriod({
    period,
    runs,
    lines,
  })

  const evidenceManifest = evidenceRows.map((row) => ({
    evidenceId: row.id,
    countryCode: row.countryCode,
    packType: row.packType,
    submissionState: row.submissionState,
    rulePackVersion: row.rulePackVersion,
    inputHash: row.inputHash,
    outputHash: row.outputHash,
    externalReference: row.externalReference,
    generatedAt: row.generatedAt.toISOString(),
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
  }))

  const rulePackAvailable = Boolean(
    resolvedRulePackVersion &&
    (period.state === "open" ||
      period.state === "preparing" ||
      period.rulePackVersion)
  )

  const exceptions = classifyPayrollCloseExceptions({
    periodState: period.state,
    attendanceReady,
    rulePackAvailable,
    evidenceCount: evidenceManifest.length,
    approvalSummary,
    postingPreview,
    runs,
  })
  const totals = buildCloseTotals(runs, lines)
  const checklist = buildChecklist({
    period,
    totals,
    exceptions,
    evidenceCount: evidenceManifest.length,
    rulePackVersion: period.rulePackVersion,
    resolvedRulePackVersion,
    approvalSummary,
    postingPreview,
  })

  const inputHash = hashStablePayload({
    period: {
      id: period.id,
      state: period.state,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      paymentDate: period.paymentDate,
      currency: period.currency,
      rulePackVersion: period.rulePackVersion,
      lockedAt: iso(period.lockedAt),
      lockedByUserId: period.lockedByUserId,
      postedAt: iso(period.postedAt),
      postedByUserId: period.postedByUserId,
      postedJournalBatchId: period.postedJournalBatchId,
    },
    runs,
    lines,
    attendanceReady,
    primaryCountryCode,
    resolvedRulePackVersion,
    evidenceManifest,
    approvalSummary,
    postingPreview,
  })

  return {
    periodId: period.id,
    periodState: period.state,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    paymentDate: period.paymentDate,
    currency: period.currency,
    readinessScore: computePayrollCloseReadinessScore(checklist),
    primaryCountryCode,
    rulePackVersion: period.rulePackVersion,
    resolvedRulePackVersion,
    checklist,
    totals,
    exceptions,
    evidenceManifest,
    approvalSummary,
    postingPreview,
    inputHash,
    generatedAt: new Date().toISOString(),
  }
}

export async function listPayrollCloseExceptions(
  input: PayrollCloseSnapshotInput
): Promise<PayrollCloseException[]> {
  return [...((await buildPayrollCloseSnapshot(input))?.exceptions ?? [])]
}

export async function buildPayslipSnapshotForRun(
  input: PayrollPayslipSnapshotInput
): Promise<PayrollPayslipSnapshot | null> {
  const rows = await db
    .select({
      runId: hrmPayrollRun.id,
      periodId: hrmPayrollRun.periodId,
      employeeId: hrmPayrollRun.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeLegalName: hrmEmployee.legalName,
      runState: hrmPayrollRun.state,
      grossPay: hrmPayrollRun.grossPay,
      netPay: hrmPayrollRun.netPay,
      employerCost: hrmPayrollRun.employerCost,
      inputDigest: hrmPayrollRun.inputDigest,
      periodStart: hrmPayrollPeriod.periodStart,
      periodEnd: hrmPayrollPeriod.periodEnd,
      paymentDate: hrmPayrollPeriod.paymentDate,
      currency: hrmPayrollPeriod.currency,
      periodState: hrmPayrollPeriod.state,
      lockedAt: hrmPayrollPeriod.lockedAt,
      rulePackVersion: hrmPayrollPeriod.rulePackVersion,
    })
    .from(hrmPayrollRun)
    .innerJoin(hrmEmployee, eq(hrmPayrollRun.employeeId, hrmEmployee.id))
    .innerJoin(
      hrmPayrollPeriod,
      eq(hrmPayrollRun.periodId, hrmPayrollPeriod.id)
    )
    .where(
      and(
        eq(hrmPayrollRun.organizationId, input.organizationId),
        eq(hrmPayrollRun.id, input.runId)
      )
    )
    .limit(1)

  const row = rows[0]
  if (!row) return null
  if (row.runState !== "locked") {
    throw new Error("Payslip snapshots require a locked payroll run.")
  }
  if (!row.lockedAt) {
    throw new Error("Locked payslip snapshot requires period lock timestamp.")
  }

  const lines = await listPayrollLinesForRun(input.organizationId, input.runId)
  const generatedAt = row.lockedAt.toISOString()
  const snapshotPayload = {
    runId: row.runId,
    periodId: row.periodId,
    employeeId: row.employeeId,
    employeeNumber: row.employeeNumber,
    employeeLegalName: row.employeeLegalName,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    paymentDate: row.paymentDate,
    currency: row.currency,
    rulePackVersion: row.rulePackVersion,
    grossPay: row.grossPay,
    netPay: row.netPay,
    employerCost: row.employerCost,
    inputDigest: row.inputDigest,
    lines: lines.map((line) => ({
      lineKind: line.lineKind,
      code: line.code,
      description: line.description,
      amount: line.amount,
      rulePackProvenance: line.rulePackProvenance,
    })),
    generatedAt,
  }

  return {
    ...snapshotPayload,
    inputHash: hashStablePayload(snapshotPayload),
  }
}

export async function persistPayrollPayslipSnapshots(
  input: PersistPayrollPayslipSnapshotsInput
): Promise<PayrollPayslipPersistenceResult> {
  let createdCount = 0
  let existingCount = 0
  const documentIds: string[] = []

  for (const snapshot of input.snapshots) {
    const expectedHash = hashStablePayload(
      payrollPayslipDocumentPayload(snapshot)
    )
    if (expectedHash !== snapshot.inputHash) {
      throw new Error("payslip_snapshot_hash_invalid")
    }

    const existing = await getExistingPayslipDocument({
      organizationId: input.organizationId,
      runId: snapshot.runId,
    })
    if (existing) {
      if (existing.payloadHash !== snapshot.inputHash) {
        throw new Error("payslip_snapshot_hash_mismatch")
      }
      existingCount += 1
      documentIds.push(existing.id)
      continue
    }

    const payload = stablePayrollCloseStringify(
      payrollPayslipDocumentPayload(snapshot)
    )
    const blob = await put(
      payrollPayslipBlobPath(input.organizationId, snapshot),
      payload,
      {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      }
    )

    const documentId = crypto.randomUUID()
    const inserted = await db
      .insert(hrmDocument)
      .values({
        id: documentId,
        organizationId: input.organizationId,
        documentSetId: documentId,
        employeeId: snapshot.employeeId,
        documentType: "payslip",
        documentGroup: "payroll",
        subjectKind: "payroll_run",
        subjectId: snapshot.runId,
        title: payrollPayslipTitle(snapshot),
        blobUrl: blob.url,
        payloadHash: snapshot.inputHash,
        mimeType: "application/json",
        sizeBytes: new TextEncoder().encode(payload).byteLength,
        classification: "confidential",
        retentionPolicyCode: "payroll_payslip",
        documentLifecycleStatus: "active",
        isLatestVersion: true,
        versionNumber: 1,
        effectiveFrom: new Date(`${snapshot.periodEnd}T00:00:00.000Z`),
        uploadedByUserId: input.actorUserId,
      })
      .returning({ id: hrmDocument.id })

    const insertedDocumentId = inserted[0]?.id
    if (!insertedDocumentId) {
      throw new Error("payslip_snapshot_document_insert_failed")
    }

    createdCount += 1
    documentIds.push(insertedDocumentId)
  }

  return {
    createdCount,
    existingCount,
    documentIds,
  }
}
