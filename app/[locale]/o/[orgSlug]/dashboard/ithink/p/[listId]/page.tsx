import { notFound } from "next/navigation"

import {
  IThinkShell,
  listIThinkForList,
  listIThinkListsForOrg,
  countIThinkForInbox,
  countIThinkForToday,
  countIThinkForScheduled,
} from "#features/ithink"
import {
  ensureDefaultOneThingListForOrg,
  getOrgOneThingListById,
} from "#features/onething/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrgDashboardIThinkListPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/ithink/p/[listId]">) {
  const { locale: localeRaw, orgSlug, listId } = await params
  ensureAppLocale(localeRaw)

  const { organizationId } = await requireOrgSession()

  const list = await getOrgOneThingListById(organizationId, listId)
  if (!list) notFound()

  const defaultListId = await ensureDefaultOneThingListForOrg(organizationId)

  const [rows, lists, inboxCount, todayCount, scheduledCount] =
    await Promise.all([
      listIThinkForList(list.id, organizationId),
      listIThinkListsForOrg(organizationId),
      countIThinkForInbox(defaultListId, organizationId),
      countIThinkForToday(organizationId),
      countIThinkForScheduled(organizationId),
    ])

  return (
    <IThinkShell
      rows={rows}
      lists={lists}
      defaultListId={defaultListId}
      orgSlug={orgSlug}
      inboxCount={inboxCount}
      todayCount={todayCount}
      scheduledCount={scheduledCount}
    />
  )
}
