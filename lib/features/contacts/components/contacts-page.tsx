import { getTranslations } from "next-intl/server"

import {
  GovernedPatternBListSection,
  ModulePageHeader,
} from "#features/governed-surface"
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

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title={t("title")}
        description={t("description")}
        eyebrow={t("eyebrow")}
      />

      <GovernedPatternBListSection
        title={t("directoryTitle")}
        description={t("directoryDescription")}
        listConfiguration={listConfiguration}
        surfaceKey="contacts:directory"
        cardClassName="mt-0 border-solid border-border"
        headerAction={<AddContactDialog />}
        forbidden={{
          variant: "forbidden",
          title: t("forbiddenTitle"),
          description: t("forbiddenDescription"),
        }}
      />
    </div>
  )
}
