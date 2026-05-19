"use server"

import { revalidatePath } from "next/cache"
import type { Route } from "next"
import { redirect } from "next/navigation"
import { z } from "zod"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmDocument, hrmEssDocumentRequest } from "#lib/db/schema"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { requireEmployeePortalMutationGate } from "../data/employee-portal-mutation-gate.server"
import { withEmployeePortalActionSpan } from "../data/portal-mutation-tracing.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { notifyEssRequestLifecycle } from "../data/employee-portal-notification.server"
import { HRM_ESS_AUDIT } from "../ess.contract"
import {
  HRM_DOCUMENT_CLASSIFICATIONS,
  HRM_DOCUMENT_TYPES,
} from "../../documents-management/data/hrm-document-display.shared"
import {
  addUtcDays,
  blobUrlMatchesOrgHrmEmployeePath,
  deriveHrmDocumentGroup,
} from "../../documents-management/data/hrm-document-governance.shared"
import {
  canEmployeePortalAccessDocument,
  findEmployeeSubmissionRequirement,
  findRetentionRule,
} from "../../documents-management/data/hrm-document-governance.server"
import { HRM_DOCUMENT_AUDIT } from "../../documents-management/document.contract"

const requestDocumentFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  notes: z.string().trim().max(2000).optional().nullable(),
})

export type PortalDocumentRequestFormState =
  | { ok: true }
  | { ok: false; errors: { title?: string; notes?: string; form?: string } }

const payloadHash = z.string().regex(/^[a-f0-9]{64}$/)
const isoDateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")

const submitPortalDocumentFormSchema = z.object({
  portalSlug: z.string().min(1),
  blobUrl: z.string().url().startsWith("https://"),
  payloadHash,
  mimeType: z.string().min(3).max(128),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(80 * 1024 * 1024),
  title: z.string().trim().min(1).max(512),
  documentType: z.enum(HRM_DOCUMENT_TYPES),
  classification: z.enum(HRM_DOCUMENT_CLASSIFICATIONS).optional(),
  effectiveFrom: isoDateOnly,
  expiryDate: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    isoDateOnly.optional()
  ),
  requestId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().uuid().optional()
  ),
})

const portalDocumentDownloadFormSchema = z.object({
  portalSlug: z.string().min(1),
  documentId: z.string().uuid(),
})

export async function requestPortalEmployeeDocumentAction(
  _prev: PortalDocumentRequestFormState | undefined,
  formData: FormData
): Promise<PortalDocumentRequestFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return {
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    }
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return {
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    }
  }

  const parsed = requestDocumentFormSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        title: flat.title?.[0],
        notes: flat.notes?.[0],
        form: parsed.error.issues[0]?.message,
      },
    }
  }

  return withEmployeePortalActionSpan(
    context,
    "documents",
    "request",
    async () => {
      const requestId = crypto.randomUUID()

      await db.insert(hrmEssDocumentRequest).values({
        id: requestId,
        organizationId: context.portal.organizationId,
        employeeId: context.employee.id,
        title: parsed.data.title,
        notes: parsed.data.notes ?? null,
        status: "pending",
        submittedByUserId: context.portal.userId,
      })

      await writeIamAuditEventFromNextHeaders({
        action: HRM_ESS_AUDIT.document.request,
        actorUserId: context.portal.userId,
        actorSessionId: context.portal.sessionId,
        organizationId: context.portal.organizationId,
        resourceType: "hrm_ess_document_request",
        resourceId: requestId,
        metadata: {
          portal: true,
          employeeId: context.employee.id,
          title: parsed.data.title,
          notes: parsed.data.notes ?? null,
        },
      })
      await notifyEssRequestLifecycle({
        organizationId: context.portal.organizationId,
        targetUserId: context.portal.userId,
        kind: "document_request",
        status: "submitted",
        requestId,
        employeeId: context.employee.id,
      })

      revalidatePath(
        toLocalePortalRevalidatePattern("/employee/documents"),
        "page"
      )
      return { ok: true }
    }
  )
}

