import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBoardingInstance,
  hrmBoardingTask,
  hrmBoardingTemplateTask,
  hrmEmployee,
  hrmEmployeeContactProfile,
  hrmSignatureRequest,
} from "#lib/db/schema"
import { rootLogger } from "#lib/logger.server"

import { boardingTaskRequiresSignature } from "./boarding-signature-bridge.shared"
import { createSignatureRequest } from "#features/tools/server"

const DEFAULT_DECLARATION =
  "I acknowledge that I have reviewed the attached document and agree to sign electronically."

/**
 * When a boarding task is started and template metadata marks
 * `requiresSignature: true`, draft a signature request against the task evidence document.
 */
export async function ensureBoardingTaskSignatureOnStart(input: {
  readonly organizationId: string
  readonly taskId: string
  readonly actorUserId: string
  readonly evidenceDocumentId?: string | null
}): Promise<{ created: boolean; requestId?: string }> {
  if (!input.evidenceDocumentId) {
    return { created: false }
  }

  const [row] = await db
    .select({
      taskId: hrmBoardingTask.id,
      templateMetadata: hrmBoardingTemplateTask.metadata,
      legalName: hrmEmployee.legalName,
      workEmail: hrmEmployeeContactProfile.workEmail,
      employeeId: hrmEmployee.id,
    })
    .from(hrmBoardingTask)
    .innerJoin(
      hrmBoardingInstance,
      eq(hrmBoardingInstance.id, hrmBoardingTask.instanceId)
    )
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmBoardingInstance.employeeId))
    .leftJoin(
      hrmEmployeeContactProfile,
      eq(hrmEmployeeContactProfile.employeeId, hrmEmployee.id)
    )
    .leftJoin(
      hrmBoardingTemplateTask,
      eq(hrmBoardingTemplateTask.id, hrmBoardingTask.templateTaskId)
    )
    .where(
      and(
        eq(hrmBoardingTask.organizationId, input.organizationId),
        eq(hrmBoardingTask.id, input.taskId)
      )
    )
    .limit(1)

  if (!row || !boardingTaskRequiresSignature(row.templateMetadata)) {
    return { created: false }
  }

  if (!row.workEmail) {
    rootLogger.warn(
      { taskId: input.taskId },
      "boarding signature bridge skipped — employee work email missing"
    )
    return { created: false }
  }

  const [existing] = await db
    .select({ id: hrmSignatureRequest.id })
    .from(hrmSignatureRequest)
    .where(
      and(
        eq(hrmSignatureRequest.organizationId, input.organizationId),
        eq(hrmSignatureRequest.kind, "boarding_task"),
        eq(hrmSignatureRequest.subjectId, input.taskId)
      )
    )
    .limit(1)

  if (existing) {
    return { created: false, requestId: existing.id }
  }

  try {
    const { requestId } = await createSignatureRequest({
      organizationId: input.organizationId,
      createdByUserId: input.actorUserId,
      kind: "boarding_task",
      subjectId: input.taskId,
      documentId: input.evidenceDocumentId,
      signingOrder: "parallel",
      declarationText: DEFAULT_DECLARATION,
      parties: [
        {
          signerOrder: 1,
          signerEmployeeId: row.employeeId,
          signerEmail: row.workEmail,
          signerName: row.legalName,
          role: "signer",
        },
      ],
    })
    return { created: true, requestId }
  } catch (err) {
    rootLogger.error(
      { err, taskId: input.taskId },
      "boarding signature bridge failed"
    )
    return { created: false }
  }
}
