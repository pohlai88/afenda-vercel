/**
 * Composer draft splitter — implements the Notes / Mail behavioral fidelity
 * rule: the first non-empty line becomes the consequence headline, the
 * remaining lines become the narrative body.
 *
 * Extracted from `onething-detail-composer.tsx` so the rule can be
 * unit-tested without mounting React.
 *
 * Contract:
 *
 *   - Single-line input → `{ headline, body: "" }`.
 *   - Multi-line input → first line as headline, rest joined by `\n`
 *     with leading and trailing whitespace trimmed (preserves internal
 *     blank lines as paragraph breaks).
 *   - Empty / whitespace-only input → `{ headline: "", body: "" }`. The
 *     composer's `onSubmit` guard rejects empty submissions before this
 *     value is ever sent.
 *
 * The body is **not** length-capped here — the create schema's
 * `consequence: z.string().trim().max(20_000)` enforces that.
 */

export function splitOneThingDraft(draft: string): {
  headline: string
  body: string
} {
  const newline = draft.indexOf("\n")
  if (newline === -1) {
    return { headline: draft.trim(), body: "" }
  }
  const headline = draft.slice(0, newline).trim()
  const body = draft
    .slice(newline + 1)
    .replace(/^\s+/, "")
    .replace(/\s+$/, "")
  return { headline, body }
}
