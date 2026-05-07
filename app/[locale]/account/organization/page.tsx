import type { Route } from "next"

import { redirect } from "next/navigation"

import { Link } from "#i18n/navigation"
import { and, asc, eq, gt } from "drizzle-orm"

import { canActInOrganization } from "#lib/auth"
import { db } from "#lib/db"
import { invitation, member, organization, user } from "#lib/db/schema"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { OrganizationAdminClient } from "./organization-admin-client"

export default async function AccountOrganizationPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const orgSession = await requireOrgSession()
  const { organizationId, userId } = orgSession

  const [row] = await db
    .select({
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  if (!row) {
    redirect(toLocalePath(locale, "/onboarding") as Route)
  }

  const members = await db
    .select({
      id: member.id,
      userId: member.userId,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(user.email))

  const canAdmin = await canActInOrganization(
    orgSession.userId,
    orgSession.user.role,
    organizationId,
    "admin"
  )

  const pendingInvitations = canAdmin
    ? await db
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, organizationId),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date())
          )
        )
        .orderBy(asc(invitation.email))
    : []

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-lg font-medium">{row.name}</p>
        <p className="text-sm text-muted-foreground">Slug: {row.slug}</p>
      </div>

      {canAdmin ? (
        <p className="text-sm">
          <Link
            href={"/account/organization/audit" as Route}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            View organization audit log
          </Link>
          <span className="text-muted-foreground">
            {" "}
            — invites, membership changes, and other{" "}
            <code className="text-xs">org.*</code> events.
          </span>
        </p>
      ) : null}

      {canAdmin ? (
        <OrganizationAdminClient
          members={members}
          invitations={pendingInvitations}
          currentUserId={userId}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Members</h2>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-0.5 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground">{m.email}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {m.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            Invitations and member management require an organization admin.
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="underline">
          Back to dashboard
        </Link>
        {" · "}
        <Link href="/onboarding" className="underline">
          Onboarding
        </Link>
      </p>
    </div>
  )
}
