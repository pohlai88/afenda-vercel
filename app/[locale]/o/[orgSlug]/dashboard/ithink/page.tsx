import {
  IThinkShell,
  countIThinkForInbox,
  countIThinkForScheduled,
  countIThinkForToday,
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
  const { locale: localeRaw, orgSlug } = await params
  ensureAppLocale(localeRaw)

  const { organizationId } = await requireOrgSession()

  const defaultListId = await ensureDefaultOneThingListForOrg(organizationId)

  const [rows, lists, todayCount, scheduledCount, inboxCount] =
    await Promise.all([
      listIThinkForList(defaultListId, organizationId),
      listIThinkListsForOrg(organizationId),
      countIThinkForToday(organizationId),
      countIThinkForScheduled(organizationId),
      countIThinkForInbox(defaultListId, organizationId),
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
