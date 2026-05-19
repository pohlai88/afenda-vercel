/**
 * Seeds development users and the "Demo Organization" into Neon Auth.
 *
 * Equivalent to Auth.js CredentialsProvider dev accounts — creates real users
 * in neon_auth so the DevSignInPanel presets work end-to-end.
 *
 * Strategy:
 *   1. POST to the running Next.js dev/start server (NEXT_PUBLIC_AUTH_URL/sign-up/email)
 *      to create users via the standard Neon Auth API proxy.
 *   2. SQL-patch emailVerified = true so sign-in works without the email flow.
 *   3. Create the Demo Org + member rows in neon_auth via SQL.
 *
 * Tenant bootstrap: ERP routes need `activeOrganizationId` on the session.
 * The browser Dev panel (`components/dev/dev-signin-panel.tsx`) calls
 * `organization.setActive({ organizationId: DEMO_ORG.id })` after email/password
 * sign-in — signing in manually still requires picking the org or using `/o` / `/bootstrap`.
 *
 * Usage:
 *   # Dev server must be running (pnpm dev) OR pass a custom AUTH_URL:
 *   node scripts/with-env.mjs node scripts/seed-dev-users.mjs
 *   AUTH_URL=http://localhost:3001 node scripts/with-env.mjs node scripts/seed-dev-users.mjs
 *
 * Idempotent: existing users and org rows are skipped.
 * Requires NEXT_PUBLIC_AUTH_URL and DATABASE_URL in .env.local (pnpm env:sync first).
 */

import { randomUUID, scrypt, randomBytes } from "node:crypto"
import { promisify } from "node:util"
import { neon } from "@neondatabase/serverless"

const scryptAsync = promisify(scrypt)

const DATABASE_URL = process.env.DATABASE_URL
const AUTH_URL =
  process.env.AUTH_URL ??
  process.env.NEXT_PUBLIC_AUTH_URL ??
  "http://localhost:3000/api/auth"

if (!DATABASE_URL) {
  console.error(
    "[seed-dev-users] DATABASE_URL is not set. Run `pnpm env:sync` first."
  )
  process.exit(1)
}

const sql = neon(DATABASE_URL)

const DEV_PASSWORD = "123qweasdzxc!@#"

const DEV_USERS = [
  { name: "Demo Owner", email: "owner@afenda.com", orgRole: "owner" },
  { name: "Demo ERP", email: "erp@afenda.com", orgRole: "member" },
]

const DEMO_ORG = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Demo Organization",
  slug: "demo-org",
}

/**
 * Hash a password using Better Auth / Neon Auth's scrypt format: `{salt}:{hash}`
 * where both components are hex-encoded. N=16384, r=16, p=1, keylen=64.
 */
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex")
  // Better Auth uses N=16384, r=16, p=1 — set maxmem above the default 32 MB ceiling
  const key = await scryptAsync(password, salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  })
  return `${salt}:${key.toString("hex")}`
}

/** Try to create a user via the Next.js auth proxy. Returns userId or null. */
async function signUpViaProxy(name, email, password) {
  const url = `${AUTH_URL}/sign-up/email`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      return body?.user?.id ?? body?.data?.user?.id ?? null
    }
    if (res.status === 422 || res.status === 409) {
      return "CONFLICT" // already exists
    }
    console.warn(`  proxy sign-up returned ${res.status}:`, body)
    return null
  } catch (err) {
    console.warn(
      `  proxy unreachable (${err.message}) — falling back to direct SQL insert`
    )
    return null
  }
}

