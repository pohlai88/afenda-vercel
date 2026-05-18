import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefitProvider } from "#lib/db/schema"

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
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500)
  const conditions = [eq(hrmBenefitProvider.organizationId, organizationId)]
  if (opts.isActive !== undefined) {
    conditions.push(eq(hrmBenefitProvider.isActive, opts.isActive))
  }

  return db
    .select({
      id: hrmBenefitProvider.id,
      organizationId: hrmBenefitProvider.organizationId,
      code: hrmBenefitProvider.code,
      name: hrmBenefitProvider.name,
      countryCodes: hrmBenefitProvider.countryCodes,
      externalReference: hrmBenefitProvider.externalReference,
      isActive: hrmBenefitProvider.isActive,
      createdAt: hrmBenefitProvider.createdAt,
      updatedAt: hrmBenefitProvider.updatedAt,
    })
    .from(hrmBenefitProvider)
    .where(and(...conditions))
    .orderBy(desc(hrmBenefitProvider.updatedAt))
    .limit(limit)
}

export async function getBenefitProviderForOrganization(
  organizationId: string,
  providerId: string
): Promise<BenefitProviderRow | null> {
  const [row] = await db
    .select({
      id: hrmBenefitProvider.id,
      organizationId: hrmBenefitProvider.organizationId,
      code: hrmBenefitProvider.code,
      name: hrmBenefitProvider.name,
      countryCodes: hrmBenefitProvider.countryCodes,
      externalReference: hrmBenefitProvider.externalReference,
      isActive: hrmBenefitProvider.isActive,
      createdAt: hrmBenefitProvider.createdAt,
      updatedAt: hrmBenefitProvider.updatedAt,
    })
    .from(hrmBenefitProvider)
    .where(
      and(
        eq(hrmBenefitProvider.organizationId, organizationId),
        eq(hrmBenefitProvider.id, providerId)
      )
    )
    .limit(1)

  return row ?? null
}
