import type {
  PlannerEvidenceGraph,
  PlannerEvidenceGraphNode,
  PlannerItemDetail,
  PlannerLinkDetail,
  PlannerSessionDetail,
  PlannerSignalDetail,
} from "../types"

type ItemEvidenceInput = Omit<PlannerItemDetail, "evidenceGraph">
type SignalEvidenceInput = Omit<PlannerSignalDetail, "evidenceGraph">
type SessionEvidenceInput = Omit<PlannerSessionDetail, "evidenceGraph">
type LinkEvidenceInput = Omit<PlannerLinkDetail, "evidenceGraph">

export function buildPlannerItemEvidenceGraph(
  detail: ItemEvidenceInput
): PlannerEvidenceGraph {
  return createPlannerEvidenceGraph(
    [
      ...detail.links.map((link) =>
        evidenceNode({
          id: `link:${link.id}`,
          kind: "erp_link",
          label: link.displayLabel,
          description:
            link.causalityReason ?? `${link.module}/${link.entityType}`,
          occurredAt: link.createdAt,
          href: link.href,
        })
      ),
      ...detail.relations.map((relation) =>
        evidenceNode({
          id: `relation:${relation.id}`,
          kind: "relation",
          label: relation.relationType,
          description:
            relation.relatedItemTitle ??
            relation.relatedSignalTitle ??
            relation.relatedItemId ??
            relation.relatedSignalId,
          occurredAt: relation.createdAt,
        })
      ),
      ...detail.comments.map((comment) =>
        evidenceNode({
          id: `comment:${comment.id}`,
          kind: "comment",
          label: "Operator comment",
          description: comment.body,
          occurredAt: comment.createdAt,
        })
      ),
      ...detail.attachments.map((attachment) =>
        evidenceNode({
          id: `attachment:${attachment.id}`,
          kind: "attachment",
          label: attachment.mimeType,
          description: attachment.contentSha256,
          occurredAt: attachment.createdAt,
          href: attachment.url,
        })
      ),
      ...detail.sessions.map((session) =>
        evidenceNode({
          id: `session:${session.id}`,
          kind: "session",
          label: session.status,
          description: session.summary ?? session.itemTitle,
          occurredAt: session.startedAt,
        })
      ),
      ...detail.activity.map((activity) =>
        evidenceNode({
          id: `activity:${activity.id}`,
          kind: "activity",
          label: activity.activityType,
          description: activity.body,
          occurredAt: activity.createdAt,
        })
      ),
      ...[...detail.notices, ...detail.noticeHistory].map((notice) =>
        evidenceNode({
          id: `notice:${notice.id}`,
          kind: "notice",
          label: notice.title,
          description: notice.body,
          occurredAt: toDateOrNull(notice.publishedAt),
          href: notice.linkedPath,
        })
      ),
    ],
    {
      linkCount: detail.links.length,
      relationCount: detail.relations.length,
      activityCount: detail.activity.length,
      attachmentCount: detail.attachments.length,
      sessionCount: detail.sessions.length,
      noticeCount: detail.notices.length + detail.noticeHistory.length,
    }
  )
}

export function buildPlannerSignalEvidenceGraph(
  detail: SignalEvidenceInput
): PlannerEvidenceGraph {
  return createPlannerEvidenceGraph(
    [
      ...detail.links.map((link) =>
        evidenceNode({
          id: `link:${link.id}`,
          kind: "erp_link",
          label: link.displayLabel,
          description:
            link.causalityReason ?? `${link.module}/${link.entityType}`,
          occurredAt: link.createdAt,
          href: link.href,
        })
      ),
      ...detail.relatedItems.map((relation) =>
        evidenceNode({
          id: `relation:${relation.id}`,
          kind: "relation",
          label: relation.relationType,
          description:
            relation.relatedItemTitle ??
            relation.relatedSignalTitle ??
            relation.relatedItemId ??
            relation.relatedSignalId,
          occurredAt: relation.createdAt,
        })
      ),
      ...detail.activity.map((activity) =>
        evidenceNode({
          id: `activity:${activity.id}`,
          kind: "activity",
          label: activity.activityType,
          description: activity.body,
          occurredAt: activity.createdAt,
        })
      ),
    ],
    {
      linkCount: detail.links.length,
      relationCount: detail.relatedItems.length,
      activityCount: detail.activity.length,
      attachmentCount: 0,
      sessionCount: 0,
      noticeCount: 0,
    }
  )
}

