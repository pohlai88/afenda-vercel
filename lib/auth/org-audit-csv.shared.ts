/**
 * Org IAM audit CSV row formatting (no DB). Used by export UI, streaming route,
 * and verification tests — keep deterministic for coverage thresholds.
 */

export const ORG_AUDIT_CSV_HEADER_COLUMNS = [
  "id",
  "created_at_utc",
  "action",
  "actor_user_id",
  "actor_email",
  "resource_type",
  "resource_id",
  "path",
  "metadata",
  "ip_address",
  "user_agent",
] as const

export type OrganizationIamAuditExportRow = {
  id: string
  createdAt: Date
  action: string
  actorUserId: string | null
  actorEmail: string | null
  resourceType: string | null
  resourceId: string | null
  path: string | null
  metadata: string | null
  ipAddress: string | null
  userAgent: string | null
}

/** RFC 4180-style CSV cell escaping for exports. */
export function escapeCsvCell(value: string | null | undefined): string {
  const s = value ?? ""
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function formatOrganizationIamAuditCsvDataRow(
  row: OrganizationIamAuditExportRow
): string {
  return [
    escapeCsvCell(row.id),
    escapeCsvCell(row.createdAt.toISOString()),
    escapeCsvCell(row.action),
    escapeCsvCell(row.actorUserId),
    escapeCsvCell(row.actorEmail),
    escapeCsvCell(row.resourceType),
    escapeCsvCell(row.resourceId),
    escapeCsvCell(row.path),
    escapeCsvCell(row.metadata),
    escapeCsvCell(row.ipAddress),
    escapeCsvCell(row.userAgent),
  ].join(",")
}

/** First RFC 4180 CSV field on a single line (supports quoted cells). */
export function parseCsvFirstField(line: string): string {
  const s = line.trimEnd()
  if (s.startsWith('"')) {
    let out = ""
    let i = 1
    while (i < s.length) {
      if (s[i] === '"') {
        if (s[i + 1] === '"') {
          out += '"'
          i += 2
          continue
        }
        break
      }
      out += s[i]!
      i++
    }
    return out
  }
  const comma = s.indexOf(",")
  return comma === -1 ? s : s.slice(0, comma)
}
