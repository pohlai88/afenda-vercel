/**
 * Validates that OPENSTATUS_PUBLIC_STATUS_URL serves a JSON feed at /feed/json (same path as
 * {@link buildOpenStatusFeedUrl} in lib/features/legal-docs).
 *
 *   node scripts/with-env.mjs node scripts/validate-openstatus-feed.mjs
 */
import process from "node:process"

function fail(msg) {
  console.error(`[openstatus:validate-feed] ${msg}`)
  process.exit(1)
}

const raw = process.env.OPENSTATUS_PUBLIC_STATUS_URL?.trim()
if (!raw) {
  fail(
    "Missing OPENSTATUS_PUBLIC_STATUS_URL — set in `.env.config`, run `pnpm env:sync`."
  )
}

let feedUrl
try {
  const base = new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw)
  base.pathname = `${base.pathname.replace(/\/+$/, "")}/feed/json`
  base.search = ""
  base.hash = ""
  feedUrl = base.toString()
} catch {
  fail(`OPENSTATUS_PUBLIC_STATUS_URL is not a valid URL: ${raw}`)
}

const res = await fetch(feedUrl, {
  headers: { Accept: "application/json" },
  redirect: "follow",
})

if (!res.ok) {
  fail(`GET ${feedUrl} → HTTP ${res.status}`)
}

const ct = res.headers.get("content-type") ?? ""
if (!ct.includes("json")) {
  console.warn(
    `[openstatus:validate-feed] Warning: Content-Type is "${ct}" (expected JSON).`
  )
}

let body
try {
  body = await res.json()
} catch {
  fail(`Response body is not JSON (first bytes may be HTML). URL: ${feedUrl}`)
}

const keys =
  body && typeof body === "object" ? Object.keys(body).slice(0, 12) : []
console.log(`[openstatus:validate-feed] OK — ${feedUrl}`)
console.log(
  `[openstatus:validate-feed] Top-level keys: ${keys.join(", ") || "(empty object)"}`
)
