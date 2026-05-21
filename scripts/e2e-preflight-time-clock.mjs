#!/usr/bin/env node
/**
 * Fast local checks for HRM time-clock E2E (seconds, not full Playwright).
 * Usage: node scripts/with-env.mjs node scripts/e2e-preflight-time-clock.mjs
 */
import { neon } from "@neondatabase/serverless"

const BASE =
  process.env.PLAYWRIGHT_BASE_URL?.trim() ||
  process.env.E2E_PREFLIGHT_BASE_URL?.trim() ||
  "http://127.0.0.1:3001"

const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"
const DEMO_ORG_SLUG = "demo-org"
const E2E_ROLE_ID = "00000000-0000-4000-8000-000000000e01"

const email =
  process.env.E2E_ORG_ADMIN_EMAIL?.trim() || "owner@afenda.com"
const password =
  process.env.E2E_ORG_ADMIN_PASSWORD?.trim() || "123qweasdzxc!@#"

function fail(step, detail) {
  console.error(`[preflight] FAIL ${step}: ${detail}`)
  process.exit(1)
}

function ok(step, detail = "") {
  console.log(`[preflight] OK ${step}${detail ? ` — ${detail}` : ""}`)
}

async function main() {
  console.log(`[preflight] base=${BASE}`)

  try {
    const health = await fetch(`${BASE}/api/auth/health`, {
      signal: AbortSignal.timeout(90_000),
    })
    if (!health.ok) fail("health", `HTTP ${health.status}`)
    ok("health", String(health.status))
  } catch (error) {
    fail(
      "health",
      `${error instanceof Error ? error.message : String(error)} (start: pnpm exec next dev --turbopack -p 3001 with BETTER_AUTH_URL=${BASE})`
    )
  }

  const jar = new Map()
  const signIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      callbackURL: `/en/o/${DEMO_ORG_SLUG}/nexus`,
    }),
    signal: AbortSignal.timeout(30_000),
  })
  for (const cookie of signIn.headers.getSetCookie?.() ?? []) {
    const name = cookie.split("=")[0]
    jar.set(name, cookie)
  }
  if (!signIn.ok) fail("sign-in", await signIn.text())
  ok("sign-in", String(signIn.status))

  const cookieHeader = [...jar.values()].join("; ")
  const sessionRes = await fetch(
    `${BASE}/api/auth/get-session?disableCookieCache=true`,
    {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      signal: AbortSignal.timeout(10_000),
    }
  )
  const sessionJson = await sessionRes.json().catch(() => null)
  const sessionId = sessionJson?.session?.id
  if (!sessionRes.ok || !sessionId) {
    fail("get-session", `status=${sessionRes.status} body=${JSON.stringify(sessionJson)}`)
  }
  ok("get-session", sessionId)

  if (!process.env.DATABASE_URL) {
    console.warn("[preflight] SKIP db-active-org — DATABASE_URL unset")
  } else {
    const sql = neon(process.env.DATABASE_URL)
    await sql`
      UPDATE neon_auth.session
      SET "activeOrganizationId" = ${DEMO_ORG_ID}
      WHERE id = ${sessionId}
    `
    ok("db-active-org", DEMO_ORG_SLUG)
  }

  if (!process.env.DATABASE_URL) {
    console.warn("[preflight] SKIP erp-permissions — DATABASE_URL unset")
  } else {
    const sql = neon(process.env.DATABASE_URL)
    const userRows = await sql`
      SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1
    `
    const userId = userRows[0]?.id
    if (!userId) fail("erp-permissions", `no user for ${email}`)

    await sql`
      INSERT INTO erp_role (id, "organizationId", name, status, "createdAt", "updatedAt")
      VALUES (${E2E_ROLE_ID}, ${DEMO_ORG_ID}, 'E2E Time clock', 'active', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET status = 'active', "updatedAt" = NOW()
    `
    for (const [module, object, fn] of [
      ["hrm", "time_clock", "search"],
      ["hrm", "time_clock", "read"],
      ["hrm", "time_clock_device", "update"],
      ["hrm", "time_clock_mapping", "update"],
      ["hrm", "time_clock_punch", "create"],
      ["hrm", "time_clock_punch", "update"],
    ]) {
      await sql`
        INSERT INTO erp_role_permission (
          id, "organizationId", "roleId", module, object, function, status, "createdAt", "updatedAt"
        )
        VALUES (gen_random_uuid(), ${DEMO_ORG_ID}, ${E2E_ROLE_ID}, ${module}, ${object}, ${fn}, 'active', NOW(), NOW())
        ON CONFLICT ("roleId", module, object, function)
        DO UPDATE SET status = 'active', "updatedAt" = NOW()
      `
    }
    await sql`
      INSERT INTO erp_role_member (
        id, "organizationId", "roleId", "userId", status, "createdAt", "updatedAt"
      )
      VALUES (gen_random_uuid(), ${DEMO_ORG_ID}, ${E2E_ROLE_ID}, ${userId}, 'active', NOW(), NOW())
      ON CONFLICT ("roleId", "userId")
      DO UPDATE SET status = 'active', "updatedAt" = NOW()
    `

    const keys = await sql`
      SELECT DISTINCT p.module, p.object, p.function
      FROM erp_role_permission p
      INNER JOIN erp_role_member m ON m."roleId" = p."roleId"
      WHERE m."userId" = ${userId}
        AND m."organizationId" = ${DEMO_ORG_ID}
        AND p.module = 'hrm'
        AND p.object LIKE 'time_clock%'
        AND p.status = 'active'
    `
    if (keys.length < 3) {
      fail(
        "erp-permissions",
        `only ${keys.length} time_clock grants — run ensureTimeClockE2ePermissions`
      )
    }
    ok("erp-permissions", `${keys.length} grants`)

    const employeeRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM hrm_employee
      WHERE "organizationId" = ${DEMO_ORG_ID}
        AND "archivedAt" IS NULL
    `
    const employeeCount = employeeRows[0]?.count ?? 0
    if (employeeCount < 1) {
      const ownerRows = await sql`
        SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1
      `
      const ownerUserId = ownerRows[0]?.id
      if (!ownerUserId) {
        fail("hrm-employee", `no user for ${email} — run pnpm dev:seed`)
      }
      await sql`
        INSERT INTO hrm_employee (
          id, "organizationId", "employeeNumber", "legalName", email,
          "linkedUserId", "employmentStatus", "createdAt", "updatedAt",
          "createdByUserId"
        )
        VALUES (
          '00000000-0000-4000-8000-000000000201',
          ${DEMO_ORG_ID},
          'EMP-DEMO-OWNER',
          'Demo Owner',
          ${email},
          ${ownerUserId},
          'active',
          NOW(),
          NOW(),
          ${ownerUserId}
        )
        ON CONFLICT (id) DO UPDATE SET
          "archivedAt" = NULL,
          "employmentStatus" = 'active',
          "updatedAt" = NOW()
      `
      ok("hrm-employee", "seeded EMP-DEMO-OWNER")
    } else {
      ok("hrm-employee", `${employeeCount} active`)
    }
  }

  const pageRes = await fetch(
    `${BASE}/en/o/${DEMO_ORG_SLUG}/apps/hrm/time-clock`,
    {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    }
  )
  if (pageRes.status >= 400) {
    fail("time-clock-route", `HTTP ${pageRes.status}`)
  }
  ok("time-clock-route", `HTTP ${pageRes.status}`)

  const ingestProbe = await fetch(
    `${BASE}/api/erp/hrm/time-clock/ingest`,
    {
      method: "POST",
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        organizationId: DEMO_ORG_ID,
        sourceKind: "api",
        punches: [
          {
            externalDeviceId: "preflight-probe-device",
            clockUserId: "preflight-probe-user",
            eventType: "clock_in",
            occurredAtIso: new Date().toISOString(),
            sourceRef: `preflight-${Date.now()}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    }
  )
  const ingestText = await ingestProbe.text()
  if (ingestProbe.status === 401) {
    fail(
      "ingest-session",
      `${ingestText} — restart dev on ${BASE} with BETTER_AUTH_URL=${BASE} after auth changes`
    )
  }
  if (!ingestProbe.ok) {
    console.warn(
      `[preflight] WARN ingest-session HTTP ${ingestProbe.status} — ${ingestText.slice(0, 200)} (mapping/device may be missing; not a hard fail)`
    )
  } else {
    ok("ingest-session", `HTTP ${ingestProbe.status}`)
  }

  console.log("[preflight] All checks passed — safe to run one Playwright test.")
}

main().catch((error) => {
  fail("unhandled", error instanceof Error ? error.message : String(error))
})
