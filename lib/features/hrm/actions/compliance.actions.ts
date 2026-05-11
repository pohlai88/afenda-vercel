"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  fetchRunsForStatutoryPack,
  listComplianceEvidenceForPeriod,
} from "../data/compliance.queries.server"
import {
  upsertComplianceEvidenceMutation,
  updateComplianceSubmissionStateMutation,
} from "../data/compliance.mutations.server"
import { buildStatutoryPackFromRuns } from "../data/statutory-pack.server"
import { getPayrollPeriod } from "../data/payroll.queries.server"
import { resolveRulePack } from "../data/payroll-rule-pack.server"
import type { StatutoryPackType } from "../data/payroll-rule-pack.server"
import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import type {
  GenerateAllStatutoryPacksFormState,
  GenerateStatutoryPackFormState,
  MarkEvidenceSubmittedFormState,
} from "../types"

// ---------------------------------------------------------------------------
// Revalidation helper
// ---------------------------------------------------------------------------

function revalidateCompliancePages(): void {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/compliance"),
    "page"
  )
}

// ---------------------------------------------------------------------------
// Generate statutory pack for one period + packType
// ---------------------------------------------------------------------------

export async function generateStatutoryPackAction(
  _prev: GenerateStatutoryPackFormState,
  formData: FormData
): Promise<GenerateStatutoryPackFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) {
    return { ok: false, code: "permission_denied", message: gate.error }
  }
  const { organizationId, userId, sessionId } = gate.session

  const periodId = formData.get("periodId")?.toString()
  const packType = formData.get("packType")?.toString() as
    | StatutoryPackType
    | undefined

  if (!periodId) {
    return { ok: false, code: "validation", message: "periodId is required." }
  }
  if (!packType) {
    return { ok: false, code: "validation", message: "packType is required." }
  }

  const period = await getPayrollPeriod(organizationId, periodId)
  if (!period) {
    return {
      ok: false,
      code: "not_found",
      message: "Payroll period not found.",
    }
  }
  if (period.state !== "locked") {
    return {
      ok: false,
      code: "period_not_locked",
      message:
        "Lock the payroll period before generating statutory evidence — only locked rule-pack snapshots are audit-trustworthy.",
    }
  }

  const periodEndDate = new Date(period.periodEnd)
  const countryCode = "MY"

  let rulePack
  try {
    rulePack = resolveRulePack(countryCode, periodEndDate)
  } catch {
    return {
      ok: false,
      code: "rule_pack_missing",
      message: `No rule pack for ${countryCode} at ${period.periodEnd}.`,
    }
  }

  const runs = await fetchRunsForStatutoryPack(organizationId, periodId)
  if (runs.length === 0) {
    return {
      ok: false,
      code: "no_runs",
      message:
        "No payroll runs found for this period. Prepare payroll runs first.",
    }
  }

  const { payload, inputHash, outputHash } = buildStatutoryPackFromRuns(
    rulePack,
    packType,
    runs
  )

  const { id: evidenceId, isNew } = await upsertComplianceEvidenceMutation({
    organizationId,
    periodId,
    countryCode,
    packType,
    inputHash,
    outputHash,
    rulePackVersion: rulePack.version,
    generatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "compliance_pack",
        verb: "create",
      }),
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm.compliance_evidence",
      resourceId: evidenceId,
      metadata: {
        packType,
        periodId,
        rulePackVersion: rulePack.version,
        inputHash,
        outputHash,
        isNew,
      },
    })
  )
  revalidateCompliancePages()

  return { ok: true, bulk: false, evidenceId, packType, inputHash, payload }
}

// ---------------------------------------------------------------------------
// Generate all standard packs for a period (convenience bulk action)
// ---------------------------------------------------------------------------

export async function generateAllStatutoryPacksAction(
  _prev: GenerateAllStatutoryPacksFormState,
  formData: FormData
): Promise<GenerateAllStatutoryPacksFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) {
    return { ok: false, code: "permission_denied", message: gate.error }
  }
  const { organizationId, userId, sessionId } = gate.session

  const periodId = formData.get("periodId")?.toString()
  if (!periodId) {
    return { ok: false, code: "validation", message: "periodId is required." }
  }

  const period = await getPayrollPeriod(organizationId, periodId)
  if (!period) {
    return {
      ok: false,
      code: "not_found",
      message: "Payroll period not found.",
    }
  }
  if (period.state !== "locked") {
    return {
      ok: false,
      code: "period_not_locked",
      message:
        "Lock the payroll period before generating statutory evidence — only locked rule-pack snapshots are audit-trustworthy.",
    }
  }

  const periodEndDate = new Date(period.periodEnd)
  const countryCode = "MY"

  let rulePack
  try {
    rulePack = resolveRulePack(countryCode, periodEndDate)
  } catch {
    return {
      ok: false,
      code: "rule_pack_missing",
      message: `No rule pack for ${countryCode} at ${period.periodEnd}.`,
    }
  }

  const packTypes = rulePack.defaultStatutoryPackTypes()
  const runs = await fetchRunsForStatutoryPack(organizationId, periodId)

  if (runs.length === 0) {
    return {
      ok: false,
      code: "no_runs",
      message: "No payroll runs found for this period.",
    }
  }

  const evidenceIds: string[] = []
  for (const packType of packTypes) {
    const { inputHash, outputHash } = buildStatutoryPackFromRuns(
      rulePack,
      packType,
      runs
    )
    const { id } = await upsertComplianceEvidenceMutation({
      organizationId,
      periodId,
      countryCode,
      packType,
      inputHash,
      outputHash,
      rulePackVersion: rulePack.version,
      generatedByUserId: userId,
    })
    evidenceIds.push(id)
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "compliance_pack",
        verb: "create",
      }),
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm.compliance_period",
      resourceId: periodId,
      metadata: {
        periodId,
        rulePackVersion: rulePack.version,
        packsGenerated: evidenceIds.length,
        evidenceIds,
      },
    })
  )
  revalidateCompliancePages()

  return {
    ok: true,
    bulk: true,
    count: evidenceIds.length,
    evidenceIds,
    rulePackVersion: rulePack.version,
  }
}

// ---------------------------------------------------------------------------
// Mark evidence as submitted (HR manually confirms bureau submission)
// ---------------------------------------------------------------------------

export async function markEvidenceSubmittedAction(
  _prev: MarkEvidenceSubmittedFormState,
  formData: FormData
): Promise<MarkEvidenceSubmittedFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) {
    return { ok: false, code: "permission_denied", message: gate.error }
  }
  const { organizationId, userId, sessionId } = gate.session

  const evidenceId = formData.get("evidenceId")?.toString()
  const externalReference = formData.get("externalReference")?.toString()

  if (!evidenceId) {
    return { ok: false, code: "validation", message: "evidenceId is required." }
  }

  await updateComplianceSubmissionStateMutation(
    organizationId,
    evidenceId,
    "submitted",
    { externalReference, updatedByUserId: userId }
  )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "compliance_pack",
        verb: "update",
      }),
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm.compliance_evidence",
      resourceId: evidenceId,
      metadata: { submissionState: "submitted", externalReference },
    })
  )
  revalidateCompliancePages()

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Read compliance evidence for a period (used by RSC)
// ---------------------------------------------------------------------------

export { listComplianceEvidenceForPeriod }
