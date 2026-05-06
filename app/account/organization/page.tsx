import Link from "next/link"
import { redirect } from "next/navigation"
import { asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { member, organization, user } from "#lib/db/schema"
import { requireOrgSession } from "#lib/tenant"

export default async function AccountOrganizationPage() {
  const { organizationId } = await requireOrgSession()

  const [row] = await db
    .select({
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  if (!row) {
    redirect("/onboarding")
  }

  const members = await db
    .select({
      id: member.id,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(user.email))

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
      <p className="text-lg font-medium">{row.name}</p>
      <p className="text-sm text-muted-foreground">Slug: {row.slug}</p>
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
                <span className="text-xs capitalize text-muted-foreground">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Your ERP data is scoped to this organization. Invitations and member
        management use Better Auth&apos;s organization flows (onboarding and
        future admin tools).
      </p>
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
