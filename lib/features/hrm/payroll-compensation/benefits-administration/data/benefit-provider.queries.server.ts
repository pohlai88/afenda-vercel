import "server-only"

import { and, desc, eq, isNotNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefit } from "#lib/db/schema"

export type BenefitProviderRow = {
  id: string
  organizationId: string
  code: string
  name: string
  countryCodes: string[]
  externalReference: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export async function listBenefitProvidersForOrganization(
  organizationId: string,
  opts: { isActive?: boolean; limit?: number } = {}
): Promise<BenefitProviderRow[]> {
  const conditions = [eq(hrmBenefit.organizationId, organizationId)]
  if (opts.isActive !== undefined) {
    conditions.push(eq(hrmBenefit.isActive, opts.isActive))
  }
  const rows = await db
    .select({
      id: hrmBenefit.providerId,
      organizationId: hrmBenefit.organizationId,
      name: hrmBenefit.providerName,
      countryCodes: hrmBenefit.scopeCountryCodes,
      externalReference: hrmBenefit.policyReference,
      isActive: hrmBenefit.isActive,
      createdAt: hrmBenefit.createdAt,
      updatedAt: hrmBenefit.updatedAt,
    })
    .from(hrmBenefit)
    .where(and(...conditions, isNotNull(hrmBenefit.providerName)))
    .orderBy(desc(hrmBenefit.updatedAt))
    .limit(Math.max(opts.limit ?? 200, 200))

  const unique = new Map<string, BenefitProviderRow>()
  for (const row of rows) {
    const name = row.name?.trim()
    if (!name) continue
    const id = row.id?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    if (unique.has(id)) continue
    unique.set(id, {
      id,
      organizationId: row.organizationId,
      code: id,
      name,
      countryCodes: row.countryCodes ?? [],
      externalReference: row.externalReference,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  return [...unique.values()].slice(0, opts.limit ?? 200)
}

export async function getBenefitProviderForOrganization(
  organizationId: string,
  providerId: string
): Promise<BenefitProviderRow | null> {
  const providers = await listBenefitProvidersForOrganization(organizationId, {
    limit: 500,
  })
  return providers.find((provider) => provider.id === providerId) ?? null
}
