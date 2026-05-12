import type { NextRequest } from "next/server"

import { canActInOrganization, writeIamAuditEventFromHeaders } from "#lib/auth"
import {
  routeJsonError,
  ROUTE_JSON_HEADERS,
} from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

import {
  buildStatutoryPackFromRuns,
  computeStatutoryPackResponseHash,
  fetchRunsForStatutoryPack,
  formatStatutoryPackHashHeader,
  getComplianceEvidence,
  getPayrollPeriod,
  resolveRulePack,
  serializeStatutoryPackToCsv,
  STATUTORY_PACK_EXPORT_AUDIT_ACTION,
  STATUTORY_PACK_HASH_HEADER,
  statutoryPackFilename,
} from "#features/hrm/server"

const STATUTORY_PACK_TYPES = [
  "epf_monthly",
  "socso_monthly",
  "eis_monthly",
  "pcb_monthly",
  "ea_annual",
  "borang_e_annual",
] as const

type StatutoryPackType = (typeof STATUTORY_PACK_TYPES)[number]

function isStatutoryPackType(value: string): value is StatutoryPackType {
  return (STATUTORY_PACK_TYPES as readonly string[]).includes(value)
}

const STATUTORY_PACK_EXPORT_FORMATS = ["json", "csv"] as const
type StatutoryPackExportFormat = (typeof STATUTORY_PACK_EXPORT_FORMATS)[number]

function isStatutoryPackExportFormat(
  value: string
): value is StatutoryPackExportFormat {
  return (STATUTORY_PACK_EXPORT_FORMATS as readonly string[]).includes(value)
}

export const dynamic = "force-dynamic"

