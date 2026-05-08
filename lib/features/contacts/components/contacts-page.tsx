import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { ModulePageHeader } from "#components/dashboard/module-page-header"
import { requireOrgSession } from "#lib/tenant"

import { listContactsForOrganization } from "../data/contacts.queries"
import type { ContactRow } from "../types"
import { AddContactDialog } from "./add-contact-dialog"
import { ContactsListPanel } from "./contacts-list-panel"

export async function ContactsPage() {
  const org = await requireOrgSession()
  const rows: ContactRow[] = await listContactsForOrganization(
    org.organizationId
  )

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title="Contacts"
        description="Manage customers, suppliers, and partner records."
        eyebrow="CRM"
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            Search and open contact records. Click any row to view details.
          </CardDescription>
          <CardAction>
            <AddContactDialog />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ContactsListPanel rows={rows} />
        </CardContent>
      </Card>
    </div>
  )
}
