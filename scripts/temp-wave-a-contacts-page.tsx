import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedComponentRenderer } from "#components2/metadata"
import { GovernedEmpty, ModulePageHeader } from "#features/governed-surface"
import { resolveGovernedErpPermissionAllowed } from "#features/governed-surface/server"
import { requireOrgSession } from "#lib/auth"

import { buildContactsListSurfaceConfiguration } from "../data/contacts-surface-builders.server"
import { listContactsForOrganization } from "../data/contacts.queries"
import { AddContactDialog } from "./add-contact-dialog"

export async function ContactsPage() {
  const org = await requireOrgSession()
  const rows = await listContactsForOrganization(org.organizationId)

  const listConfiguration = buildContactsListSurfaceConfiguration(
    rows,
    {
      eyebrow: "CRM",
      title: "Directory",
      description: "Search and open contact records.",
      empty: "No contacts yet. Add your first contact to get started.",
      colName: "Name",
      colEmail: "Email",
      colCreated: "Created",
      noEmail: "—",
    },
    {
      requiresErpPermission: {
        module: "contacts",
        object: "record",
        function: "read",
      },
    }
  )

  const canRead = await resolveGovernedErpPermissionAllowed(
    listConfiguration.requiresErpPermission
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
        <CardContent>
          {canRead ? (
            <GovernedComponentRenderer
              component={{
                type: "governed:list-surface",
                serverType: "governed:list-surface",
                configuration: listConfiguration,
              }}
              surfaceKey="contacts:directory"
            />
          ) : (
            <GovernedEmpty
              model={{
                variant: "forbidden",
                title: "Contacts unavailable",
                description:
                  "You do not have permission to view the contact directory.",
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