/**
 * Phase 3R — Deterministic statutory-evidence export (JSON or CSV) with a
 * tamper-evident response hash anchor.
 *
 * Re-derives the canonical pack on demand from the locked period's runs and
 * the rule-pack pinned at evidence-generation time, then verifies both
 * `inputHash` and `outputHash` match the stored evidence row before serving
 * the payload. Mismatch returns 409 so HR knows the underlying runs drifted
 * and must be re-prepared / re-locked / re-generated.
 *
 * Format selection — `?format=json` (default, back-compat) or `?format=csv`
 * for an operator-friendly CSV (one row per employee per pack line, RFC 4180
 * compliant). The CSV is **not** a bureau-spec submission file — bureau-spec
 * exporters (KWSP/PERKESO/LHDN) ship per-rule-pack later.
 *
 * Tamper-evident anchor — every successful response carries
 * `X-Afenda-Pack-Hash: sha256=<hex>` containing the SHA-256 of the response
 * body bytes. An offline reviewer can re-hash the downloaded file and
 * compare against the audited `responseHash` (also written to
 * `iam_audit_event.metadata`) to prove the file was not modified in transit.
 *
 * Authenticated org admins only. Audits as `erp.hrm.compliance_pack.export`
 * with `metadata.format` and `metadata.responseHash`.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ evidenceId: string }> }
): Promise<Response> {
  const session = await getOrgSessionFromRequest(request)
  if (!session) {
    return routeJsonError("Unauthorized", 401)
  }

  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return routeJsonError("Forbidden", 403)
  }

  const formatRaw = request.nextUrl.searchParams.get("format") ?? "json"
  if (!isStatutoryPackExportFormat(formatRaw)) {
    return routeJsonError(
      `Unsupported format: ${formatRaw}. Use json or csv.`,
      400,
      { code: "validation" }
    )
  }
  const format: StatutoryPackExportFormat = formatRaw

  const { evidenceId } = await context.params

  const evidence = await getComplianceEvidence(
    session.organizationId,
    evidenceId
  )
  if (!evidence) {
    return routeJsonError("Evidence not found", 404, { code: "not_found" })
  }
  if (!evidence.periodId) {
    return routeJsonError("Evidence is not bound to a payroll period", 400, {
      code: "validation",
    })
  }
  if (!isStatutoryPackType(evidence.packType)) {
    return routeJsonError(`Unsupported pack type: ${evidence.packType}`, 400, {
      code: "validation",
    })
  }

  const period = await getPayrollPeriod(
    session.organizationId,
    evidence.periodId
  )
  if (!period) {
    return routeJsonError("Payroll period not found for evidence", 404, {
      code: "not_found",
    })
  }

  let rulePack
  try {
    rulePack = resolveRulePack(evidence.countryCode, new Date(period.periodEnd))
  } catch {
    return routeJsonError(
      `No rule pack registered for ${evidence.countryCode} at ${period.periodEnd}.`,
      409,
      { code: "rule_pack_missing" }
    )
  }

  if (rulePack.version !== evidence.rulePackVersion) {
    return routeJsonError(
      "Rule-pack version drift since evidence was generated. Regenerate evidence.",
      409,
      { code: "rule_pack_drift" }
    )
  }

  const runs = await fetchRunsForStatutoryPack(
    session.organizationId,
    evidence.periodId
  )
  if (runs.length === 0) {
    return routeJsonError("No payroll runs available for this period.", 409, {
      code: "no_runs",
    })
  }

  // Phase 3S — replay the original generation instant so EA / Borang E
  // (both of which embed `generatedAt` in the hashed body) re-derive
  // byte-identically. Without this the rebuilt `outputHash` never matches
  // the stored one and every annual-pack export 409s with `evidence_drift`.
  const { payload, inputHash, outputHash } = buildStatutoryPackFromRuns(
    rulePack,
    evidence.packType,
    runs,
    { now: evidence.generatedAt }
  )

  if (inputHash !== evidence.inputHash || outputHash !== evidence.outputHash) {
    return routeJsonError(
      "Underlying payroll data changed since evidence was generated. Regenerate evidence before exporting.",
      409,
      { code: "evidence_drift" }
    )
  }

  const filename = statutoryPackFilename({
    packType: evidence.packType,
    countryCode: evidence.countryCode,
    periodStart: period.periodStart,
    format,
  })

  let body: string
  let contentType: string
  if (format === "csv") {
    body = serializeStatutoryPackToCsv(payload).csv
    contentType = "text/csv; charset=utf-8"
  } else {
    body = JSON.stringify(
      {
        evidenceId: evidence.id,
        organizationId: evidence.organizationId,
        countryCode: evidence.countryCode,
        packType: evidence.packType,
        rulePackVersion: evidence.rulePackVersion,
        period: {
          id: period.id,
          start: period.periodStart,
          end: period.periodEnd,
          paymentDate: period.paymentDate,
        },
        provenance: {
          inputHash: evidence.inputHash,
          outputHash: evidence.outputHash,
          generatedAt: evidence.generatedAt.toISOString(),
        },
        payload,
      },
      null,
      2
    )
    contentType = "application/json; charset=utf-8"
  }

  const responseHash = computeStatutoryPackResponseHash(body)

  // Phase 3T — write the canonical export audit string sourced from the
  // shared `compliance-timeline.shared.ts` constant. The same string is
  // what the timeline composer fetches via `inArray(action, ...)`, so
  // there is exactly ONE place to bump if the audit grammar ever evolves.
  await writeIamAuditEventFromHeaders(request.headers, {
    action: STATUTORY_PACK_EXPORT_AUDIT_ACTION,
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "hrm.compliance_evidence",
    resourceId: evidence.id,
    metadata: {
      packType: evidence.packType,
      periodId: evidence.periodId,
      rulePackVersion: evidence.rulePackVersion,
      inputHash,
      outputHash,
      format,
      responseHash,
    },
  })

  return new Response(body, {
    status: 200,
    headers: {
      ...ROUTE_JSON_HEADERS,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      [STATUTORY_PACK_HASH_HEADER]: formatStatutoryPackHashHeader(responseHash),
    },
  })
}
