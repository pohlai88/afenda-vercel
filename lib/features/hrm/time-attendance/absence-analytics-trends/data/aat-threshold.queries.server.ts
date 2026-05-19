import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmAbsenceAnalyticsThreshold } from "#lib/db/schema"

import {
  AAT_DEFAULT_THRESHOLD_CONFIG,
  aatThresholdConfigSchema,
  type AatThresholdConfig,
} from "../schemas/aat-threshold.schema"

export async function getAatThresholdConfigForOrg(
  organizationId: string
): Promise<AatThresholdConfig> {
  const row = await db.query.hrmAbsenceAnalyticsThreshold.findFirst({
    where: eq(hrmAbsenceAnalyticsThreshold.organizationId, organizationId),
    columns: { config: true },
  })

  if (!row?.config) {
    return AAT_DEFAULT_THRESHOLD_CONFIG
  }

  const parsed = aatThresholdConfigSchema.safeParse(row.config)
  return parsed.success ? parsed.data : AAT_DEFAULT_THRESHOLD_CONFIG
}

export async function upsertAatThresholdConfigForOrg(input: {
  organizationId: string
  config: AatThresholdConfig
  updatedByUserId: string
}): Promise<void> {
  const existing = await db.query.hrmAbsenceAnalyticsThreshold.findFirst({
    where: eq(hrmAbsenceAnalyticsThreshold.organizationId, input.organizationId),
    columns: { id: true },
  })

  if (existing) {
    await db
      .update(hrmAbsenceAnalyticsThreshold)
      .set({
        config: input.config,
        updatedAt: new Date(),
        updatedByUserId: input.updatedByUserId,
      })
      .where(eq(hrmAbsenceAnalyticsThreshold.id, existing.id))
    return
  }

  await db.insert(hrmAbsenceAnalyticsThreshold).values({
    organizationId: input.organizationId,
    config: input.config,
    updatedByUserId: input.updatedByUserId,
  })
}