export async function submitPortalEmployeeDocumentAction(
  _prev: PortalDocumentRequestFormState | undefined,
  formData: FormData
): Promise<PortalDocumentRequestFormState> {
  const gate = await requireEmployeePortalMutationGate(formData)
  if (!gate.ok) {
    return { ok: false, errors: { form: gate.formError } }
  }
  const { context } = gate

  const parsed = submitPortalDocumentFormSchema.safeParse({
    portalSlug: context.portal.portalSlug,
    blobUrl: formData.get("blobUrl"),
    payloadHash: formData.get("payloadHash"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
    title: formData.get("title"),
    documentType: formData.get("documentType"),
    classification: formData.get("classification") || "internal",
    effectiveFrom: formData.get("effectiveFrom"),
    expiryDate: formData.get("expiryDate"),
    requestId: formData.get("requestId"),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        title: flat.title?.[0],
        form:
          flat.blobUrl?.[0] ??
          flat.payloadHash?.[0] ??
          flat.documentType?.[0] ??
          parsed.error.issues[0]?.message,
      },
    }
  }
  if (
    parsed.data.classification === "confidential" ||
    parsed.data.classification === "restricted"
  ) {
    return {
      ok: false,
      errors: {
        form: "Employee submissions cannot set a sensitive classification.",
      },
    }
  }

  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id
  const requirement = await findEmployeeSubmissionRequirement({
    organizationId,
    documentType: parsed.data.documentType,
  })
  if (!requirement) {
    return {
      ok: false,
      errors: {
        form: "This document type is not open for employee submission.",
      },
    }
  }
  if (
    !blobUrlMatchesOrgHrmEmployeePath(
      parsed.data.blobUrl,
      organizationId,
      employeeId
    )
  ) {
    return {
      ok: false,
      errors: { form: "Upload did not use the governed HRM employee path." },
    }
  }

  return withEmployeePortalActionSpan(
    context,
    "documents",
    "submit",
    async () => {
      const now = new Date()
      const id = crypto.randomUUID()
      const effectiveFrom = new Date(
        `${parsed.data.effectiveFrom}T00:00:00.000Z`
      )
      const effectiveTo = parsed.data.expiryDate
        ? new Date(`${parsed.data.expiryDate}T00:00:00.000Z`)
        : null
      const documentGroup =
        requirement.documentGroup ||
        deriveHrmDocumentGroup(parsed.data.documentType)
      const retentionRule = await findRetentionRule({
        organizationId,
        retentionPolicyCode: requirement.retentionPolicyCode,
        documentType: parsed.data.documentType,
        documentGroup,
      })
      const retentionUntil = retentionRule
        ? addUtcDays(
            effectiveTo ?? effectiveFrom,
            retentionRule.retentionPeriodDays
          )
        : null

      await db.transaction(async (tx) => {
        await tx.insert(hrmDocument).values({
          id,
          organizationId,
          documentSetId: id,
          employeeId,
          documentType: parsed.data.documentType,
          documentGroup,
          title: parsed.data.title,
          blobUrl: parsed.data.blobUrl,
          payloadHash: parsed.data.payloadHash,
          mimeType: parsed.data.mimeType,
          sizeBytes: parsed.data.sizeBytes,
          classification: parsed.data.classification ?? "internal",
          verificationStatus: "pending",
          documentLifecycleStatus: "active",
          effectiveFrom,
          effectiveTo,
          versionNumber: 1,
          isLatestVersion: true,
          isMandatory: requirement.isMandatory,
          retentionPolicyCode: requirement.retentionPolicyCode,
          retentionUntil,
          uploadedByUserId: context.portal.userId,
        })

        if (parsed.data.requestId) {
          await tx
            .update(hrmEssDocumentRequest)
            .set({
              status: "fulfilled",
              fulfilledDocumentId: id,
              reviewedAt: now,
              reviewedByUserId: context.portal.userId,
              updatedAt: now,
            })
            .where(
              and(
                eq(hrmEssDocumentRequest.organizationId, organizationId),
                eq(hrmEssDocumentRequest.employeeId, employeeId),
                eq(hrmEssDocumentRequest.id, parsed.data.requestId)
              )
            )
        }
      })

      await writeIamAuditEventFromNextHeaders({
        action: HRM_DOCUMENT_AUDIT.attach,
        actorUserId: context.portal.userId,
        actorSessionId: context.portal.sessionId,
        organizationId,
        resourceType: "hrm_document",
        resourceId: id,
        metadata: {
          surface: "employee_portal",
          employeeId,
          documentType: parsed.data.documentType,
          payloadHashSuffix: parsed.data.payloadHash.slice(-12),
        },
      })

      revalidatePath(
        toLocalePortalRevalidatePattern("/employee/documents"),
        "page"
      )
      return { ok: true }
    }
  )
}

export async function downloadPortalEmployeeDocumentAction(
  formData: FormData
): Promise<never> {
  const gate = await requireEmployeePortalMutationGate(formData)
  if (!gate.ok) redirect("/")

  const parsed = portalDocumentDownloadFormSchema.safeParse({
    portalSlug: gate.context.portal.portalSlug,
    documentId: formData.get("documentId"),
  })
  if (!parsed.success) redirect("/")

  const access = await canEmployeePortalAccessDocument({
    organizationId: gate.context.portal.organizationId,
    employeeId: gate.context.employee.id,
    documentId: parsed.data.documentId,
  })
  if (!access.ok) redirect("/")

  await writeIamAuditEventFromNextHeaders({
    action: HRM_ESS_AUDIT.document.download,
    actorUserId: gate.context.portal.userId,
    actorSessionId: gate.context.portal.sessionId,
    organizationId: gate.context.portal.organizationId,
    resourceType: "hrm_document",
    resourceId: access.document.id,
    metadata: {
      surface: "employee_portal",
      employeeId: gate.context.employee.id,
    },
  })

  redirect(access.document.blobUrl as Route)
}
