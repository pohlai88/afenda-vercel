import { neon } from "@neondatabase/serverless"

import { BOOTSTRAP_FIXTURE } from "../../fixtures/bootstrap-mocks"

/** Stable id so Playwright runs can upsert the same ERP role. */
const E2E_TIME_CLOCK_ROLE_ID = "00000000-0000-4000-8000-000000000e01"

/** Aligns with `scripts/seed-demo-erp.mjs` — one active employee for mapping UI. */
const E2E_DEMO_EMPLOYEE_ID = "00000000-0000-4000-8000-000000000201"
const E2E_DEMO_EMPLOYEE_NUMBER = "EMP-DEMO-OWNER"

type NeonUserIdRow = {
  id: string
}

const TIME_CLOCK_E2E_PERMISSIONS = [
  { module: "hrm", object: "time_clock", function: "search" },
  { module: "hrm", object: "time_clock", function: "read" },
  { module: "hrm", object: "time_clock_device", function: "update" },
  { module: "hrm", object: "time_clock_mapping", function: "update" },
  { module: "hrm", object: "time_clock_punch", function: "create" },
  { module: "hrm", object: "time_clock_punch", function: "update" },
  { module: "hrm", object: "time_clock", function: "audit" },
  { module: "hrm", object: "attendance", function: "update" },
] as const

let sql: ReturnType<typeof neon> | null = null

/**
 * Grants demo-org ERP permissions required by `hrm-time-clock-flow.spec.ts`.
 * No-op when DATABASE_URL is unset (specs should skip mutation paths).
 */
export async function ensureTimeClockE2ePermissions(
  email: string
): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return

  sql ??= neon(databaseUrl)

  const organizationId = BOOTSTRAP_FIXTURE.organization.id

  const userRows = (await sql`
    SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1
  `) as NeonUserIdRow[]
  const userId = userRows[0]?.id
  if (!userId) return

  await sql`
    INSERT INTO erp_role (
      id, "organizationId", name, description, status, "createdAt", "updatedAt"
    )
    VALUES (
      ${E2E_TIME_CLOCK_ROLE_ID},
      ${organizationId},
      'E2E Time clock',
      'Playwright HRM time clock integration',
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      status = 'active',
      "updatedAt" = NOW()
  `

  for (const permission of TIME_CLOCK_E2E_PERMISSIONS) {
    await sql`
      INSERT INTO erp_role_permission (
        id,
        "organizationId",
        "roleId",
        module,
        object,
        function,
        status,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        ${organizationId},
        ${E2E_TIME_CLOCK_ROLE_ID},
        ${permission.module},
        ${permission.object},
        ${permission.function},
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT ("roleId", module, object, function)
      DO UPDATE SET status = 'active', "updatedAt" = NOW()
    `
  }

  await grantTimeClockRoleMember(sql, organizationId, userId)
  await ensureTimeClockE2eEmployee(sql, organizationId, userId, email)
}

/**
 * Ensures demo-org has at least one non-archived `hrm_employee` for mapping selects.
 * Mirrors `pnpm dev:seed:demo-erp` without portal rows.
 */
export async function ensureTimeClockE2eEmployee(
  sqlArg?: ReturnType<typeof neon>,
  organizationId: string = BOOTSTRAP_FIXTURE.organization.id,
  linkedUserId?: string,
  email: string = BOOTSTRAP_FIXTURE.members[0].email
): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return

  const sql = sqlArg ?? neon(databaseUrl)

  let userId = linkedUserId
  if (!userId) {
    const userRows = (await sql`
      SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1
    `) as NeonUserIdRow[]
    userId = userRows[0]?.id
  }
  if (!userId) return

  const existing = (await sql`
    SELECT id FROM hrm_employee
    WHERE "organizationId" = ${organizationId}
      AND "employeeNumber" = ${E2E_DEMO_EMPLOYEE_NUMBER}
    LIMIT 1
  `) as NeonUserIdRow[]
  if (existing[0]?.id) {
    await sql`
      UPDATE hrm_employee
      SET "linkedUserId" = ${userId},
          "legalName" = 'Demo Owner',
          email = ${email},
          "archivedAt" = NULL,
          "employmentStatus" = 'active',
          "updatedAt" = NOW()
      WHERE id = ${existing[0].id}
    `
    return
  }

  await sql`
    INSERT INTO hrm_employee (
      id, "organizationId", "employeeNumber", "legalName", email,
      "linkedUserId", "employmentStatus", "createdAt", "updatedAt",
      "createdByUserId"
    )
    VALUES (
      ${E2E_DEMO_EMPLOYEE_ID},
      ${organizationId},
      ${E2E_DEMO_EMPLOYEE_NUMBER},
      'Demo Owner',
      ${email},
      ${userId},
      'active',
      NOW(),
      NOW(),
      ${userId}
    )
    ON CONFLICT (id) DO UPDATE SET
      "archivedAt" = NULL,
      "employmentStatus" = 'active',
      "updatedAt" = NOW()
  `
}

async function grantTimeClockRoleMember(
  sql: ReturnType<typeof neon>,
  organizationId: string,
  userId: string
): Promise<void> {
  await sql`
    INSERT INTO erp_role_member (
      id,
      "organizationId",
      "roleId",
      "userId",
      status,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      ${organizationId},
      ${E2E_TIME_CLOCK_ROLE_ID},
      ${userId},
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT ("roleId", "userId")
    DO UPDATE SET status = 'active', "updatedAt" = NOW()
  `
}
