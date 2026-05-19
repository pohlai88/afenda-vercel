"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmDocument } from "#lib/db/schema"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { isoDateOnlyToUtcDate } from "../../../_module-governance/hrm-calendar-dates.server"
import { requireMutableEmployeeRecord } from "../../../employee-management/employee-records-management/data/employee-record-mutability.server"
import {
  blobUrlMatchesOrgHrmEmployeePath,
  deriveHrmDocumentGroup,
} from "../../../employee-management/documents-management/data/hrm-document-governance.shared"
import { HRM_DOCUMENT_AUDIT } from "../../../employee-management/documents-management/document.contract"
import { getFwaEmployeeForOrg } from "../data/fwa.queries.server"
import { registerFwaEvidenceFormSchema } from "../schemas/fwa.schema"

export type RegisterFwaEvidenceFormState =
  | { ok: true; documentId: string }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
      }
    }

export async function registerFwaEvidenceDocumentAction(
  _prev: RegisterFwaEvidenceFormState | undefined,
  formData: FormData
): Promise<RegisterFwaEvidenceFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: {
      module: "hrm",
      object: "flexible_work",
      function: "create",
    },
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to attach flexible work evidence.",
    })
  }

  const parsed = registerFwaEvidenceFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    blobUrl: formData.get("blobUrl"),
    payloadHash: formData.get("payloadHash"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
    title: formData.get("title"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
    })
  }

  const d = parsed.data

  if (
    !blobUrlMatchesOrgHrmEmployeePath(d.blobUrl, organizationId, d.employeeId)
  ) {
    return hrmActionFailure({
      form: "Upload did not use the governed HRM path for this employee.",
    })
  }

  const employee = await getFwaEmployeeForOrg(organizationId, d.employeeId)
  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }

  const mutable = await requireMutableEmployeeRecord({
    organizationId,
    employeeId: d.employeeId,
  })
  if (!mutable.ok) {
    return hrmActionFailure({
      form: "Cannot attach evidence for this employee record.",
    })
  }

  const documentType = "hr_letter" as const
  const documentGroup = deriveHrmDocumentGroup(documentType)
  const effectiveFrom = isoDateOnlyToUtcDate(
    new Date().toISOString().slice(0, 10)
  )
  const documentId = crypto.randomUUID()

  await db.insert(hrmDocument).values({
    id: documentId,
    organizationId,
    documentSetId: documentId,
    employeeId: d.employeeId,
    documentType,
    documentGroup,
    title: d.title,
    blobUrl: d.blobUrl,
    payloadHash: d.payloadHash,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    classification: "internal",
    effectiveFrom,
    effectiveTo: null,
    versionNumber: 1,
    isLatestVersion: true,
    isMandatory: false,
    documentLifecycleStatus: "active",
    uploadedByUserId: userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_DOCUMENT_AUDIT.attach,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_document",
    resourceId: documentId,
    metadata: {
      employeeId: d.employeeId,
      documentType,
      source: "flexible_work_evidence",
    },
  })

  return { ok: true, documentId }
}
