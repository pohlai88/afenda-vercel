import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { orgBotLink } from "#lib/db/schema"

export async function listOrgBotLinks(organizationId: string) {
  return db
    .select()
    .from(orgBotLink)
    .where(eq(orgBotLink.organizationId, organizationId))
}

export async function insertOrgBotLink(args: {
  organizationId: string
  platform: "github" | "discord"
  externalWorkspaceId?: string
  externalRepository?: string
  externalInstallationId?: string
  createdByUserId: string
}) {
  const [row] = await db
    .insert(orgBotLink)
    .values({
      organizationId: args.organizationId,
      platform: args.platform,
      externalWorkspaceId: args.externalWorkspaceId ?? null,
      externalRepository: args.externalRepository ?? null,
      externalInstallationId: args.externalInstallationId ?? null,
      createdByUserId: args.createdByUserId,
      enabled: true,
    })
    .returning()
  return row
}

export async function deleteOrgBotLink(args: {
  organizationId: string
  id: string
}) {
  const [row] = await db
    .delete(orgBotLink)
    .where(
      and(
        eq(orgBotLink.organizationId, args.organizationId),
        eq(orgBotLink.id, args.id)
      )
    )
    .returning({ id: orgBotLink.id })
  return row ?? null
}

export async function updateOrgBotLink(args: {
  organizationId: string
  id: string
  externalWorkspaceId?: string
  externalRepository?: string
  externalInstallationId?: string
  displayName?: string
}) {
  const [row] = await db
    .update(orgBotLink)
    .set({
      externalWorkspaceId: args.externalWorkspaceId ?? null,
      externalRepository: args.externalRepository ?? null,
      externalInstallationId: args.externalInstallationId ?? null,
      displayName: args.displayName ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orgBotLink.organizationId, args.organizationId),
        eq(orgBotLink.id, args.id)
      )
    )
    .returning({ id: orgBotLink.id })
  return row ?? null
}

export async function setOrgBotLinkEnabled(args: {
  organizationId: string
  id: string
  enabled: boolean
}) {
  const [row] = await db
    .update(orgBotLink)
    .set({
      enabled: args.enabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orgBotLink.organizationId, args.organizationId),
        eq(orgBotLink.id, args.id)
      )
    )
    .returning({ id: orgBotLink.id })
  return row ?? null
}

export async function recordOrgBotLinkTestResult(args: {
  organizationId: string
  id: string
  status: "ok" | "error" | "pending"
  error?: string
}) {
  const [row] = await db
    .update(orgBotLink)
    .set({
      lastTestedAt: new Date(),
      lastTestStatus: args.status,
      lastTestError: args.error ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orgBotLink.organizationId, args.organizationId),
        eq(orgBotLink.id, args.id)
      )
    )
    .returning({ id: orgBotLink.id })
  return row ?? null
}
