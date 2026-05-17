import { ContactsPage } from "#features/contacts"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"


export default async function OrgDashboardContactsPage() {
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
