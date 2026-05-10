import type { Route } from "next"
import { getTranslations } from "next-intl/server"
import { and, asc, eq, gt, sql } from "drizzle-orm"

import { Link } from "#i18n/navigation"
import { db } from "#lib/db"
import {
  neonAuthInvitation,
  neonAuthOrganization,
} from "#lib/db/schema-neon-auth"

/**
 * Pending org invitations for the signed-in email — rendered in the no-org console bay.
 */
export async function ConsolePendingInvites({
  userEmail,
}: {
  userEmail: string
}) {
  const normalized = userEmail.trim().toLowerCase()
  const rows = await db
    .select({
      id: neonAuthInvitation.id,
      expiresAt: neonAuthInvitation.expiresAt,
      orgName: neonAuthOrganization.name,
    })
    .from(neonAuthInvitation)
    .innerJoin(
      neonAuthOrganization,
      eq(neonAuthInvitation.organizationId, neonAuthOrganization.id)
    )
    .where(
      and(
        eq(neonAuthInvitation.status, "pending"),
        gt(neonAuthInvitation.expiresAt, new Date()),
        sql`lower(${neonAuthInvitation.email}) = ${normalized}`
      )
    )
    .orderBy(asc(neonAuthOrganization.name))

  if (rows.length === 0) return null

  const t = await getTranslations("Console.bootstrap.invites")

  return (
    <section className="mb-8 w-full max-w-lg rounded-lg border border-border/80 bg-card p-4 shadow-elevation-1">
      <h2 className="text-sm font-semibold tracking-tight">{t("title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("subtitle", { email: userEmail })}
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
                {t("expires", {
                  date: r.expiresAt.toLocaleDateString(),
                })}
              </span>
            </div>
            <Link
              href={
                `/accept-invitation?invitationId=${encodeURIComponent(r.id)}` as Route
              }
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("review")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
