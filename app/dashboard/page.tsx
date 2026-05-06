import Link from "next/link"

import {
  listCustomersForOrganization,
  type CustomerRow,
} from "#lib/data/customers"
import { requireOrgSession } from "#lib/tenant"
import { AddCustomerForm } from "#components/add-customer-form"
import { SignOutButton } from "#components/sign-out-button"
import { Button } from "#components/ui/button"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const org = await requireOrgSession()
  const rows: CustomerRow[] = await listCustomersForOrganization(
    org.organizationId,
  )

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as {org.user.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SignOutButton />
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="font-medium">Add customer</h2>
        <AddCustomerForm />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Customers</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No customers yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="font-medium">{c.name}</span>
                {c.email ? (
                  <span className="text-muted-foreground text-sm">{c.email}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