/** Create user directly in neon_auth via SQL (fallback when proxy is unreachable). */
async function createUserViaSql(name, email, password) {
  const existing = await sql`
    SELECT id FROM neon_auth.user WHERE email = ${email} LIMIT 1
  `

  const now = new Date()
  const hashedPassword = await hashPassword(password)

  let userId
  let existed = false

  if (existing.length > 0) {
    userId = existing[0].id
    existed = true
  } else {
    userId = randomUUID()
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", "createdAt", "updatedAt")
      VALUES (${userId}, ${name}, ${email}, true, ${now}, ${now})
      ON CONFLICT (id) DO NOTHING
    `
  }

  // Upsert the credential account — always set the hashed password
  const existingAccount = await sql`
    SELECT id FROM neon_auth.account
    WHERE "userId" = ${userId} AND "providerId" = 'credential' LIMIT 1
  `
  if (existingAccount.length > 0) {
    await sql`
      UPDATE neon_auth.account
      SET password = ${hashedPassword}, "updatedAt" = ${now}
      WHERE id = ${existingAccount[0].id}
    `
  } else {
    const accountId = randomUUID()
    await sql`
      INSERT INTO neon_auth.account (
        id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
      )
      VALUES (
        ${accountId}, ${email}, 'credential', ${userId}, ${hashedPassword}, ${now}, ${now}
      )
    `
  }

  return { id: userId, existed }
}

async function main() {
  console.log(`[seed-dev-users] Auth URL: ${AUTH_URL}`)
  console.log("[seed-dev-users] Seeding development users…\n")

  const seededUsers = []

  for (const user of DEV_USERS) {
    process.stdout.write(`  • ${user.email} … `)

    let userId = null
    let method = "api"

    // Try proxy first
    const proxyResult = await signUpViaProxy(
      user.name,
      user.email,
      DEV_PASSWORD
    )

    if (proxyResult && proxyResult !== "CONFLICT") {
      // Proxy successfully created the user
      userId = proxyResult
      method = "api"
    } else {
      // Proxy conflict or unreachable — direct SQL insert/upsert (sets correct password hash)
      const { id, existed } = await createUserViaSql(
        user.name,
        user.email,
        DEV_PASSWORD
      )
      userId = id
      method = existed ? "updated-hash" : "sql-insert"
    }

    if (!userId) {
      console.log("FAILED — could not create or find user")
      process.exit(1)
    }

    // Ensure emailVerified = true regardless of creation path
    await sql`
      UPDATE neon_auth.user
      SET "emailVerified" = true, "updatedAt" = NOW()
      WHERE id = ${userId}
    `

    console.log(`${method} (id=${userId.slice(0, 8)}…)`)
    seededUsers.push({ ...user, userId })
  }

  console.log("\n[seed-dev-users] Creating Demo Organization…")

  // Resolve org: try fixed ID first, then by slug
  const existingById = await sql`
    SELECT id, slug FROM neon_auth.organization WHERE id = ${DEMO_ORG.id} LIMIT 1
  `
  const existingBySlug = await sql`
    SELECT id, slug FROM neon_auth.organization WHERE slug = ${DEMO_ORG.slug} LIMIT 1
  `

  let orgId = DEMO_ORG.id
  if (existingById.length > 0 || existingBySlug.length > 0) {
    orgId = existingById[0]?.id ?? existingBySlug[0]?.id
    console.log(
      `  • Org already exists (id=${orgId}, slug=${existingById[0]?.slug ?? existingBySlug[0]?.slug})`
    )
  } else {
    await sql`
      INSERT INTO neon_auth.organization (id, name, slug, "createdAt")
      VALUES (${DEMO_ORG.id}, ${DEMO_ORG.name}, ${DEMO_ORG.slug}, NOW())
    `
    console.log(`  • Created "${DEMO_ORG.name}" (id=${orgId})`)
  }

  console.log("\n[seed-dev-users] Adding members…")

  for (const user of seededUsers) {
    const existing = await sql`
      SELECT id FROM neon_auth.member
      WHERE "organizationId" = ${orgId} AND "userId" = ${user.userId}
      LIMIT 1
    `
    if (existing.length > 0) {
      console.log(`  • ${user.email} → already a member (role=${user.orgRole})`)
    } else {
      const memberId = randomUUID()
      await sql`
        INSERT INTO neon_auth.member (id, "organizationId", "userId", role, "createdAt")
        VALUES (${memberId}, ${orgId}, ${user.userId}, ${user.orgRole}, NOW())
      `
      console.log(`  • ${user.email} → role=${user.orgRole} ✓`)
    }
  }

  // Set the demo-org as the active org on existing sessions
  for (const user of seededUsers) {
    await sql`
      UPDATE neon_auth.session
      SET "activeOrganizationId" = ${orgId}
      WHERE "userId" = ${user.userId}
        AND ("activeOrganizationId" IS NULL OR "activeOrganizationId" != ${orgId})
    `
  }

  console.log(`
[seed-dev-users] ✓ Done!

  Org:   "${DEMO_ORG.name}" (slug: ${DEMO_ORG.slug}, id: ${orgId})
  Users: ${seededUsers.map((u) => u.email).join(", ")}
  Pass:  ${DEV_PASSWORD}

  → Start the dev server (pnpm dev) and click "Dev sign-in" → "Owner" or "ERP"
    The sign-in page will prefill the email — enter the password above.
`)
}

main().catch((err) => {
  console.error("[seed-dev-users]", err)
  process.exit(1)
})
