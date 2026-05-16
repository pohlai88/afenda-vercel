/**
 * Verifies Playwright E2E env vars after `pnpm env:sync`.
 * Usage: node scripts/with-env.mjs node scripts/verify-e2e-env.mjs
 */
const required = [
  "E2E_ORG_ADMIN_EMAIL",
  "E2E_ORG_ADMIN_PASSWORD",
  "E2E_EMPLOYEE_PORTAL_SLUG",
]

const optional = ["E2E_ORG_SLUG"]

let ok = true
for (const key of required) {
  const value = process.env[key]?.trim() ?? ""
  if (!value) {
    console.error(`[verify-e2e-env] Missing ${key}`)
    ok = false
    continue
  }
  if (key.includes("PASSWORD")) {
    console.log(`[verify-e2e-env] ${key}=<set, len ${value.length}>`)
  } else {
    console.log(`[verify-e2e-env] ${key}=${value}`)
  }
}

for (const key of optional) {
  const value = process.env[key]?.trim()
  if (value) console.log(`[verify-e2e-env] ${key}=${value}`)
}

if (!ok) process.exit(1)

console.log(
  "[verify-e2e-env] OK — Playwright loads these via scripts/with-env.mjs → .env.local"
)
