import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import type { OrgAdminMemberRow } from "#lib/auth"

import { buildOrgAdminMembersListSurfaceConfiguration } from "../data/org-admin-members-list-surface.server"

import {
  localizeOrgAdminRole,
  OrgAdminRemoveMemberButton,
} from "./organization-admin-member-actions.client"

type OrgAdminMembersListSectionProps = {
  members: readonly OrgAdminMemberRow[]
  currentUserId: string
}

export async function OrgAdminMembersListSection({
  members,
  currentUserId,
}: OrgAdminMembersListSectionProps) {
  const [tList, tInvite] = await Promise.all([
    getTranslations("OrgAdmin.memberList"),
    getTranslations("OrgAdmin.invite"),
  ])

  const listConfiguration = buildOrgAdminMembersListSurfaceConfiguration(
    members,
    {
      empty: "No members.",
      colMember: "Member",
      colEmail: "Email",
      colRole: "Role",
      memberLabel: (member) => member.name ?? member.email,
      roleLabel: (role) => localizeOrgAdminRole(role, tInvite),
    }
  )

  const memberById = new Map(members.map((member) => [member.id, member]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="org-admin:members:directory"
      resolveConfiguredPermission={false}
      trailingColumn={{
        header: "Actions",
        render: (surfaceRow) => {
          const member = memberById.get(surfaceRow.id)
          if (!member) return null
          if (member.userId === currentUserId) {
            return (
              <span className="text-xs text-muted-foreground capitalize">
                {tList("selfBadge", {
                  role: localizeOrgAdminRole(member.role, tInvite),
                })}
              </span>
            )
          }
          return (
            <OrgAdminRemoveMemberButton
              memberId={member.id}
              targetUserId={member.userId}
            />
          )
        },
      }}
    />
  )
}
