import { neon } from "@neondatabase/serverless"

export const ORG_SWITCH_E2E_FIXTURE = {
  organizationId: "00000000-0000-4000-8000-00000000f101",
  organizationSlug: "org-switch-target",
  organizationName: "Org Switch Target",
  memberId: "00000000-0000-4000-8000-00000000f102",
} as const

let sql: ReturnType<typeof neon> | null = null

function getSql() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for org switch E2E fixtures.")
  }
  sql ??= neon(databaseUrl)
  return sql
}

export function hasOrgSwitchFixtureDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export async function resetOrgSwitchFixture(): Promise<void> {
  const db = getSql()
  const fixture = ORG_SWITCH_E2E_FIXTURE

  await db`
    DELETE FROM neon_auth.member
    WHERE id = ${fixture.memberId}
       OR "organizationId" = ${fixture.organizationId}
  `
  await db`
    DELETE FROM neon_auth.organization
    WHERE id = ${fixture.organizationId}
  `
}

export async function seedOrgSwitchFixtureForUser(
  email: string
): Promise<void> {
  const db = getSql()
  const fixture = ORG_SWITCH_E2E_FIXTURE

  await resetOrgSwitchFixture()

  const users = (await db`
    SELECT id
    FROM neon_auth."user"
    WHERE email = ${email}
    LIMIT 1
  `) as Array<{ id: string }>
  const userId = users[0]?.id

  if (!userId) {
    throw new Error(`Org switch fixture user not found for ${email}.`)
  }

  await db`
    INSERT INTO neon_auth.organization (id, name, slug, "createdAt")
    VALUES (
      ${fixture.organizationId},
      ${fixture.organizationName},
      ${fixture.organizationSlug},
      NOW()
    )
  `
  await db`
    INSERT INTO neon_auth.member (id, "organizationId", "userId", role, "createdAt")
    VALUES (
      ${fixture.memberId},
      ${fixture.organizationId},
      ${userId},
      'owner',
      NOW()
    )
  `
}
