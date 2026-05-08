import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { orgBotLink } from "#lib/db/schema"

export async function getOrgBotLinkByGithubInstall(args: {
  installationId: string
  repository: string
}) {
  const [row] = await db
    .select()
    .from(orgBotLink)
    .where(
      and(
        eq(orgBotLink.platform, "github"),
        eq(orgBotLink.externalInstallationId, args.installationId),
        eq(orgBotLink.externalRepository, args.repository),
        eq(orgBotLink.enabled, true)
      )
    )
    .limit(1)
  return row ?? null
}

export async function getOrgBotLinkByDiscordGuild(args: { guildId: string }) {
  const [row] = await db
    .select()
    .from(orgBotLink)
    .where(
      and(
        eq(orgBotLink.platform, "discord"),
        eq(orgBotLink.externalWorkspaceId, args.guildId),
        eq(orgBotLink.enabled, true)
      )
    )
    .limit(1)
  return row ?? null
}
