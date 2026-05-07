import "server-only"

import type { OrgImportAdapterId } from "../types"

/** Canonical failure codes for adapter `applyRow` outcomes. */
export type AdapterFailureCode =
  | "validation"
  | "rate_limit"
  | "duplicate"
  | "external_api"
  | "permission"
  | "unknown"

export type AdapterParseOk<TRow> = { ok: true; payload: TRow }
export type AdapterParseErr = {
  ok: false
  error: string
  field?: string
  code?: AdapterFailureCode
}
export type AdapterApplyOk = {
  ok: true
  resourceType?: string
  resourceId?: string
}
export type AdapterApplyErr = {
  ok: false
  code: AdapterFailureCode
  message: string
  field?: string
}

/** Context passed to {@link OrgImportAdapter.applyRow}. */
export type AdapterApplyCtx = {
  organizationId: string
  actorUserId: string
  actorSessionId: string
  /** Headers from the calling Server Action (forwarded to Better Auth). */
  headers: Headers
}

/**
 * Pluggable contract every ingestion adapter implements. Generic over the row
 * payload `TRow` so adapters keep their own validated row shape. Registry
 * lookup happens in `getImportAdapter(id)`.
 */
export type OrgImportAdapter<TRow> = {
  readonly id: OrgImportAdapterId
  /** Required CSV columns (lower-cased). */
  readonly requiredHeaders: readonly string[]
  /** Validate and project a parsed CSV record into the adapter row. */
  parseRow(
    record: Record<string, string>
  ): AdapterParseOk<TRow> | AdapterParseErr
  /** Apply the validated row inside the active org tenancy. */
  applyRow(
    ctx: AdapterApplyCtx,
    payload: TRow
  ): Promise<AdapterApplyOk | AdapterApplyErr>
}
