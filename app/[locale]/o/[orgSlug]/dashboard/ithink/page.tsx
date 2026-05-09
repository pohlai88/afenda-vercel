import {
  IThinkShell,
  listIThinkForList,
  listIThinkListsForOrg,
} from "#features/ithink"
import { ensureDefaultOneThingListForOrg } from "#features/onething/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrgDashboardIThinkPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/ithink">) {
  const { locale: localeRaw } = await params
  ensureAppLocale(localeRaw)

  const { organizationId } = await requireOrgSession()

  const [defaultListId, lists] = await Promise.all([
    ensureDefaultOneThingListForOrg(organizationId),
    listIThinkListsForOrg(organizationId),
  ])
  const rows = await listIThinkForList(defaultListId, organizationId)

  return <IThinkShell rows={rows} lists={lists} defaultListId={defaultListId} />
}
