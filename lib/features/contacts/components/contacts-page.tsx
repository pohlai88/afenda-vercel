import { getTranslations } from "next-intl/server"

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
  const [rows, t] = await Promise.all([
    listContactsForOrganization(org.organizationId),
    getTranslations("Dashboard.Contacts"),
  ])

  const listConfiguration = buildContactsListSurfaceConfiguration(
    rows,
    {
      eyebrow: t("eyebrow"),
      title: t("directoryTitle"),
      description: t("directoryDescription"),
      empty: t("empty"),
      colName: t("colName"),
      colEmail: t("colEmail"),
      colCreated: t("colCreated"),
      noEmail: t("noEmail"),
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
        title={t("title")}
        description={t("description")}
        eyebrow={t("eyebrow")}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("directoryTitle")}</CardTitle>
          <CardDescription>{t("directoryDescription")}</CardDescription>
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
                title: t("forbiddenTitle"),
                description: t("forbiddenDescription"),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}