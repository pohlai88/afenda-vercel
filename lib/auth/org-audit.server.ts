import "server-only"

import { and, count, desc, eq, like } from "drizzle-orm"

import { db } from "#lib/db"
import { iamAuditEvent, user } from "#lib/db/schema"

import { computeOrganizationIamAuditExportSignature } from "./org-audit-export-verify.server"
import {
  ORG_AUDIT_CSV_HEADER_COLUMNS,
  type OrganizationIamAuditExportRow,
  formatOrganizationIamAuditCsvDataRow,
} from "./org-audit-csv.shared"

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
/** Hard cap for CSV export rows (memory / abuse). */
export const ORG_AUDIT_EXPORT_MAX_ROWS = 10_000

/** Streaming GET export batches up to this many rows (bounded memory). */
export const ORG_AUDIT_STREAM_MAX_ROWS = 50_000

const ORG_AUDIT_STREAM_BATCH = 500

export type OrganizationIamAuditRow = {
  id: string
  createdAt: Date
  action: string
  actorUserId: string | null
  actorEmail: string | null
  resourceType: string | null
  resourceId: string | null
  path: string | null
  /** Truncated JSON for display (no secrets — writers should keep metadata minimal). */
  metadataSummary: string | null
}

function truncateMetadata(raw: string | null, max = 200): string | null {
  if (raw == null || raw.length === 0) return null
  if (raw.length <= max) return raw
  return `${raw.slice(0, max)}…`
}

/**
 * Organization-scoped IAM events with action prefix `org.*` (see AGENTS.md).
 * Read path for org admins only — call after `canActInOrganization(..., "admin")`.
 */
export async function listOrganizationIamAuditEvents(input: {
  organizationId: string
  page: number
  pageSize?: number
}): Promise<{
  rows: OrganizationIamAuditRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}> {
  const pageSize = Math.min(
    Math.max(input.pageSize ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  )
  const page = Math.max(1, Math.floor(input.page))
  const offset = (page - 1) * pageSize

  const orgScope = eq(iamAuditEvent.organizationId, input.organizationId)
  const orgActions = like(iamAuditEvent.action, "org.%")

  const whereClause = and(orgScope, orgActions)

  const [countRow] = await db
    .select({ total: count() })
    .from(iamAuditEvent)
    .where(whereClause)

  const total = Number(countRow?.total ?? 0)
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)

  const rows = await db
    .select({
      id: iamAuditEvent.id,
      createdAt: iamAuditEvent.createdAt,
      action: iamAuditEvent.action,
      actorUserId: iamAuditEvent.actorUserId,
      actorEmail: user.email,
      resourceType: iamAuditEvent.resourceType,
      resourceId: iamAuditEvent.resourceId,
      path: iamAuditEvent.path,
      metadata: iamAuditEvent.metadata,
    })
    .from(iamAuditEvent)
    .leftJoin(user, eq(iamAuditEvent.actorUserId, user.id))
    .where(whereClause)
    .orderBy(desc(iamAuditEvent.createdAt))
    .limit(pageSize)
    .offset(offset)

  return {
    page,
    pageSize,
    total,
    totalPages,
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      action: r.action,
      actorUserId: r.actorUserId,
      actorEmail: r.actorEmail,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      path: r.path,
      metadataSummary: truncateMetadata(r.metadata),
    })),
  }
}

/**
 * Full rows for CSV export (same filter as list view). Cap at
 * {@link ORG_AUDIT_EXPORT_MAX_ROWS}.
 */
export async function listOrganizationIamAuditEventsForExport(input: {
  organizationId: string
  maxRows?: number
}): Promise<OrganizationIamAuditExportRow[]> {
  const cap = Math.min(
    Math.max(input.maxRows ?? ORG_AUDIT_EXPORT_MAX_ROWS, 1),
    ORG_AUDIT_EXPORT_MAX_ROWS
  )

  const orgScope = eq(iamAuditEvent.organizationId, input.organizationId)
  const orgActions = like(iamAuditEvent.action, "org.%")
  const whereClause = and(orgScope, orgActions)

  const rows = await db
    .select({
      id: iamAuditEvent.id,
      createdAt: iamAuditEvent.createdAt,
      action: iamAuditEvent.action,
      actorUserId: iamAuditEvent.actorUserId,
      actorEmail: user.email,
      resourceType: iamAuditEvent.resourceType,
      resourceId: iamAuditEvent.resourceId,
      path: iamAuditEvent.path,
      metadata: iamAuditEvent.metadata,
      ipAddress: iamAuditEvent.ipAddress,
      userAgent: iamAuditEvent.userAgent,
    })
    .from(iamAuditEvent)
    .leftJoin(user, eq(iamAuditEvent.actorUserId, user.id))
    .where(whereClause)
    .orderBy(desc(iamAuditEvent.createdAt))
    .limit(cap)

  return rows.map(mapExportRow)
}

