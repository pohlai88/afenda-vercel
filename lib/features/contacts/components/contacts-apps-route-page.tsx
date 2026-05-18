import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import { ContactsPage } from "./contacts-page"

/** `/apps/contacts` — RBAC gate + governed contacts workbench (ADR-0026). */
export async function ContactsAppsRoutePage() {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "contacts",
    object: "record",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Contacts"
        description="This surface requires an ERP role with Contacts search access."
      />
    )
  }
  return <ContactsPage />
}
