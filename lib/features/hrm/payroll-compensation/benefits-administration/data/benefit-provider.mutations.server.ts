import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefit } from "#lib/db/schema"

export async function insertBenefitProvider(params: {
  organizationId: string
  code: string
  name: string
  countryCodes: string[]
  externalReference: string | null
  createdByUserId: string
}): Promise<{ id: string }> {
  return { id: params.code }
}

export async function updateBenefitProviderRow(params: {
  organizationId: string
  providerId: string
  code: string
  name: string
  countryCodes: string[]
  externalReference: string | null
  isActive: boolean
  updatedByUserId: string
}): Promise<void> {
  await db
    .update(hrmBenefit)
    .set({
      providerId: params.code,
      providerName: params.name,
      scopeCountryCodes: params.countryCodes,
      policyReference: params.externalReference,
      isActive: params.isActive,
      updatedByUserId: params.updatedByUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefit.organizationId, params.organizationId),
        eq(hrmBenefit.providerId, params.providerId)
      )
    )
}
