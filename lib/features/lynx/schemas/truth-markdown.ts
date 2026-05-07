/**
 * Parse streamed markdown from the truth model into Answer / Limitations / Next safe action.
 * Evidence is shown separately from retrieved chunks (server meta), not from this parse.
 */
export type LynxParsedTruth = {
  answer: string
  limitations: string
  nextSafeAction: string
}

function normalizeHeader(line: string): string {
  return line
    .replace(/^###\s*/i, "")
    .trim()
    .toLowerCase()
}

/**
 * Expects optional sections introduced by markdown `###` headings.
 * Unknown content before the first `### Answer` is treated as part of the answer.
 */
export function parseLynxTruthMarkdown(full: string): LynxParsedTruth {
  const trimmed = full.trim()
  if (!trimmed) {
    return { answer: "", limitations: "", nextSafeAction: "" }
  }

  const parts = trimmed.split(/\n(?=###\s+)/)
  const sections: Partial<Record<"answer" | "limitations" | "next", string>> =
    {}

  for (const part of parts) {
    const lines = part.trim().split("\n")
    const rawHeader = lines[0] ?? ""
    const body = lines.slice(1).join("\n").trim()
    const h = normalizeHeader(rawHeader)

    if (h.startsWith("answer")) {
      sections.answer = body
    } else if (h.startsWith("limitations")) {
      sections.limitations = body
    } else if (
      h.startsWith("next safe action") ||
      h.startsWith("next safe") ||
      (h.startsWith("next") && h.includes("action"))
    ) {
      sections.next = body
    }
  }

  if (sections.answer === undefined && parts.length === 1) {
    return {
      answer: trimmed,
      limitations: sections.limitations ?? "",
      nextSafeAction: sections.next ?? "",
    }
  }

  return {
    answer: sections.answer ?? "",
    limitations: sections.limitations ?? "",
    nextSafeAction: sections.next ?? "",
  }
}
