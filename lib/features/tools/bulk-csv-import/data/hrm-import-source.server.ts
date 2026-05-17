import "server-only"

import type { HrmImportRollbackJson } from "../schemas/hrm-import.schema"
import { parseCsv } from "./hrm-import-csv.shared"

export async function loadEmployeeImportCsvFromRollback(
  rollback: Extract<HrmImportRollbackJson, { kind: "hrm_import_v1" }>
): Promise<string> {
  if (rollback.sourceCsv) {
    return rollback.sourceCsv
  }
  if (rollback.blobUrl) {
    const response = await fetch(rollback.blobUrl, { cache: "no-store" })
    if (!response.ok) {
      throw new Error("import_source_blob_fetch_failed")
    }
    return await response.text()
  }
  throw new Error("import_source_missing")
}

export async function loadEmployeeImportGridFromRollback(
  rollback: Extract<HrmImportRollbackJson, { kind: "hrm_import_v1" }>
): Promise<string[][]> {
  const text = await loadEmployeeImportCsvFromRollback(rollback)
  return parseCsv(text)
}
