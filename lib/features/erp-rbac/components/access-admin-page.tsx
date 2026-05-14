import {
  listAccessMembersForOrganization,
  listErpRoleMembers,
  listErpRolePermissions,
  listErpRoles,
  listTenantAuthorityAssignments,
} from "../server"
import { AccessAdminClient } from "./access-admin-client"

export async function AccessAdminPage({
  organizationId,
}: {
  organizationId: string
}) {
  const [members, authorities, roles, roleMembers, rolePermissions] =
    await Promise.all([
      listAccessMembersForOrganization({ organizationId }),
      listTenantAuthorityAssignments({ organizationId }),
      listErpRoles({ organizationId }),
      listErpRoleMembers({ organizationId }),
      listErpRolePermissions({ organizationId }),
    ])

  return (
    <AccessAdminClient
      members={members}
      authorities={authorities}
      roles={roles}
      roleMembers={roleMembers}
      rolePermissions={rolePermissions}
    />
  )
}
