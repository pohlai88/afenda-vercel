import { createHmac, timingSafeEqual } from "node:crypto"

import {
  createLynxOperatorRuntime,
  resolveLynxTruthStreamProviderOptionsForOrg,
} from "#features/lynx"
import { getOrgBotLinkByDiscordGuild } from "#features/knowledge"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type DiscordCommandPayload = {
  guild_id?: string
  data?: { name?: string; options?: Array<{ name?: string; value?: string }> }
}

function verifyDiscordHmac(request: Request, rawBody: string): boolean {
  const secret = process.env.DISCORD_INTERACTIONS_SECRET?.trim()
  if (!secret) return false
  const signature = request.headers.get("x-discord-signature")
  const timestamp = request.headers.get("x-discord-timestamp")
  if (!signature || !timestamp) return false
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")
  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(signature, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

async function runPrompt(prompt: string, organizationId: string) {
  const runtime = createLynxOperatorRuntime({
    organizationId,
    executionMode: "background",
  })
  if (!runtime) return ""
  const providerOptions =
    await resolveLynxTruthStreamProviderOptionsForOrg(organizationId)
  const stream = await runtime.stream({
    prompt,
    ...(providerOptions ? { providerOptions } : {}),
  })
  let reply = ""
  for await (const delta of stream.textStream) reply += delta
  return reply.trim()
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  if (!verifyDiscordHmac(request, rawBody)) {
    return routeJsonError("Unauthorized", 401)
  }

  const payload = JSON.parse(rawBody) as DiscordCommandPayload
  const guildId = payload.guild_id
  if (!guildId) return routeJsonError("Missing guild_id", 400)

  const link = await getOrgBotLinkByDiscordGuild({ guildId })
  if (!link) return routeJsonError("No organization mapping for guild", 404)

  const prompt =
    payload.data?.options
      ?.find((opt) => opt.name === "prompt")
      ?.value?.trim() ?? ""
  if (!prompt) return routeJsonError("Missing prompt option", 400)

  const reply = await runPrompt(prompt, link.organizationId)
  return routeJsonOk({
    type: 4,
    data: {
      content: reply || "No response generated.",
    },
  })
}
