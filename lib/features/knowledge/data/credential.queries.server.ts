import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeOrgCredential } from "#lib/db/schema"

import { decryptCredential } from "./credential-cipher.server"

export type KnowledgeCredentialSummary = {
  provider: string
  state: string
  enabled: boolean
  lastRotatedAt: Date | null
  lastUsedAt: Date | null
  updatedAt: Date
}

export async function listOrgProviderCredentials(
  organizationId: string
): Promise<KnowledgeCredentialSummary[]> {
  return db
    .select({
      provider: knowledgeOrgCredential.provider,
      state: knowledgeOrgCredential.state,
      enabled: knowledgeOrgCredential.enabled,
      lastRotatedAt: knowledgeOrgCredential.lastRotatedAt,
      lastUsedAt: knowledgeOrgCredential.lastUsedAt,
      updatedAt: knowledgeOrgCredential.updatedAt,
    })
    .from(knowledgeOrgCredential)
    .where(eq(knowledgeOrgCredential.organizationId, organizationId))
    .orderBy(desc(knowledgeOrgCredential.updatedAt))
}

export async function getOrgProviderApiKey(
  organizationId: string,
  provider: string
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(knowledgeOrgCredential)
    .where(
      and(
        eq(knowledgeOrgCredential.organizationId, organizationId),
        eq(knowledgeOrgCredential.provider, provider)
      )
    )
    .limit(1)
  if (!row || !row.enabled || row.state !== "active") {
    return null
  }

  const plaintext = decryptCredential({
    cipherText: Buffer.from(row.cipherText, "base64"),
    cipherIv: Buffer.from(row.cipherIv, "base64"),
    cipherTag: Buffer.from(row.cipherTag, "base64"),
    keyVersion: row.keyVersion,
  })

  // Best-effort usage stamp; read path must stay resilient.
  void db
    .update(knowledgeOrgCredential)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(knowledgeOrgCredential.organizationId, organizationId),
        eq(knowledgeOrgCredential.provider, provider)
      )
    )

  return plaintext
}
