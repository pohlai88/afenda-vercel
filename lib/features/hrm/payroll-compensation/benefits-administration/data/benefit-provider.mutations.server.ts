import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefitProvider } from "#lib/db/schema"

export async function insertBenefitProvider(params: {
  organizationId: string
  code: string
  name: string
  countryCodes: string[]
  externalReference: string | null
  createdByUserId: string
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(hrmBenefitProvider)
    .values({
      organizationId: params.organizationId,
      code: params.code,
      name: params.name,
      countryCodes: params.countryCodes,
      externalReference: params.externalReference,
      createdByUserId: params.createdByUserId,
      updatedByUserId: params.createdByUserId,
    })
    .returning({ id: hrmBenefitProvider.id })

  return { id: row.id }
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
    .update(hrmBenefitProvider)
    .set({
      code: params.code,
      name: params.name,
      countryCodes: params.countryCodes,
      externalReference: params.externalReference,
      isActive: params.isActive,
      updatedByUserId: params.updatedByUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefitProvider.organizationId, params.organizationId),
        eq(hrmBenefitProvider.id, params.providerId)
      )
    )
}
