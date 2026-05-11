import type { NextRequest } from "next/server"

import {
  canActInOrganization,
  writeIamAuditEventFromHeaders,
} from "#lib/auth"
import { buildErpAuditAction } from "#lib/erp/crud-sap.shared"
import {
  routeJsonError,
  ROUTE_JSON_HEADERS,
} from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

import {
  buildStatutoryPackFromRuns,
  fetchRunsForStatutoryPack,
  getComplianceEvidence,
  getPayrollPeriod,
  resolveRulePack,
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

export const dynamic = "force-dynamic"

/**
 * Deterministic statutory-evidence JSON export.
 *
 * Re-derives the canonical pack on demand from the locked period's runs and
 * the rule-pack pinned at evidence-generation time, then verifies both
 * `inputHash` and `outputHash` match the stored evidence row before serving
 * the payload. Mismatch returns 409 so HR knows the underlying runs drifted
 * and must be re-prepared / re-locked / re-generated.
 *
 * Authenticated org admins only. Audits as `erp.hrm.compliance_pack.export`.
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
    rulePack = resolveRulePack(
      evidence.countryCode,
      new Date(period.periodEnd)
    )
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

  const { payload, inputHash, outputHash } = buildStatutoryPackFromRuns(
    rulePack,
    evidence.packType,
    runs
  )

  if (
    inputHash !== evidence.inputHash ||
    outputHash !== evidence.outputHash
  ) {
    return routeJsonError(
      "Underlying payroll data changed since evidence was generated. Regenerate evidence before exporting.",
      409,
      { code: "evidence_drift" }
    )
  }

  await writeIamAuditEventFromHeaders(request.headers, {
    action: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance_pack",
      verb: "export",
    }),
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
      format: "json",
    },
  })

  const filename = `hrm-${evidence.packType}-${evidence.countryCode}-${period.periodStart}.json`

  return new Response(
    JSON.stringify(
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
    ),
    {
      status: 200,
      headers: {
        ...ROUTE_JSON_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    }
  )
}
