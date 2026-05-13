"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL,
  ORG_DASHBOARD_HRM_EMPLOYEES,
} from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmDocument, hrmEmployee, hrmEmploymentContract } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { isoDateOnlyToUtcDate } from "../data/hrm-calendar-dates.server"
import { attachEmployeeDocumentFormSchema } from "../schemas/hrm-document.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { HrmDocumentMutationFormState } from "../types"

function revalidateHrmEmployeeSurfaces() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
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
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId } = session

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
  } catch {
    documentId = null
  }

  if (!documentId) {
    return hrmActionFailure({
      form: "Could not attach this document. If you linked a draft contract, confirm it belongs to this employee and is still in draft.",
    })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.document.attach",
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

  revalidateHrmEmployeeSurfaces()
  return { ok: true }
}
