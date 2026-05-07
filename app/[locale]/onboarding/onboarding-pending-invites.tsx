import type { Route } from "next"
import { Link } from "#i18n/navigation"
import { and, asc, eq, gt, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { invitation, organization } from "#lib/db/schema"

export async function OnboardingPendingInvites({
  userEmail,
}: {
  userEmail: string
}) {
  const normalized = userEmail.trim().toLowerCase()
  const rows = await db
    .select({
      id: invitation.id,
      expiresAt: invitation.expiresAt,
      orgName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(
      and(
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
        sql`lower(${invitation.email}) = ${normalized}`
      )
    )
    .orderBy(asc(organization.name))

  if (rows.length === 0) return null

  return (
    <section className="mb-8 w-full max-w-lg rounded-lg border border-border/80 bg-card p-4 shadow-elevation-1">
      <h2 className="text-sm font-semibold tracking-tight">
        Pending invitations
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        You were invited to join an organization. Accept on the next step (you
        must be signed in as {userEmail}).
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="font-medium">{r.orgName}</span>
              <span className="block text-xs text-muted-foreground">
                Expires {r.expiresAt.toLocaleDateString()}
              </span>
            </div>
            <Link
              href={
                `/accept-invitation?invitationId=${encodeURIComponent(r.id)}` as Route
              }
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Review invitation
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
