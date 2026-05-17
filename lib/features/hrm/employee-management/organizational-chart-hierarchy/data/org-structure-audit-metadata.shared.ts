import type { OrgStructureFieldChange } from "./org-structure-change-history.shared"

/** Non-PII audit payload for IAM org structure events (HRM-ORG-025). */
export function buildOrgStructureAuditMetadata(input: {
  readonly code: string
  readonly changes?: readonly OrgStructureFieldChange[]
  readonly previousCode?: string
  readonly approvalReference?: string | null
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = { code: input.code }
  if (input.previousCode && input.previousCode !== input.code) {
    metadata.previousCode = input.previousCode
  }
  if (input.approvalReference) {
    metadata.approvalReference = input.approvalReference
  }
  if (input.changes && input.changes.length > 0) {
    metadata.changes = input.changes.map((row) => ({
      field: row.fieldName,
      from: row.oldValue,
      to: row.newValue,
    }))
  }
  return metadata
}
