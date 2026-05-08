import type { LynxGrounding } from "./lynx-summon-context"

/** Deterministic Truth-retrieval question — never LLM-authored. */
export function buildGroundedTruthQuestion(
  grounding: LynxGrounding | null
): string | null {
  if (!grounding) return null
  const title = grounding.title.trim()
  if (!title) return null
  const summary = grounding.summary?.trim()
  const summaryClipped = summary
    ? ` Context: ${summary.slice(0, 400)}${summary.length > 400 ? "…" : ""}`
    : ""
  return (
    `Operational task: "${title}".${summaryClipped} ` +
    "Using only this organization's knowledge base, what facts, constraints, or precedents are most relevant? Include limitations and a cautious next step."
  )
}
