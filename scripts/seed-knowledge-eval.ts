import { readFile } from "node:fs/promises"

import { db } from "#lib/db"
import { knowledgeEvalCase, knowledgeEvalSet } from "#lib/db/schema"

type EvalSeedCase = {
  question: string
  expectedEvidenceIds: string[]
  expectedAnswerSubstring?: string
}

type EvalSeedInput = {
  name: string
  description?: string
  cases: EvalSeedCase[]
}

async function main() {
  const organizationId = process.argv[2]?.trim()
  const jsonPath = process.argv[3]?.trim()
  if (!organizationId || !jsonPath) {
    console.error(
      "Usage: node scripts/with-env.mjs tsx scripts/seed-knowledge-eval.ts <organizationId> <jsonPath>"
    )
    process.exit(1)
  }

  const raw = await readFile(jsonPath, "utf8")
  const parsed = JSON.parse(raw) as EvalSeedInput
  if (!parsed.name || !Array.isArray(parsed.cases)) {
    throw new Error("Invalid eval seed format.")
  }

  const [setRow] = await db
    .insert(knowledgeEvalSet)
    .values({
      organizationId,
      name: parsed.name,
      description: parsed.description ?? null,
      createdByUserId: null,
    })
    .returning({ id: knowledgeEvalSet.id })

  if (parsed.cases.length > 0) {
    await db.insert(knowledgeEvalCase).values(
      parsed.cases.map((item) => ({
        evalSetId: setRow.id,
        question: item.question,
        expectedEvidenceIds: item.expectedEvidenceIds,
        expectedAnswerSubstring: item.expectedAnswerSubstring ?? null,
      }))
    )
  }

  console.log(
    `Knowledge eval set created: ${setRow.id} (${parsed.cases.length} cases).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
