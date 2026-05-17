import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmCountryRulePack } from "#lib/db/schema"

import { RULE_PACK_REGISTRY } from "./payroll-rule-pack.server"

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Idempotent mirror of TS rule-pack registry into `hrm_country_rule_pack` (HRM-MCP-023).
 */
export async function syncCountryRulePacksFromRegistry(): Promise<{
  readonly upserted: number
}> {
  let upserted = 0

  for (const pack of RULE_PACK_REGISTRY) {
    const existing = await db
      .select({ id: hrmCountryRulePack.id })
      .from(hrmCountryRulePack)
      .where(
        and(
          eq(hrmCountryRulePack.countryCode, pack.countryCode),
          eq(hrmCountryRulePack.version, pack.version)
        )
      )
      .limit(1)

    const row = {
      countryCode: pack.countryCode,
      version: pack.version,
      effectiveFrom: toIsoDate(pack.effectiveFrom),
      effectiveTo: pack.effectiveTo ? toIsoDate(pack.effectiveTo) : null,
      manifest: pack.manifest,
    }

    if (existing[0]) {
      await db
        .update(hrmCountryRulePack)
        .set(row)
        .where(eq(hrmCountryRulePack.id, existing[0].id))
    } else {
      await db.insert(hrmCountryRulePack).values(row)
    }
    upserted += 1
  }

  return { upserted }
}
