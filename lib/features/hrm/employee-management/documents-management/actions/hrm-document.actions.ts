"use server"

import type { Route } from "next"
import { redirect } from "next/navigation"
import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { logUnexpectedServerError } from "#lib/logger.server"
import {
  ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL,
  ORG_DASHBOARD_HRM_EMPLOYEES,
} from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmDocument, hrmEmployee, hrmEmploymentContract } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { isoDateOnlyToUtcDate } from "../../../hrm-calendar-dates.server"
import { requireHrmDocumentMutationGate } from "../data/hrm-document-action-guard.server"
import {
  attachEmployeeDocumentFormSchema,
  archiveDocumentFormSchema,
  rejectDocumentFormSchema,
  verifyDocumentFormSchema,
} from "../schemas/hrm-document.schema"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import { HRM_DOCUMENT_AUDIT } from "../document.contract"
import type { HrmDocumentMutationFormState } from "../../../types"

function revalidateHrmDocumentSurfaces() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/documents"),
    "page"
  )
}

function blobUrlMatchesOrgHrmEmployeePath(
  blobUrl: string,
  organizationId: string,
  employeeId: string
): boolean {
  try {
    const path = decodeURIComponent(new URL(blobUrl).pathname)
    const needle = `/orgs/${organizationId}/hrm/${employeeId}/`
    return path.includes(needle)
  } catch {
    return false
  }
}

export async function attachEmployeeDocumentAction(
  _prev: HrmDocumentMutationFormState | undefined,
  formData: FormData
): Promise<HrmDocumentMutationFormState> {
  const gate = await requireHrmDocumentMutationGate(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = attachEmployeeDocumentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    blobUrl: formData.get("blobUrl"),
    payloadHash: formData.get("payloadHash"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
    title: formData.get("title"),
    documentType: formData.get("documentType"),
    classification: formData.get("classification"),
    effectiveFrom: formData.get("effectiveFrom"),
    expiryDate: formData.get("expiryDate"),
    versionNumber: formData.get("versionNumber"),
    isMandatory: formData.get("isMandatory"),
    draftContractId: formData.get("draftContractId"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form:
        fe.blobUrl?.[0] ??
        fe.payloadHash?.[0] ??
        fe.title?.[0] ??
        fe.documentType?.[0],
      blobUrl: fe.blobUrl?.[0],
      payloadHash: fe.payloadHash?.[0],
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

  const [emp] = await db
    .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, d.employeeId)
      )
    )
    .limit(1)

  if (!emp) {
    return hrmActionFailure({ form: "Employee not found." })
  }
  if (emp.archivedAt) {
    return hrmActionFailure({
      form: "Cannot attach documents to an archived employee.",
    })
  }

  let documentId: string | null = null
  try {
    documentId = await db.transaction(async (tx) => {
      const id = crypto.randomUUID()
      await tx.insert(hrmDocument).values({
        id,
        organizationId,
        employeeId: d.employeeId,
        documentType: d.documentType,
        subjectKind: d.draftContractId ? "contract" : null,
        subjectId: d.draftContractId ?? null,
        title: d.title,
        blobUrl: d.blobUrl,
        payloadHash: d.payloadHash,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        classification: d.classification,
        effectiveFrom: isoDateOnlyToUtcDate(d.effectiveFrom),
        effectiveTo: d.expiryDate ? isoDateOnlyToUtcDate(d.expiryDate) : null,
        versionNumber: d.versionNumber ?? null,
        isMandatory: d.isMandatory ?? false,
        uploadedByUserId: userId,
      })

      if (d.draftContractId) {
        const [contract] = await tx
          .select({
            id: hrmEmploymentContract.id,
            employeeId: hrmEmploymentContract.employeeId,
            state: hrmEmploymentContract.state,
          })
          .from(hrmEmploymentContract)
          .where(
            and(
              eq(hrmEmploymentContract.organizationId, organizationId),
              eq(hrmEmploymentContract.id, d.draftContractId)
            )
          )
          .limit(1)

        if (!contract || contract.employeeId !== d.employeeId) {
          throw new Error("draft_contract_mismatch")
        }
        if (contract.state !== "draft") {
          throw new Error("draft_contract_not_draft")
        }

        await tx
          .update(hrmEmploymentContract)
          .set({
            signedDocumentId: id,
            updatedAt: new Date(),
            updatedByUserId: userId,
          })
          .where(eq(hrmEmploymentContract.id, contract.id))
      }

      return id
    })
  } catch (err) {
    logUnexpectedServerError("hrm.document.attach", err, { organizationId })
    if (err instanceof Error) {
      if (err.message === "draft_contract_mismatch") {
        return hrmActionFailure({
          form: "The draft contract does not belong to this employee.",
        })
      }
      if (err.message === "draft_contract_not_draft") {
        return hrmActionFailure({
          form: "Only draft contracts can be linked during upload.",
        })
      }
    }
    return hrmActionFailure({
      form: "Could not attach this document. Retry the upload or contact support if the problem persists.",
    })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_DOCUMENT_AUDIT.attach,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_document",
      resourceId: documentId,
      metadata: {
        employeeId: d.employeeId,
        documentType: d.documentType,
        classification: d.classification,
        payloadHashSuffix: d.payloadHash.slice(-12),
        linkedDraftContractId: d.draftContractId ?? null,
      },
    })
  )

  revalidateHrmDocumentSurfaces()
  return { ok: true }
}

