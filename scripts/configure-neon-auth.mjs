import fs from "node:fs"
import path from "node:path"

function parseDotEnv(filePath) {
  const out = {}
  if (!fs.existsSync(filePath)) return out
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue
    const idx = line.indexOf("=")
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    out[key] = value
  }
  return out
}

const root = path.resolve(import.meta.dirname, "..")
const env = {
  ...parseDotEnv(path.join(root, ".env.local")),
  ...process.env,
}

const apiKey = env.NEON_API_KEY
const projectId = env.NEON_PROJECT_ID || env.NEON_AUTH_PROJECT_ID
const branchId = env.NEON_BRANCH_ID || env.NEON_AUTH_BRANCH_ID

if (!apiKey || !projectId || !branchId) {
  console.error("Missing NEON_API_KEY / project / branch env")
  process.exit(1)
}

const base = `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/auth`
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${apiKey}`,
}

async function patch(url, body) {
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`PATCH ${url} failed ${res.status}: ${text}`)
  }
  return text
}

async function put(url, body) {
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`PUT ${url} failed ${res.status}: ${text}`)
  }
  return text
}

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`POST ${url} failed ${res.status}: ${text}`)
  }
  return text
}

async function patchAny(urls, body) {
  let lastError = null
  for (const url of urls) {
    try {
      return await patch(url, body)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

const trustedOrigins = ["https://nexuscanon.com", "https://www.nexuscanon.com"]

const socialProviders = [
  {
    id: "google",
    clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
    clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
    isShared: false,
  },
  {
    id: "github",
    clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
    clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
  },
].filter((p) => p.clientId && p.clientSecret)

const webhookUrl =
  env.NEON_AUTH_WEBHOOK_URL ||
  `${env.NEXT_PUBLIC_SITE_URL || "https://www.nexuscanon.com"}/api/integrations/neon-auth-webhooks`

for (const domain of trustedOrigins) {
  try {
    await post(`${base}/domains`, { auth_provider: "better_auth", domain })
  } catch (error) {
    const message = String(error)
    if (
      !message.includes("409") &&
      !message.includes("DOMAIN_ALREADY_EXISTS")
    ) {
      throw error
    }
  }
}

await patch(`${base}/allow_localhost`, {
  auth_provider: "better_auth",
  allow_localhost: true,
})

await patch(`${base}/plugins/organization`, {
  auth_provider: "better_auth",
  enabled: true,
  creator_role: "owner",
  membership_limit: 100,
  organization_limit: 10,
  send_invitation_email: true,
})

try {
  await patchAny([`${base}/plugins/magicLink`, `${base}/plugins/magic_link`], {
    auth_provider: "better_auth",
    enabled: true,
    expiresIn: 5,
    disableSignUp: false,
  })
} catch (error) {
  console.warn(
    "[neon-auth:configure] Could not PATCH magic-link plugin endpoint; apply via Neon Console if needed.",
    String(error)
  )
}

try {
  await put(`${base}/webhooks`, {
    auth_provider: "better_auth",
    enabled: true,
    webhook_url: webhookUrl,
    enabled_events: [
      "send.otp",
      "send.magic_link",
      "user.before_create",
      "user.created",
    ],
    timeout_seconds: 5,
  })
} catch (error) {
  console.warn(
    "[neon-auth:configure] Could not PUT webhook config; apply via Neon Console/API.",
    String(error)
  )
}

console.log(
  JSON.stringify(
    {
      ok: true,
      projectId,
      branchId,
      webhookUrl,
      magicLinkEnabled: true,
      trustedOrigins,
      providersPlanned: socialProviders.map((p) => p.id),
    },
    null,
    2
  )
)
