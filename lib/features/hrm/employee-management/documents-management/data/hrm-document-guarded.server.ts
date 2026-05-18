import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDocument } from "#lib/db/schema"
import { writeIamAuditEvent } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { HRM_DOCUMENT_AUDIT } from "../document.contract"
import {
  getEmployeeDocumentReadiness as resolveEmployeeDocumentReadiness,
  type EmployeeDocumentReadinessSummary,
} from "./hrm-document-governance.server"
import {
  listEmployeeVisibleDocuments as listEmployeeVisibleDocumentsForOrg,
  listHrmDocumentsForOrg,
  type EmployeeVisibleDocumentSummary,
  type ListHrmDocumentsForOrgOptions,
  type OrgHrmDocumentRow,
} from "./hrm-document.queries.server"
import { isSensitiveHrmDocumentClassification } from "./hrm-document-display.shared"

export async function searchHrmDocumentsForCurrentOrg(
  options: ListHrmDocumentsForOrgOptions = {}
): Promise<
  | { ok: true; rows: readonly OrgHrmDocumentRow[] }
  | { ok: false; error: string }
> {
  const gate = await requireHrmPermission({
    object: "document",
    function: "search",
    errorMessage: "HRM document search permission required.",
  })
  if (!gate.ok) return gate

  const rows = await listHrmDocumentsForOrg(gate.session.organizationId, options)
  await writeIamAuditEvent({
    action: HRM_DOCUMENT_AUDIT.view,
    organizationId: gate.session.organizationId,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    resourceType: "hrm_document",
    resourceId: null,
    metadata: {
      resultCount: rows.length,
      filters: options,
    },
  })
  return { ok: true, rows }
}

export async function getEmployeeDocumentReadiness(input: {
  employeeId: string
}): Promise<
  | { ok: true; readiness: EmployeeDocumentReadinessSummary | null }
  | { ok: false; error: string }
> {
  const gate = await requireHrmPermission({
    object: "document",
    function: "read",
    errorMessage: "HRM document read permission required.",
  })
  if (!gate.ok) return gate

  const readiness = await resolveEmployeeDocumentReadiness({
    organizationId: gate.session.organizationId,
    employeeId: input.employeeId,
  })
  return { ok: true, readiness }
}

export async function listEmployeeVisibleDocuments(input: {
  employeeId: string
}): Promise<
  | { ok: true; rows: readonly EmployeeVisibleDocumentSummary[] }
  | { ok: false; error: string }
> {
  const gate = await requireHrmPermission({
    object: "document",
    function: "read",
    errorMessage: "HRM document read permission required.",
  })
  if (!gate.ok) return gate

  const rows = await listEmployeeVisibleDocumentsForOrg({
    organizationId: gate.session.organizationId,
    employeeId: input.employeeId,
  })
  return { ok: true, rows }
}

export async function getSecureHrmDocumentDownload(input: {
  documentId: string
}): Promise<
  | { ok: true; documentId: string; organizationId: string; blobUrl: string }
  | { ok: false; error: string }
> {
  const readGate = await requireHrmPermission({
    object: "document",
    function: "read",
    errorMessage: "HRM document read permission required.",
  })
  if (!readGate.ok) return readGate

  const [document] = await db
    .select({
      id: hrmDocument.id,
      organizationId: hrmDocument.organizationId,
      blobUrl: hrmDocument.blobUrl,
      classification: hrmDocument.classification,
      documentLifecycleStatus: hrmDocument.documentLifecycleStatus,
    })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, readGate.session.organizationId),
        eq(hrmDocument.id, input.documentId)
      )
    )
    .limit(1)

  if (!document || document.documentLifecycleStatus === "deleted") {
    return { ok: false, error: "Document not found." }
  }

  if (isSensitiveHrmDocumentClassification(document.classification)) {
    const auditGate = await requireHrmPermission({
      object: "document",
      function: "audit",
      errorMessage: "Elevated HRM document permission required.",
    })
    if (!auditGate.ok) return auditGate
  }

  await writeIamAuditEvent({
    action: HRM_DOCUMENT_AUDIT.download,
    organizationId: readGate.session.organizationId,
    actorUserId: readGate.session.userId,
    actorSessionId: readGate.session.sessionId,
    resourceType: "hrm_document",
    resourceId: document.id,
    metadata: {
      classification: document.classification,
      documentLifecycleStatus: document.documentLifecycleStatus,
    },
  })

  return {
    ok: true,
    documentId: document.id,
    organizationId: document.organizationId,
    blobUrl: document.blobUrl,
  }
}
