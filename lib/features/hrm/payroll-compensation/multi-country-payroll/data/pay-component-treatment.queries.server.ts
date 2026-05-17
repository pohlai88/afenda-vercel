import "server-only"

import {
  listDefaultPayComponentTreatments,
  type PayComponentTreatmentFlags,
} from "./pay-component-treatment.defaults.shared"

export type ResolvedPayComponentTreatment = PayComponentTreatmentFlags & {
  readonly source: "default" | "org_override"
}

/** Merges org DB overrides with country defaults (HRM-MCP-006/007). */
export async function listPayComponentTreatmentsForCountry(input: {
  readonly organizationId: string
  readonly countryCode: string
  readonly atDate?: Date
}): Promise<readonly ResolvedPayComponentTreatment[]> {
  const defaults = listDefaultPayComponentTreatments(input.countryCode)

  return defaults
    .map((treatment) => ({ ...treatment, source: "default" as const }))
    .sort((a, b) => a.componentCode.localeCompare(b.componentCode))
}
