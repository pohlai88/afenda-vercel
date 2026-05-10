import {
  IThinkShell,
  listIThinkForScheduled,
  listIThinkListsForOrg,
  countIThinkForInbox,
  countIThinkForToday,
} from "#features/ithink"
import { ensureDefaultOneThingListForOrg } from "#features/onething/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrgDashboardIThinkScheduledPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/ithink/scheduled">) {
  const { locale: localeRaw, orgSlug } = await params
  ensureAppLocale(localeRaw)

  const { organizationId } = await requireOrgSession()

  const defaultListId = await ensureDefaultOneThingListForOrg(organizationId)

  const [rows, lists, inboxCount, todayCount] = await Promise.all([
    listIThinkForScheduled(organizationId),
    listIThinkListsForOrg(organizationId),
    countIThinkForInbox(defaultListId, organizationId),
    countIThinkForToday(organizationId),
  ])

  return (
    <IThinkShell
      rows={rows}
      lists={lists}
      defaultListId={defaultListId}
      orgSlug={orgSlug}
      inboxCount={inboxCount}
      todayCount={todayCount}
      scheduledCount={rows.length}
    />
  )
}
