import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"

import { CommandPalette } from "./command-palette"

type Props = {
  userId: string
  currentOrgId: string
  orgSlug: string
  showOrgAdminLink: boolean
}

/**
 * Tier B Server Component slot — owns the listUserOrganizationsForSwitcher
 * fetch for the command palette so the dashboard shell can stream this
 * independently behind a Suspense boundary (same pattern as OrgSwitcherSlot).
 *
 * React.cache deduplicates this call with OrgSwitcherSlot on the same request.
 */
export async function CommandPaletteSlot({
  userId,
  currentOrgId,
  orgSlug,
  showOrgAdminLink,
}: Props) {
  const userOrgs = await listUserOrganizationsForSwitcher(userId)

  return (
    <CommandPalette
      orgSlug={orgSlug}
      userOrgs={userOrgs}
      currentOrgId={currentOrgId}
      showOrgAdminLink={showOrgAdminLink}
    />
  )
}
