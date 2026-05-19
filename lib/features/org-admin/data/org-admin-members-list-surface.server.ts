import "server-only"

import type {
  OrgAdminInvitationRow,
  OrgAdminMemberRow,
} from "../types"
import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type OrgAdminPendingInvitationsListCopy = {
  empty: string
  colEmail: string
  colMeta: string
  formatMeta: (invitation: OrgAdminInvitationRow) => string
}

export function buildOrgAdminPendingInvitationsListSurfaceConfiguration(
  invitations: readonly OrgAdminInvitationRow[],
  copy: OrgAdminPendingInvitationsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "org-admin-pending-invitations" },
      columnsId: "org-admin-pending-invitations",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "email", header: copy.colEmail },
      { id: "meta", header: copy.colMeta },
    ],
    rows: invitations.map((invitation) => ({
      id: invitation.id,
      cells: {
        email: invitation.email,
        meta: copy.formatMeta(invitation),
      },
      trailingAction: { state: "ready" as const },
    })),
  }
}

type OrgAdminMembersListCopy = {
  empty: string
  colMember: string
  colEmail: string
  colRole: string
  memberLabel: (member: OrgAdminMemberRow) => string
  roleLabel: (role: string) => string
}

export function buildOrgAdminMembersListSurfaceConfiguration(
  members: readonly OrgAdminMemberRow[],
  copy: OrgAdminMembersListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "org-admin-members" },
      columnsId: "org-admin-members",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "member", header: copy.colMember },
      { id: "email", header: copy.colEmail },
      {
        id: "role",
        header: copy.colRole,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: members.map((member) => ({
      id: member.id,
      cells: {
        member: copy.memberLabel(member),
        email: member.email,
        role: copy.roleLabel(member.role),
      },
      trailingAction: { state: "ready" as const },
    })),
  }
}
