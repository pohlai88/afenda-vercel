import {
  IThinkShell,
  listIThinkForToday,
  listIThinkListsForOrg,
  countIThinkForInbox,
  countIThinkForScheduled,
} from "#features/ithink"
import { ensureDefaultOneThingListForOrg } from "#features/onething/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrgDashboardIThinkTodayPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/ithink/today">) {
  const { locale: localeRaw, orgSlug } = await params
  ensureAppLocale(localeRaw)

  const { organizationId } = await requireOrgSession()

  const defaultListId = await ensureDefaultOneThingListForOrg(organizationId)

  const [rows, lists, inboxCount, scheduledCount] = await Promise.all([
    listIThinkForToday(organizationId),
    listIThinkListsForOrg(organizationId),
    countIThinkForInbox(defaultListId, organizationId),
    countIThinkForScheduled(organizationId),
  ])

  return (
    <IThinkShell
      rows={rows}
      lists={lists}
      defaultListId={defaultListId}
      orgSlug={orgSlug}
      inboxCount={inboxCount}
      todayCount={rows.length}
      scheduledCount={scheduledCount}
    />
  )
}
