export type CoordinationActivityKind =
  | "comment"
  | "evidence_added"
  | "status_note"

export type CoordinationEvidenceKind = "file" | "screenshot"

export type CoordinationEvidenceItem = {
  blobPathname: string
  url: string
  downloadUrl: string | null
  contentType: string | null
  fileName: string
  fileSize: number | null
  kind: CoordinationEvidenceKind
}

export type CoordinationOperatorSummary = {
  userId: string
  name: string | null
  email: string
  role: string
}

export type CoordinationContextSummary = {
  id: string
  subject: string
  linkedEntityType: string | null
  linkedEntityId: string | null
  linkedEntityLabel: string | null
  linkedEntityPath: string | null
  lastActivityAt: string
  latestActivityBody: string | null
  latestActivityKind: CoordinationActivityKind | null
  unreadCount: number
}

export type CoordinationActivitySummary = {
  id: string
  contextId: string
  kind: CoordinationActivityKind
  body: string
  evidence: CoordinationEvidenceItem[]
  createdAt: string
  author: {
    userId: string
    name: string | null
    email: string
  }
}

export type CoordinationContextDetail = {
  context: {
    id: string
    subject: string
    linkedEntityType: string | null
    linkedEntityId: string | null
    linkedEntityLabel: string | null
    linkedEntityPath: string | null
    lastActivityAt: string
    createdAt: string
    updatedAt: string
    createdByUserId: string
  }
  operators: CoordinationOperatorSummary[]
  activities: CoordinationActivitySummary[]
}

export type CoordinationContextCreateInput = {
  subject?: string | null
  operatorUserIds: string[]
  body?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
  linkedEntityLabel?: string | null
  linkedEntityPath?: string | null
}

export type CoordinationActivityCreateInput = {
  kind: CoordinationActivityKind
  body?: string | null
  evidence?: CoordinationEvidenceItem[]
}
