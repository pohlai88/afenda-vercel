import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthInvitation } from "#lib/db/schema-neon-auth"

export type InvitationGuardOk = {
  ok: true
  organizationId: string
}

export type InvitationGuardErr = { ok: false; error: string }

export type InvitationGuardResult = InvitationGuardOk | InvitationGuardErr

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function assertInvitationForUser(
  invitationId: string,
  userEmail: string
): Promise<InvitationGuardResult> {
  const want = normalizeEmail(userEmail)
  const [row] = await db
    .select({
      organizationId: neonAuthInvitation.organizationId,
      email: neonAuthInvitation.email,
      status: neonAuthInvitation.status,
      expiresAt: neonAuthInvitation.expiresAt,
    })
    .from(neonAuthInvitation)
    .where(eq(neonAuthInvitation.id, invitationId))
    .limit(1)

  if (!row) {
    return { ok: false, error: "Invitation not found." }
  }
  if (row.status !== "pending") {
    return { ok: false, error: "This invitation is no longer valid." }
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "This invitation has expired." }
  }
  if (normalizeEmail(row.email) !== want) {
    return {
      ok: false,
      error:
        "This invitation was sent to a different email address. Sign in with that account.",
    }
  }
  return { ok: true, organizationId: row.organizationId }
}
