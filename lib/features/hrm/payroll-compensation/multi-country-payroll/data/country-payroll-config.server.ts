import "server-only"

import {
  resolveRulePack,
  RULE_PACK_REGISTRY,
  type PayrollRulePack,
} from "./payroll-rule-pack.server"
import { syncCountryRulePacksFromRegistry } from "./country-rule-pack-sync.server"
import { isHrmPayrollSupportedCountryCode } from "./supported-countries.shared"

let registrySyncPromise: Promise<void> | null = null

async function ensureRegistrySynced(): Promise<void> {
  if (!registrySyncPromise) {
    registrySyncPromise = syncCountryRulePacksFromRegistry().then(() => undefined)
  }
  await registrySyncPromise
}

export type CountryPayrollConfigSummary = {
  readonly countryCode: string
  readonly version: string
  readonly effectiveFrom: Date
  readonly effectiveTo: Date | null
  readonly defaultCurrency: string
  readonly statutoryPackTypes: readonly string[]
  readonly manifest: PayrollRulePack["manifest"]
}

const DEFAULT_CURRENCY_BY_COUNTRY: Record<string, string> = {
  MY: "MYR",
  SG: "SGD",
  ID: "IDR",
  VN: "VND",
}

/**
 * Lists active country payroll configurations at a point in time (HRM-MCP-001/010).
 */
export async function listCountryPayrollConfigurations(
  atDate: Date = new Date()
): Promise<CountryPayrollConfigSummary[]> {
  await ensureRegistrySynced()

  const byCountry = new Map<string, CountryPayrollConfigSummary>()

  for (const pack of RULE_PACK_REGISTRY) {
    if (
      pack.effectiveFrom > atDate ||
      (pack.effectiveTo !== null && pack.effectiveTo <= atDate)
    ) {
      continue
    }
    const existing = byCountry.get(pack.countryCode)
    if (!existing || pack.effectiveFrom > existing.effectiveFrom) {
      byCountry.set(pack.countryCode, {
        countryCode: pack.countryCode,
        version: pack.version,
        effectiveFrom: pack.effectiveFrom,
        effectiveTo: pack.effectiveTo,
        defaultCurrency: DEFAULT_CURRENCY_BY_COUNTRY[pack.countryCode] ?? "USD",
        statutoryPackTypes: pack.defaultStatutoryPackTypes(),
        manifest: pack.manifest,
      })
    }
  }

  return [...byCountry.values()].sort((a, b) =>
    a.countryCode.localeCompare(b.countryCode)
  )
}

export async function getCountryPayrollConfiguration(
  countryCode: string,
  atDate: Date = new Date()
): Promise<CountryPayrollConfigSummary | null> {
  await ensureRegistrySynced()
  if (!isHrmPayrollSupportedCountryCode(countryCode)) {
    return null
  }
  try {
    const pack = resolveRulePack(countryCode, atDate)
    return {
      countryCode: pack.countryCode,
      version: pack.version,
      effectiveFrom: pack.effectiveFrom,
      effectiveTo: pack.effectiveTo,
      defaultCurrency: DEFAULT_CURRENCY_BY_COUNTRY[pack.countryCode] ?? "USD",
      statutoryPackTypes: pack.defaultStatutoryPackTypes(),
      manifest: pack.manifest,
    }
  } catch {
    return null
  }
}
