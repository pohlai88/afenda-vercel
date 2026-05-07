/**
 * Validates Upstash Redis REST credentials (same contract as @upstash/redis-js).
 * @see https://github.com/upstash/redis-js#basic-usage
 *
 * Run: pnpm verify:upstash
 * (loads .env.local via Node --env-file in package.json script)
 */
import { Redis } from "@upstash/redis"

const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

if (!url || !token) {
  console.error(
    "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in environment."
  )
  console.error(
    "Create a database at https://console.upstash.com/ or Vercel Marketplace → Redis, then set both vars."
  )
  console.error("Docs: https://github.com/upstash/redis-js#basic-usage")
  process.exit(1)
}

if (!url.startsWith("https://")) {
  console.warn(
    "UPSTASH_REDIS_REST_URL should be an https:// REST endpoint (not redis:// TCP)."
  )
}

const redis = new Redis({
  url,
  token,
  enableTelemetry: false,
})

const pong = await redis.ping()
if (pong !== "PONG") {
  console.error("Unexpected PING response:", pong)
  process.exit(1)
}

console.log("Upstash Redis: OK (PING → PONG)")
process.exit(0)