/**
 * HR user verifies (approves) a submitted document. HRM-DOC-008/009.
 * Sets `verificationStatus` to `"verified"`.
 */
export async function verifyDocumentAction(
  _prev: HrmDocumentMutationFormState | undefined,
  formData: FormData
): Promise<HrmDocumentMutationFormState> {
  const gate = await requireHrmDocumentMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = verifyDocumentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    documentId: formData.get("documentId"),
    reviewNote: formData.get("reviewNote") || null,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const [doc] = await db
    .select({ id: hrmDocument.id, verificationStatus: hrmDocument.verificationStatus })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, organizationId),
        eq(hrmDocument.id, parsed.data.documentId)
      )
    )
    .limit(1)

  if (!doc) {
    return hrmActionFailure({ form: "Document not found." })
  }
  if (doc.verificationStatus === "archived") {
    return hrmActionFailure({ form: "Cannot verify an archived document." })
  }

  const now = new Date()
  await db
    .update(hrmDocument)
    .set({
      verificationStatus: "verified",
      verifiedByUserId: userId,
      verifiedAt: now,
      rejectionReason: null,
      updatedAt: now,
    })
    .where(eq(hrmDocument.id, doc.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_DOCUMENT_AUDIT.verify,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_document",
      resourceId: doc.id,
      metadata: { reviewNote: parsed.data.reviewNote ?? null },
    })
  )

  revalidateHrmDocumentSurfaces()
  return { ok: true }
}

/**
 * HR user rejects a submitted document with a required reason. HRM-DOC-008/010.
 * Sets `verificationStatus` to `"rejected"` and stores the rejection reason.
 */
export async function rejectDocumentAction(
  _prev: HrmDocumentMutationFormState | undefined,
  formData: FormData
): Promise<HrmDocumentMutationFormState> {
  const gate = await requireHrmDocumentMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = rejectDocumentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    documentId: formData.get("documentId"),
    rejectionReason: formData.get("rejectionReason"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: fe.rejectionReason?.[0] ?? parsed.error.issues[0]?.message,
      rejectionReason: fe.rejectionReason?.[0],
    })
  }

  const [doc] = await db
    .select({ id: hrmDocument.id, verificationStatus: hrmDocument.verificationStatus })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, organizationId),
        eq(hrmDocument.id, parsed.data.documentId)
      )
    )
    .limit(1)

  if (!doc) {
    return hrmActionFailure({ form: "Document not found." })
  }
  if (doc.verificationStatus === "archived") {
    return hrmActionFailure({ form: "Cannot reject an archived document." })
  }

  const now = new Date()
  await db
    .update(hrmDocument)
    .set({
      verificationStatus: "rejected",
      rejectionReason: parsed.data.rejectionReason,
      verifiedByUserId: userId,
      verifiedAt: now,
      updatedAt: now,
    })
    .where(eq(hrmDocument.id, doc.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_DOCUMENT_AUDIT.reject,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_document",
      resourceId: doc.id,
      metadata: { rejectionReason: parsed.data.rejectionReason },
    })
  )

  revalidateHrmDocumentSurfaces()
  return { ok: true }
}

/**
 * Archives a document (e.g. after employee separation or policy superseded).
 * HRM-DOC-022. Sets `verificationStatus` to `"archived"`.
 */
