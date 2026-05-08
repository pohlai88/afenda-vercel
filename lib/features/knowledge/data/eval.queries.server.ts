import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeEvalCase, knowledgeEvalSet } from "#lib/db/schema"

import type { EvalCaseSummary } from "#features/knowledge/types"

export async function listEvalSetsForOrganization(organizationId: string) {
  return db
    .select({
      id: knowledgeEvalSet.id,
      name: knowledgeEvalSet.name,
      description: knowledgeEvalSet.description,
      createdAt: knowledgeEvalSet.createdAt,
    })
    .from(knowledgeEvalSet)
    .where(eq(knowledgeEvalSet.organizationId, organizationId))
    .orderBy(asc(knowledgeEvalSet.createdAt))
}

export async function listEvalCasesForSet(
  organizationId: string,
  evalSetId: string
): Promise<EvalCaseSummary[]> {
  const rows = await db
    .select({
      id: knowledgeEvalCase.id,
      question: knowledgeEvalCase.question,
      expectedEvidenceIds: knowledgeEvalCase.expectedEvidenceIds,
    })
    .from(knowledgeEvalCase)
    .innerJoin(
      knowledgeEvalSet,
      and(
        eq(knowledgeEvalSet.id, knowledgeEvalCase.evalSetId),
        eq(knowledgeEvalSet.organizationId, organizationId)
      )
    )
    .where(eq(knowledgeEvalCase.evalSetId, evalSetId))
    .orderBy(asc(knowledgeEvalCase.createdAt))
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    expectedEvidenceIds: row.expectedEvidenceIds,
  }))
}

export async function listEvalSetRefs() {
  return db
    .select({
      evalSetId: knowledgeEvalSet.id,
      organizationId: knowledgeEvalSet.organizationId,
      createdByUserId: knowledgeEvalSet.createdByUserId,
    })
    .from(knowledgeEvalSet)
}