function mapExportRow(r: {
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
}): OrganizationIamAuditExportRow {
  return {
    id: r.id,
    createdAt: r.createdAt,
    action: r.action,
    actorUserId: r.actorUserId,
    actorEmail: r.actorEmail,
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    path: r.path,
    metadata: r.metadata,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
  }
}

/**
 * UTF-8 CSV streamed in batches (newest first), optional HMAC footer when
 * `ORG_AUDIT_EXPORT_HMAC_SECRET` or `BETTER_AUTH_SECRET` is set.
 */
export function organizationIamAuditExportReadableStream(
  organizationId: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const maxRows = ORG_AUDIT_STREAM_MAX_ROWS
  const batchSize = ORG_AUDIT_STREAM_BATCH

  const orgScope = eq(iamAuditEvent.organizationId, organizationId)
  const orgActions = like(iamAuditEvent.action, "org.%")
  const whereClause = and(orgScope, orgActions)

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(`\uFEFF${ORG_AUDIT_CSV_HEADER_COLUMNS.join(",")}\r\n`)
        )

        let offset = 0
        let rowCount = 0
        let firstId: string | null = null
        let lastId: string | null = null

        while (offset < maxRows) {
          const take = Math.min(batchSize, maxRows - offset)
          const raw = await db
            .select({
              id: iamAuditEvent.id,
              createdAt: iamAuditEvent.createdAt,
              action: iamAuditEvent.action,
              actorUserId: iamAuditEvent.actorUserId,
              actorEmail: user.email,
              resourceType: iamAuditEvent.resourceType,
              resourceId: iamAuditEvent.resourceId,
              path: iamAuditEvent.path,
              metadata: iamAuditEvent.metadata,
              ipAddress: iamAuditEvent.ipAddress,
              userAgent: iamAuditEvent.userAgent,
            })
            .from(iamAuditEvent)
            .leftJoin(user, eq(iamAuditEvent.actorUserId, user.id))
            .where(whereClause)
            .orderBy(desc(iamAuditEvent.createdAt))
            .limit(take)
            .offset(offset)

          if (raw.length === 0) {
            break
          }

          const rows = raw.map(mapExportRow)
          for (const r of rows) {
            if (firstId === null) {
              firstId = r.id
            }
            lastId = r.id
            rowCount += 1
          }

          const chunk =
            rows.map(formatOrganizationIamAuditCsvDataRow).join("\r\n") + "\r\n"
          controller.enqueue(encoder.encode(chunk))
          offset += raw.length
          if (raw.length < take) {
            break
          }
        }

        const secret =
          process.env.ORG_AUDIT_EXPORT_HMAC_SECRET ??
          process.env.BETTER_AUTH_SECRET ??
          ""

        const footer: string[] = [
          `#afenda_audit_footer_v1,#row_count,${rowCount}`,
        ]
        if (
          secret.length > 0 &&
          rowCount > 0 &&
          firstId != null &&
          lastId != null
        ) {
          const sig = computeOrganizationIamAuditExportSignature({
            organizationId,
            rowCount,
            firstRowId: firstId,
            lastRowId: lastId,
            secret,
          })
          footer.push(`#afenda_audit_footer_v1,#signature_sha256,${sig}`)
        }

        controller.enqueue(encoder.encode(footer.join("\r\n") + "\r\n"))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

/** Builds UTF-8 CSV with header row (BOM optional for Excel). */
export function buildOrganizationIamAuditCsv(
  rows: OrganizationIamAuditExportRow[],
  options?: { bom?: boolean }
): string {
  const lines = [
    ORG_AUDIT_CSV_HEADER_COLUMNS.join(","),
    ...rows.map(formatOrganizationIamAuditCsvDataRow),
  ]

  const body = lines.join("\r\n")
  return options?.bom === false ? body : `\uFEFF${body}`
}

export {
  escapeCsvCell,
  formatOrganizationIamAuditCsvDataRow,
  parseCsvFirstField,
} from "./org-audit-csv.shared"
export type { OrganizationIamAuditExportRow } from "./org-audit-csv.shared"
export {
  computeOrganizationIamAuditExportSignature,
  verifyOrganizationIamAuditExportCsv,
} from "./org-audit-export-verify.server"
export type { OrganizationIamAuditCsvVerification } from "./org-audit-export-verify.server"
