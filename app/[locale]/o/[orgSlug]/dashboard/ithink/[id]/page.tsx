import { Suspense } from "react"
import { notFound } from "next/navigation"

import {
  IThinkShell,
  IThinkSubtasksSection,
  SubtasksSkeleton,
  IThinkCommentsSection,
  CommentsSkeleton,
  IThinkAttachmentsSection,
  AttachmentsSkeleton,
  getIThinkById,
  listIThinkForList,
  listIThinkListsForOrg,
  countIThinkForToday,
  countIThinkForScheduled,
} from "#features/ithink"
import { ensureDefaultOneThingListForOrg } from "#features/onething/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrgDashboardIThinkTaskPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/ithink/[id]">) {
  const { locale: localeRaw, orgSlug, id } = await params
  ensureAppLocale(localeRaw)

  const { organizationId } = await requireOrgSession()

  const task = await getIThinkById(id, organizationId)
  if (!task) notFound()

  const [defaultListId, lists] = await Promise.all([
    ensureDefaultOneThingListForOrg(organizationId),
    listIThinkListsForOrg(organizationId),
  ])

  const [rows, todayCount, scheduledCount] = await Promise.all([
    listIThinkForList(task.listId ?? defaultListId, organizationId),
    countIThinkForToday(organizationId),
    countIThinkForScheduled(organizationId),
  ])

  const contextPanel = (
    <div className="mt-4 flex flex-col gap-4">
      <Suspense fallback={<SubtasksSkeleton />}>
        <IThinkSubtasksSection
          oneThingId={id}
          organizationId={organizationId}
        />
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <IThinkCommentsSection oneThingId={id} />
      </Suspense>
      <Suspense fallback={<AttachmentsSkeleton />}>
        <IThinkAttachmentsSection oneThingId={id} />
      </Suspense>
    </div>
  )

  return (
    <IThinkShell
      rows={rows}
      lists={lists}
      defaultListId={defaultListId}
      orgSlug={orgSlug}
      inboxCount={rows.length}
      todayCount={todayCount}
      scheduledCount={scheduledCount}
      initialSelectedId={id}
      contextPanel={contextPanel}
    />
  )
}