export async function archiveDocumentAction(
  _prev: HrmDocumentMutationFormState | undefined,
  formData: FormData
): Promise<HrmDocumentMutationFormState> {
  const gate = await requireHrmDocumentMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = archiveDocumentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    documentId: formData.get("documentId"),
    archiveReason: formData.get("archiveReason") || null,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const [doc] = await db
    .select({ id: hrmDocument.id, verificationStatus: hrmDocument.verificationStatus })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, organizationId),
        eq(hrmDocument.id, parsed.data.documentId)
      )
    )
    .limit(1)

  if (!doc) {
    return hrmActionFailure({ form: "Document not found." })
  }
  if (doc.verificationStatus === "archived") {
    return { ok: true }
  }

  const now = new Date()
  await db
    .update(hrmDocument)
    .set({
      verificationStatus: "archived",
      updatedAt: now,
      ...(parsed.data.archiveReason
        ? { rejectionReason: parsed.data.archiveReason }
        : {}),
    })
    .where(eq(hrmDocument.id, doc.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_DOCUMENT_AUDIT.archive,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_document",
      resourceId: doc.id,
      metadata: { archiveReason: parsed.data.archiveReason ?? null },
    })
  )

  revalidateHrmDocumentSurfaces()
  return { ok: true }
}

const replaceDocumentSchema = rejectDocumentFormSchema
  .omit({ rejectionReason: true })
  .extend({
    replacementDocumentId: rejectDocumentFormSchema.shape.documentId,
    reviewNote: verifyDocumentFormSchema.shape.reviewNote,
  })

/**
 * Records that an existing document has been superseded by a newer version.
 * HRM-DOC-005/014. Sets `replacedByDocumentId` on the old document row and
 * archives it; the replacement document is expected to already be attached.
 */
export async function replaceDocumentAction(
  _prev: HrmDocumentMutationFormState | undefined,
  formData: FormData
): Promise<HrmDocumentMutationFormState> {
  const gate = await requireHrmDocumentMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = replaceDocumentSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    documentId: formData.get("documentId"),
    replacementDocumentId: formData.get("replacementDocumentId"),
    reviewNote: formData.get("reviewNote") || null,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  if (parsed.data.documentId === parsed.data.replacementDocumentId) {
    return hrmActionFailure({ form: "A document cannot replace itself." })
  }

  const [oldDoc, newDoc] = await Promise.all([
    db
      .select({ id: hrmDocument.id, verificationStatus: hrmDocument.verificationStatus })
      .from(hrmDocument)
      .where(
        and(
          eq(hrmDocument.organizationId, organizationId),
          eq(hrmDocument.id, parsed.data.documentId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({ id: hrmDocument.id })
      .from(hrmDocument)
      .where(
        and(
          eq(hrmDocument.organizationId, organizationId),
          eq(hrmDocument.id, parsed.data.replacementDocumentId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ])

  if (!oldDoc) {
    return hrmActionFailure({ form: "Original document not found." })
  }
  if (!newDoc) {
    return hrmActionFailure({ form: "Replacement document not found." })
  }
  if (oldDoc.verificationStatus === "archived") {
    return hrmActionFailure({ form: "Document is already archived." })
  }

  const now = new Date()
  await db
    .update(hrmDocument)
    .set({
      replacedByDocumentId: parsed.data.replacementDocumentId,
      verificationStatus: "archived",
      updatedAt: now,
    })
    .where(eq(hrmDocument.id, oldDoc.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_DOCUMENT_AUDIT.replace,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_document",
      resourceId: oldDoc.id,
      metadata: {
        replacementDocumentId: parsed.data.replacementDocumentId,
        reviewNote: parsed.data.reviewNote ?? null,
      },
    })
  )

  revalidateHrmDocumentSurfaces()
  return { ok: true }
}

const downloadDocumentFormSchema = verifyDocumentFormSchema.pick({
  orgSlug: true,
  documentId: true,
})

/**
 * Records a download audit event for a governed HRM document and redirects
 * the client to the blob URL. HRM-DOC-018/023.
 *
 * The server action model ensures every download is captured in
 * `iam_audit_event` before the blob URL is returned to the browser.
 */
export async function downloadDocumentAction(formData: FormData): Promise<never> {
  const gate = await requireHrmDocumentMutationGate(formData, "read")
  if (!gate.ok) {
    redirect("/")
  }
  const { organizationId, userId, sessionId } = gate

  const parsed = downloadDocumentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    documentId: formData.get("documentId"),
  })
  if (!parsed.success) {
    redirect("/")
  }

  const [doc] = await db
    .select({ id: hrmDocument.id, blobUrl: hrmDocument.blobUrl })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, organizationId),
        eq(hrmDocument.id, parsed.data.documentId)
      )
    )
    .limit(1)

  if (!doc) {
    redirect("/")
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_DOCUMENT_AUDIT.download,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_document",
      resourceId: doc.id,
      metadata: {},
    })
  )

  redirect(doc.blobUrl as Route)
}
