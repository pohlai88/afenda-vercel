import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeOrgCredential } from "#lib/db/schema"

import { type KnowledgeOrgCredentialMetadata } from "./metadata-contracts.shared"
import { encryptCredential } from "./credential-cipher.server"

export type KnowledgeCredentialState =
  | "active"
  | "rotating"
  | "disabled"
  | "revoked"

export async function upsertOrgProviderCredential(args: {
  organizationId: string
  provider: string
  plaintext: string
  createdByUserId: string
  metadata?: KnowledgeOrgCredentialMetadata
}) {
  const encrypted = encryptCredential(args.plaintext)
  const [row] = await db
    .insert(knowledgeOrgCredential)
    .values({
      organizationId: args.organizationId,
      provider: args.provider,
      cipherText: encrypted.cipherText.toString("base64"),
      cipherIv: encrypted.cipherIv.toString("base64"),
      cipherTag: encrypted.cipherTag.toString("base64"),
      keyVersion: encrypted.keyVersion,
      state: "active",
      enabled: true,
      createdByUserId: args.createdByUserId,
      lastRotatedAt: new Date(),
      metadata: args.metadata ?? null,
    })
    .onConflictDoUpdate({
      target: [
        knowledgeOrgCredential.organizationId,
        knowledgeOrgCredential.provider,
      ],
      set: {
        cipherText: encrypted.cipherText.toString("base64"),
        cipherIv: encrypted.cipherIv.toString("base64"),
        cipherTag: encrypted.cipherTag.toString("base64"),
        keyVersion: encrypted.keyVersion,
        state: "active",
        enabled: true,
        createdByUserId: args.createdByUserId,
        lastRotatedAt: new Date(),
        updatedAt: new Date(),
        metadata: args.metadata ?? null,
      },
    })
    .returning({
      id: knowledgeOrgCredential.id,
      provider: knowledgeOrgCredential.provider,
    })
  return row
}

export async function setOrgProviderCredentialState(args: {
  organizationId: string
  provider: string
  state: KnowledgeCredentialState
  enabled: boolean
}) {
  const [row] = await db
    .update(knowledgeOrgCredential)
    .set({
      state: args.state,
      enabled: args.enabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(knowledgeOrgCredential.organizationId, args.organizationId),
        eq(knowledgeOrgCredential.provider, args.provider)
      )
    )
    .returning({
      id: knowledgeOrgCredential.id,
      provider: knowledgeOrgCredential.provider,
      state: knowledgeOrgCredential.state,
      enabled: knowledgeOrgCredential.enabled,
    })
  return row ?? null
}

export async function deleteOrgProviderCredential(args: {
  organizationId: string
  provider: string
}) {
  const [row] = await db
    .delete(knowledgeOrgCredential)
    .where(
      and(
        eq(knowledgeOrgCredential.organizationId, args.organizationId),
        eq(knowledgeOrgCredential.provider, args.provider)
      )
    )
    .returning({
      id: knowledgeOrgCredential.id,
      provider: knowledgeOrgCredential.provider,
    })
  return row ?? null
}
