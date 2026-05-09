const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

export const declarationPlaceholderPatterns = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /\bplaceholder\b/i,
  /\blorem ipsum\b/i,
  /\bcoming soon\b/i,
  /\bdummy\b/i,
  /\bTKTK\b/i,
] as const

export const declarationStalePhrases = [
  "If a future route such as subprocessors or a data processing addendum becomes necessary",
  "future trust route",
  "future trust routes",
  "becomes necessary",
  "should be treated as live",
  "before production scope depends on them",
] as const

export function formatDeclarationReviewedLabel(reviewedAt: string): string {
  return `Updated ${REVIEW_DATE_FORMATTER.format(new Date(reviewedAt))}`
}

export function isHttpSourceRef(value: string): boolean {
  return /^https?:\/\//.test(value)
}

export function collectDeclarationCopy(
  sections: readonly { body: readonly string[]; bullets?: readonly string[] }[]
): string {
  return sections
    .flatMap((section) => [...section.body, ...(section.bullets ?? [])])
    .join(" ")
}

export function maxReviewedAt(reviewedAtValues: readonly string[]): string {
  return [...reviewedAtValues].sort().at(-1) ?? new Date(0).toISOString()
}
