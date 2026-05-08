import { getTranslations } from "next-intl/server"

import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"

import { OrgSwitcher } from "./org-switcher"

type Props = {
  userId: string
  currentOrgId: string
}

/**
 * Tier B Server Component slot — owns the listUserOrganizationsForSwitcher
 * fetch and translations so the dashboard layout can stream this independently
 * behind a Suspense boundary without blocking the shell render.
 *
 * Rendered by dashboard/layout.tsx as:
 *   <Suspense fallback={<OrgSwitcherSkeleton />}>
 *     <OrgSwitcherSlot userId={...} currentOrgId={...} />
 *   </Suspense>
 */
export async function OrgSwitcherSlot({ userId, currentOrgId }: Props) {
  const [orgs, t] = await Promise.all([
    listUserOrganizationsForSwitcher(userId),
    getTranslations("Dashboard.shell"),
  ])

  if (orgs.length === 0) return null

  return (
    <OrgSwitcher
      orgs={orgs}
      currentOrgId={currentOrgId}
      labels={{
        trigger: t("orgSwitcher.trigger"),
        search: t("orgSwitcher.search"),
        empty: t("orgSwitcher.empty"),
      }}
    />
  )
}
