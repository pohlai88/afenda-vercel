import {
  auditEvent7W1HSchema,
  describeAuditEvent7W1H,
} from "#lib/erp/audit-7w1h.shared"

/** Keys under `Dashboard.Hrm.workforce.*` (facet labels). */
export type EmployeeTimelineFacetLabelKey =
  | "timelineFacetEmployeeNumber"
  | "timelineFacetVersionNumber"
  | "timelineFacetContractType"
  | "timelineFacetState"
  | "timelineFacetDocumentType"
  | "timelineFacetClassification"
  | "timelineFacetPayloadHashSuffix"
  | "timelineFacetLinkedDraftContractId"
  | "timelineFacetChangedFields"
  | "timelineFacetHasEmail"
  | "timelineFacetHasPreferredName"
  | "timelineFacetHasDepartment"
  | "timelineFacetHasPosition"
  | "timelineFacetHasJobGrade"
  | "timelineFacetHasArchivedReason"
  | "timelineFacetHasTaxIdentifier"
  | "timelineFacetHasBankToken"

export type EmployeeTimelineFacet = {
  labelKey: EmployeeTimelineFacetLabelKey
  value: string
}

export type EmployeeTimelineMetadataView = {
  narrative: string | null
  facets: EmployeeTimelineFacet[]
}

function stringifyFacetValue(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    if (value.every((x) => typeof x === "string")) {
      return value.join(", ")
    }
    return JSON.stringify(value)
  }
  if (typeof value === "object") {
    return JSON.stringify(value)
  }
  return null
}

const METADATA_FACET_ORDER: ReadonlyArray<
  readonly [string, EmployeeTimelineFacetLabelKey]
> = [
  ["employeeNumber", "timelineFacetEmployeeNumber"],
  ["versionNumber", "timelineFacetVersionNumber"],
  ["contractType", "timelineFacetContractType"],
  ["state", "timelineFacetState"],
  ["documentType", "timelineFacetDocumentType"],
  ["classification", "timelineFacetClassification"],
  ["payloadHashSuffix", "timelineFacetPayloadHashSuffix"],
  ["linkedDraftContractId", "timelineFacetLinkedDraftContractId"],
  ["changedFields", "timelineFacetChangedFields"],
  ["hasEmail", "timelineFacetHasEmail"],
  ["hasPreferredName", "timelineFacetHasPreferredName"],
  ["hasDepartment", "timelineFacetHasDepartment"],
  ["hasPosition", "timelineFacetHasPosition"],
  ["hasJobGrade", "timelineFacetHasJobGrade"],
  ["hasArchivedReason", "timelineFacetHasArchivedReason"],
  ["hasTaxIdentifier", "timelineFacetHasTaxIdentifier"],
  ["hasBankToken", "timelineFacetHasBankToken"],
]

/**
 * Maps IAM audit `metadata` JSON (HRM workforce mutations) into facet rows for the employee timeline.
 * Omits `employeeId` and other linking IDs that duplicate the page context.
 */
export function buildEmployeeTimelineMetadataView(
  rawMetadata: string | null
): EmployeeTimelineMetadataView {
  if (rawMetadata == null || rawMetadata.length === 0) {
    return { narrative: null, facets: [] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawMetadata) as unknown
  } catch {
    return { narrative: null, facets: [] }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { narrative: null, facets: [] }
  }

  const obj = parsed as Record<string, unknown>

  let narrative: string | null = null
  const cache = obj.audit7w1h
  if (cache && typeof cache === "object" && !Array.isArray(cache)) {
    const r = auditEvent7W1HSchema.safeParse(cache)
    if (r.success) {
      narrative = describeAuditEvent7W1H(r.data)
    }
  }

  const facets: EmployeeTimelineFacet[] = []
  for (const [metaKey, labelKey] of METADATA_FACET_ORDER) {
    if (!(metaKey in obj)) continue
    const str = stringifyFacetValue(obj[metaKey])
    if (str === null) continue
    facets.push({ labelKey, value: str })
  }

  return { narrative, facets }
}
