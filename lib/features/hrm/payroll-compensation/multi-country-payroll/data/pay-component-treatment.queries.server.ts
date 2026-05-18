import "server-only"

import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayComponentCountryTreatment } from "#lib/db/schema"

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
  const countryCode = input.countryCode.toUpperCase()
  const defaults = listDefaultPayComponentTreatments(countryCode)
  const atDate = input.atDate ?? new Date()

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
        eq(
          hrmPayComponentCountryTreatment.organizationId,
          input.organizationId
        ),
        eq(hrmPayComponentCountryTreatment.countryCode, countryCode),
        lte(hrmPayComponentCountryTreatment.effectiveFrom, atDate),
        or(
          isNull(hrmPayComponentCountryTreatment.effectiveTo),
          gte(hrmPayComponentCountryTreatment.effectiveTo, atDate)
        )
      )
    )
    .orderBy(
      asc(hrmPayComponentCountryTreatment.componentCode),
      desc(hrmPayComponentCountryTreatment.effectiveFrom)
    )

  const overrideByComponent = new Map<string, PayComponentTreatmentFlags>()
  for (const override of overrides) {
    if (overrideByComponent.has(override.componentCode)) continue
    overrideByComponent.set(override.componentCode, {
      componentCode: override.componentCode,
      taxable: override.taxable,
      contributable: override.contributable,
      pensionable: override.pensionable,
    })
  }

  const merged = new Map<string, ResolvedPayComponentTreatment>()

  for (const treatment of defaults) {
    const override = overrideByComponent.get(treatment.componentCode)
    merged.set(treatment.componentCode, {
      ...(override ?? treatment),
      source: override ? "org_override" : "default",
    })
  }

  for (const [componentCode, override] of overrideByComponent) {
    if (merged.has(componentCode)) continue
    merged.set(componentCode, { ...override, source: "org_override" })
  }

  return [...merged.values()].sort((a, b) =>
    a.componentCode.localeCompare(b.componentCode)
  )
}