export function buildPlannerSessionEvidenceGraph(
  detail: SessionEvidenceInput
): PlannerEvidenceGraph {
  const linkedItem = detail.item
    ? [
        evidenceNode({
          id: `item:${detail.item.id}`,
          kind: "item",
          label: detail.item.title,
          description: detail.item.description,
          occurredAt: detail.item.updatedAt,
        }),
      ]
    : []

  return createPlannerEvidenceGraph(
    [
      ...linkedItem,
      ...detail.links.map((link) =>
        evidenceNode({
          id: `link:${link.id}`,
          kind: "erp_link",
          label: link.displayLabel,
          description:
            link.causalityReason ?? `${link.module}/${link.entityType}`,
          occurredAt: link.createdAt,
          href: link.href,
        })
      ),
      ...detail.activity.map((activity) =>
        evidenceNode({
          id: `activity:${activity.id}`,
          kind: "activity",
          label: activity.activityType,
          description: activity.body,
          occurredAt: activity.createdAt,
        })
      ),
    ],
    {
      linkCount: detail.links.length,
      relationCount: 0,
      activityCount: detail.activity.length,
      attachmentCount: 0,
      sessionCount: 1,
      noticeCount: 0,
    }
  )
}

export function buildPlannerLinkEvidenceGraph(
  detail: LinkEvidenceInput
): PlannerEvidenceGraph {
  const linkedItem = detail.item
    ? [
        evidenceNode({
          id: `item:${detail.item.id}`,
          kind: "item",
          label: detail.item.title,
          description: detail.item.description,
          occurredAt: detail.item.updatedAt,
        }),
      ]
    : []
  const linkedSignal = detail.signal
    ? [
        evidenceNode({
          id: `signal:${detail.signal.id}`,
          kind: "signal",
          label: detail.signal.title,
          description: detail.signal.description,
          occurredAt: detail.signal.detectedAt,
        }),
      ]
    : []

  return createPlannerEvidenceGraph(
    [
      evidenceNode({
        id: `link:${detail.id}`,
        kind: "erp_link",
        label: detail.displayLabel,
        description:
          detail.causalityReason ?? `${detail.module}/${detail.entityType}`,
        occurredAt: detail.createdAt,
        href: detail.href,
      }),
      ...linkedItem,
      ...linkedSignal,
      ...detail.sessions.map((session) =>
        evidenceNode({
          id: `session:${session.id}`,
          kind: "session",
          label: session.status,
          description: session.summary ?? session.itemTitle,
          occurredAt: session.startedAt,
        })
      ),
      ...detail.activity.map((activity) =>
        evidenceNode({
          id: `activity:${activity.id}`,
          kind: "activity",
          label: activity.activityType,
          description: activity.body,
          occurredAt: activity.createdAt,
        })
      ),
    ],
    {
      linkCount: 1,
      relationCount: 0,
      activityCount: detail.activity.length,
      attachmentCount: 0,
      sessionCount: detail.sessions.length,
      noticeCount: 0,
    }
  )
}

function createPlannerEvidenceGraph(
  nodes: PlannerEvidenceGraphNode[],
  summary: PlannerEvidenceGraph["summary"]
): PlannerEvidenceGraph {
  return {
    nodes: [...nodes].sort((left, right) => {
      const leftTime = left.occurredAt?.getTime() ?? 0
      const rightTime = right.occurredAt?.getTime() ?? 0
      return rightTime - leftTime
    }),
    summary,
  }
}

function evidenceNode(
  input: Omit<PlannerEvidenceGraphNode, "description" | "occurredAt" | "href"> &
    Partial<
      Pick<PlannerEvidenceGraphNode, "description" | "occurredAt" | "href">
    >
): PlannerEvidenceGraphNode {
  return {
    ...input,
    description: input.description ?? null,
    occurredAt: input.occurredAt ?? null,
    href: input.href ?? null,
  }
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
