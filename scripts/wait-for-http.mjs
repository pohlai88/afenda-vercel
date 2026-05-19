/**
 * Polls until an HTTP URL responds acceptably or timeout.
 *
 * Usage: node scripts/wait-for-http.mjs <url> [--timeout-ms=120000] [--accept=404,405]
 */
import http from "node:http"
import https from "node:https"

const url = process.argv[2]
if (!url) {
  console.error(
    "Usage: node scripts/wait-for-http.mjs <url> [--timeout-ms=120000] [--accept=404,405]"
  )
  process.exit(1)
}

const timeoutArg = process.argv.find((a) => a.startsWith("--timeout-ms="))
const timeoutMs = timeoutArg
  ? Number(timeoutArg.slice("--timeout-ms=".length))
  : 120_000

const acceptArg = process.argv.find((a) => a.startsWith("--accept="))
/** @type {Set<number>} */
const acceptStatuses = new Set(
  acceptArg
    ? acceptArg
        .slice("--accept=".length)
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n))
    : []
)

const started = Date.now()
const intervalMs = 750

await poll()

async function poll() {
  while (Date.now() - started < timeoutMs) {
    const status = await fetchStatus(url)
    if (status !== null && isAcceptable(status)) {
      console.log(`[wait-for-http] ready: ${url} (${status})`)
      process.exit(0)
    }
    await sleep(intervalMs)
  }
  console.error(`[wait-for-http] timeout after ${timeoutMs}ms: ${url}`)
  process.exit(1)
}

/**
 * @param {number} status
 */
function isAcceptable(status) {
  if (status < 500) return true
  return acceptStatuses.has(status)
}

/**
 * @param {string} target
 * @returns {Promise<number | null>}
 */
function fetchStatus(target) {
  return new Promise((resolve) => {
    const u = new URL(target)
    const lib = u.protocol === "https:" ? https : http
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname || "/",
        method: "GET",
        timeout: 5_000,
      },
      (res) => {
        res.resume()
        resolve(res.statusCode ?? null)
      }
    )
    req.on("timeout", () => {
      req.destroy()
      resolve(null)
    })
    req.on("error", () => resolve(null))
    req.end()
  })
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
