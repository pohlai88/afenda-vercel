import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDocument } from "#lib/db/schema"

import type { HrmDocumentSummary } from "../types"

export async function listHrmDocumentsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<HrmDocumentSummary[]> {
  return db
    .select({
      id: hrmDocument.id,
      documentType: hrmDocument.documentType,
      title: hrmDocument.title,
      blobUrl: hrmDocument.blobUrl,
      payloadHash: hrmDocument.payloadHash,
      mimeType: hrmDocument.mimeType,
      sizeBytes: hrmDocument.sizeBytes,
      classification: hrmDocument.classification,
      uploadedAt: hrmDocument.uploadedAt,
    })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, organizationId),
        eq(hrmDocument.employeeId, employeeId)
      )
    )
    .orderBy(desc(hrmDocument.uploadedAt))
}
