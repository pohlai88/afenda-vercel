import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { parseCsvFirstField } from "./org-audit-csv.shared"

/** HMAC-SHA256 hex for streamed export footers (tamper-evident bounds). */
export function computeOrganizationIamAuditExportSignature(input: {
  organizationId: string
  rowCount: number
  firstRowId: string
  lastRowId: string
  secret: string
}): string {
  return createHmac("sha256", input.secret)
    .update(
      `${input.organizationId}|${input.rowCount}|${input.firstRowId}|${input.lastRowId}`
    )
    .digest("hex")
}

export type OrganizationIamAuditCsvVerification =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * Verifies footer HMAC on a streamed org audit CSV from
 * {@link organizationIamAuditExportReadableStream}. Use the same
 * `organizationId` and secret as export (`ORG_AUDIT_EXPORT_HMAC_SECRET` or
 * `BETTER_AUTH_SECRET`).
 */
export function verifyOrganizationIamAuditExportCsv(
  csvText: string,
  organizationId: string,
  secret: string
): OrganizationIamAuditCsvVerification {
  const stripped = csvText.replace(/^\uFEFF/, "")
  const lines = stripped.split(/\r?\n/)
  while (lines.length && lines[lines.length - 1] === "") {
    lines.pop()
  }

  const footers: string[] = []
  while (
    lines.length &&
    lines[lines.length - 1]!.startsWith("#afenda_audit_footer_v1")
  ) {
    footers.unshift(lines.pop()!)
  }

  if (lines.length === 0) {
    return { ok: false, reason: "missing_header" }
  }

  const header = lines[0]!
  if (!header.includes("id") || !header.includes("created_at")) {
    return { ok: false, reason: "invalid_header" }
  }

  const dataLines = lines.slice(1)
  const rowCountLine = footers.find((l) => l.includes("#row_count,"))
  const sigLine = footers.find((l) => l.includes("#signature_sha256,"))

  const rowCountMatch = rowCountLine?.match(/#row_count,(\d+)/)
  if (!rowCountMatch) {
    return { ok: false, reason: "missing_row_count_footer" }
  }
  const rowCount = Number(rowCountMatch[1])

  if (rowCount !== dataLines.length) {
    return {
      ok: false,
      reason: `row_count_mismatch:footer=${rowCount},rows=${dataLines.length}`,
    }
  }

  if (rowCount === 0) {
    if (sigLine) {
      return { ok: false, reason: "unexpected_signature_when_empty" }
    }
    return { ok: true }
  }

  if (!sigLine) {
    return { ok: false, reason: "missing_signature_footer" }
  }

  const sigMatch = sigLine.match(/#signature_sha256,([a-f0-9]{64})/)
  if (!sigMatch) {
    return { ok: false, reason: "malformed_signature_footer" }
  }
  const embeddedSig = sigMatch[1]!

  const firstRowId = parseCsvFirstField(dataLines[0]!)
  const lastRowId = parseCsvFirstField(dataLines[dataLines.length - 1]!)

  const expected = computeOrganizationIamAuditExportSignature({
    organizationId,
    rowCount,
    firstRowId,
    lastRowId,
    secret,
  })

  try {
    const a = Buffer.from(embeddedSig, "hex")
    const b = Buffer.from(expected, "hex")
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "signature_mismatch" }
    }
  } catch {
    return { ok: false, reason: "signature_mismatch" }
  }

  return { ok: true }
}
