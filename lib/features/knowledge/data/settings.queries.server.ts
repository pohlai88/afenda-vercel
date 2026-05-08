import "server-only"

import { unstable_cache } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeOrgSetting } from "#lib/db/schema"

export function knowledgeOrgSettingsTag(organizationId: string) {
  return `org:${organizationId}:knowledge:settings`
}

export async function getKnowledgeOrgSetting(organizationId: string) {
  const [row] = await db
    .select()
    .from(knowledgeOrgSetting)
    .where(eq(knowledgeOrgSetting.organizationId, organizationId))
    .limit(1)
  return row ?? null
}

export async function getCachedKnowledgeOrgSetting(organizationId: string) {
  return unstable_cache(
    async () => getKnowledgeOrgSetting(organizationId),
    [`knowledge-org-setting:${organizationId}`],
    { tags: [knowledgeOrgSettingsTag(organizationId)] }
  )()
}

export async function upsertKnowledgeOrgSetting(
  organizationId: string,
  values: {
    retrievalHybridEnabled: boolean
    retrievalRerankEnabled: boolean
    enforceZdr: boolean
  }
) {
  const [row] = await db
    .insert(knowledgeOrgSetting)
    .values({
      organizationId,
      retrievalHybridEnabled: values.retrievalHybridEnabled,
      retrievalRerankEnabled: values.retrievalRerankEnabled,
      enforceZdr: values.enforceZdr,
    })
    .onConflictDoUpdate({
      target: knowledgeOrgSetting.organizationId,
      set: {
        retrievalHybridEnabled: values.retrievalHybridEnabled,
        retrievalRerankEnabled: values.retrievalRerankEnabled,
        enforceZdr: values.enforceZdr,
        updatedAt: new Date(),
      },
    })
    .returning()
  return row
}
