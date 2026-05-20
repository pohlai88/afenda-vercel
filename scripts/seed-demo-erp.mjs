/**
 * Lane B — seeds employee portal + HRM employee row for dev E2E after `pnpm dev:seed`.
 *
 * Idempotent inserts into app-owned tables (not neon_auth).
 *
 * Usage:
 *   pnpm env:sync
 *   pnpm dev:seed
 *   pnpm dev:seed:demo-erp
 *
 * Requires DATABASE_URL in .env.local.
 */

import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL

const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"
const DEMO_ORG_SLUG = "demo-org"
const DEMO_PORTAL_SLUG = "demo-org-employee"
const OWNER_EMAIL = "owner@afenda.com"

const DEMO_PORTAL_ID = "00000000-0000-4000-8000-000000000101"
const DEMO_EMPLOYEE_ID = "00000000-0000-4000-8000-000000000201"
const DEMO_ACCESS_ID = "00000000-0000-4000-8000-000000000301"

if (!DATABASE_URL) {
  console.error(
    "[seed-demo-erp] DATABASE_URL is not set. Run `pnpm env:sync` first."
  )
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
  console.log("[seed-demo-erp] Seeding portal + employee + access…\n")

  const orgRows = await sql`
    SELECT id FROM neon_auth.organization
    WHERE id = ${DEMO_ORG_ID} OR slug = ${DEMO_ORG_SLUG}
    LIMIT 1
  `
  if (orgRows.length === 0) {
    console.error(
      `[seed-demo-erp] Demo org not found. Run \`pnpm dev:seed\` first (${DEMO_ORG_SLUG}).`
    )
    process.exit(1)
  }
  const organizationId = orgRows[0].id

  const ownerRows = await sql`
    SELECT id FROM neon_auth."user" WHERE email = ${OWNER_EMAIL} LIMIT 1
  `
  if (ownerRows.length === 0) {
    console.error(
      `[seed-demo-erp] ${OWNER_EMAIL} not found. Run \`pnpm dev:seed\` first.`
    )
    process.exit(1)
  }
  const ownerUserId = ownerRows[0].id

  const existingPortal = await sql`
    SELECT id, slug FROM organization_portal WHERE slug = ${DEMO_PORTAL_SLUG} LIMIT 1
  `
  if (existingPortal.length > 0) {
    console.log(
      `  • Portal already exists (slug=${existingPortal[0].slug}, id=${existingPortal[0].id})`
    )
  } else {
    await sql`
      INSERT INTO organization_portal (
        id, "organizationId", slug, audience, status, "displayName",
        "createdAt", "updatedAt", "createdByUserId"
      )
      VALUES (
        ${DEMO_PORTAL_ID},
        ${organizationId},
        ${DEMO_PORTAL_SLUG},
        'employee',
        'active',
        'Demo Organization — Employee',
        NOW(),
        NOW(),
        ${ownerUserId}
      )
    `
    console.log(`  • Created portal ${DEMO_PORTAL_SLUG}`)
  }

  const portalId =
    existingPortal[0]?.id ??
    (
      await sql`
        SELECT id FROM organization_portal WHERE slug = ${DEMO_PORTAL_SLUG} LIMIT 1
      `
    )[0].id

  const existingEmployee = await sql`
    SELECT id, "employeeNumber" FROM hrm_employee
    WHERE "organizationId" = ${organizationId}
      AND "employeeNumber" = 'EMP-DEMO-OWNER'
    LIMIT 1
  `
  let employeeId = existingEmployee[0]?.id
  if (employeeId) {
    console.log(
      `  • Employee already exists (${existingEmployee[0].employeeNumber})`
    )
    await sql`
      UPDATE hrm_employee
      SET "linkedUserId" = ${ownerUserId},
          "legalName" = 'Demo Owner',
          "email" = ${OWNER_EMAIL},
          "updatedAt" = NOW()
      WHERE id = ${employeeId}
    `
  } else {
    await sql`
      INSERT INTO hrm_employee (
        id, "organizationId", "employeeNumber", "legalName", email,
        "linkedUserId", "employmentStatus", "createdAt", "updatedAt",
        "createdByUserId"
      )
      VALUES (
        ${DEMO_EMPLOYEE_ID},
        ${organizationId},
        'EMP-DEMO-OWNER',
        'Demo Owner',
        ${OWNER_EMAIL},
        ${ownerUserId},
        'active',
        NOW(),
        NOW(),
        ${ownerUserId}
      )
    `
    employeeId = DEMO_EMPLOYEE_ID
    console.log("  • Created hrm_employee EMP-DEMO-OWNER (linked to owner)")
  }

  const existingAccess = await sql`
    SELECT id FROM organization_portal_access
    WHERE "portalId" = ${portalId}
      AND "userId" = ${ownerUserId}
      AND audience = 'employee'
    LIMIT 1
  `
  if (existingAccess.length > 0) {
    await sql`
      UPDATE organization_portal_access
      SET "subjectId" = ${employeeId},
          status = 'active',
          "updatedAt" = NOW()
      WHERE id = ${existingAccess[0].id}
    `
    console.log("  • Portal access already exists — refreshed subject + active")
  } else {
    await sql`
      INSERT INTO organization_portal_access (
        id, "portalId", "organizationId", "userId", audience, "subjectId",
        status, "createdAt", "updatedAt", "createdByUserId"
      )
      VALUES (
        ${DEMO_ACCESS_ID},
        ${portalId},
        ${organizationId},
        ${ownerUserId},
        'employee',
        ${employeeId},
        'active',
        NOW(),
        NOW(),
        ${ownerUserId}
      )
    `
    console.log("  • Granted owner portal access (employee audience)")
  }

  console.log(`
[seed-demo-erp] ✓ Done!

  Portal:   /en/p/${DEMO_PORTAL_SLUG}/employee/leave
  Requires: pnpm dev on http://localhost:3000 + Dev panel → Owner
`)
}

main().catch((err) => {
  console.error("[seed-demo-erp]", err)
  process.exit(1)
})
