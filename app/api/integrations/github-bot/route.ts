import { createHmac, timingSafeEqual } from "node:crypto"

import {
  createLynxOperatorRuntime,
  resolveLynxTruthStreamProviderOptionsForOrg,
} from "#features/lynx"
import { getOrgBotLinkByGithubInstall } from "#features/knowledge"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type GithubCommentWebhook = {
  action?: string
  comment?: { body?: string }
  installation?: { id?: number }
  repository?: { full_name?: string }
}

function verifyGithubSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim()
  if (!secret) return false
  if (!signature?.startsWith("sha256=")) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const received = signature.slice("sha256=".length)
  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(received, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

async function readAssistantReply(prompt: string, organizationId: string) {
  const runtime = createLynxOperatorRuntime({
    organizationId,
    executionMode: "background",
  })
  if (!runtime) return null
  const providerOptions =
    await resolveLynxTruthStreamProviderOptionsForOrg(organizationId)
  const stream = await runtime.stream({
    prompt,
    ...(providerOptions ? { providerOptions } : {}),
  })
  let out = ""
  for await (const delta of stream.textStream) out += delta
  return out.trim()
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  if (
    !verifyGithubSignature(rawBody, request.headers.get("x-hub-signature-256"))
  ) {
    return routeJsonError("Unauthorized", 401)
  }

  const payload = JSON.parse(rawBody) as GithubCommentWebhook
  if (payload.action !== "created") {
    return routeJsonOk({ ok: true, ignored: true })
  }
  const installationId = payload.installation?.id
  const repository = payload.repository?.full_name
  const prompt = payload.comment?.body?.trim()
  if (!installationId || !repository || !prompt) {
    return routeJsonError("Missing webhook payload fields", 400)
  }

  const link = await getOrgBotLinkByGithubInstall({
    installationId: String(installationId),
    repository,
  })
  if (!link) {
    return routeJsonError("No organization mapping for installation", 404)
  }

  const response = await readAssistantReply(prompt, link.organizationId)
  return routeJsonOk({
    ok: true,
    organizationId: link.organizationId,
    reply: response ?? "",
  })
}
