import type { OrgFeedbackEventMetadata } from "../types"

export function parseOrgFeedbackEventMetadata(
  raw: string | null
): OrgFeedbackEventMetadata | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null
    }

    const metadata: OrgFeedbackEventMetadata = {}

    if (typeof parsed.messageLength === "number") {
      metadata.messageLength = parsed.messageLength
    }
    if (parsed.source === "utility-marketplace") {
      metadata.source = parsed.source
    }
    if (parsed.requestKind === "rail-icon") {
      metadata.requestKind = parsed.requestKind
    }
    if (typeof parsed.utilityId === "string" && parsed.utilityId.length > 0) {
      metadata.utilityId = parsed.utilityId
    }

    return Object.keys(metadata).length > 0 ? metadata : null
  } catch {
    return null
  }
}
