import "server-only"

import { and, eq, gte, isNull, lte, or } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayComponentCountryTreatment } from "#lib/db/schema"

import {
  listDefaultPayComponentTreatments,
  type PayComponentTreatmentFlags,
} from "./pay-component-treatment.defaults.shared"

export type ResolvedPayComponentTreatment = PayComponentTreatmentFlags & {
  readonly source: "default" | "org_override"
}

function toIsoDate(d: Date | string): string {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10)
}

/** Merges org DB overrides with country defaults (HRM-MCP-006/007). */
export async function listPayComponentTreatmentsForCountry(input: {
  readonly organizationId: string
  readonly countryCode: string
  readonly atDate?: Date
}): Promise<readonly ResolvedPayComponentTreatment[]> {
  const atDate = input.atDate ?? new Date()
  const atDateOnly = new Date(`${toIsoDate(atDate)}T00:00:00.000Z`)

  const overrides = await db
    .select({
      componentCode: hrmPayComponentCountryTreatment.componentCode,
      taxable: hrmPayComponentCountryTreatment.taxable,
      contributable: hrmPayComponentCountryTreatment.contributable,
      pensionable: hrmPayComponentCountryTreatment.pensionable,
    })
    .from(hrmPayComponentCountryTreatment)
    .where(
      and(
        eq(hrmPayComponentCountryTreatment.organizationId, input.organizationId),
        eq(hrmPayComponentCountryTreatment.countryCode, input.countryCode),
        lte(hrmPayComponentCountryTreatment.effectiveFrom, atDateOnly),
        or(
          isNull(hrmPayComponentCountryTreatment.effectiveTo),
          gte(hrmPayComponentCountryTreatment.effectiveTo, atDateOnly)
        )
      )
    )

  const overrideMap = new Map(
    overrides.map((o) => [o.componentCode, o] as const)
  )

  const defaults = listDefaultPayComponentTreatments(input.countryCode)
  const codes = new Set<string>([
    ...defaults.map((d) => d.componentCode),
    ...overrideMap.keys(),
  ])

  const resolved: ResolvedPayComponentTreatment[] = []
  for (const code of codes) {
    const override = overrideMap.get(code)
    if (override) {
      resolved.push({
        componentCode: code,
        taxable: override.taxable,
        contributable: override.contributable,
        pensionable: override.pensionable,
        source: "org_override",
      })
    } else {
      const def = defaults.find((d) => d.componentCode === code)
      if (def) {
        resolved.push({ ...def, source: "default" })
      }
    }
  }

  return resolved.sort((a, b) =>
    a.componentCode.localeCompare(b.componentCode)
  )
}
