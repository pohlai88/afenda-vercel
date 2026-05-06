import { ModulePageHeader } from "#components/dashboard/module-page-header"
import { requireOrgSession } from "#lib/tenant"

import { listContactsForOrganization } from "../data/contacts.queries"
import type { ContactRow } from "../types"
import { AddContactForm } from "./add-contact-form"
import { ContactsListPanel } from "./contacts-list-panel"

export async function ContactsPage() {
  const org = await requireOrgSession()
  const rows: ContactRow[] = await listContactsForOrganization(org.organizationId)

  return (
    <div className="space-y-8">
      <ModulePageHeader
        title="Contacts"
        description="Manage customers, suppliers, and partner records."
        eyebrow="CRM"
      />
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">Add contact</h2>
        <AddContactForm />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Contacts</h2>
        <ContactsListPanel rows={rows} />
      </section>
    </div>
  )
}
