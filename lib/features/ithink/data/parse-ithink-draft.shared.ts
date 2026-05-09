import type { IThinkDraftParsed, IThinkListRow } from "../types"

const SEVERITY_RANK: Record<"critical" | "high" | "medium" | "low", number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function endOfUtcDayFromDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 0)
  )
}

/** Next Monday after `nowUtc` (if Monday, the Monday one week ahead). End of that UTC day. */
function nextMondayEndUtc(nowUtc: Date): Date {
  const dow = nowUtc.getUTCDay()
  let add = (8 - dow) % 7
  if (add === 0) add = 7
  const d = new Date(nowUtc)
  d.setUTCDate(d.getUTCDate() + add)
  return endOfUtcDayFromDate(d)
}

/**
 * Parses quick-capture tokens from a draft string. Does not call `Date.now()` — pass `nowUtc`.
 * Tokens are case-insensitive; matched spans are removed from `cleanTitle`.
 */
export function parseIThinkDraft(
  raw: string,
  lists: IThinkListRow[],
  nowUtc: Date
): IThinkDraftParsed {
  const slugToList = new Map(
    lists.map((l) => [l.slug.toLowerCase(), l] as const)
  )

  const labelTokens: string[] = []
  let severity: IThinkDraftParsed["severity"] = null
  let severityRank = 0
  let dueAt: Date | null = null
  let listId: string | null = null
  let unknownProjectToken: string | null = null

  let work = raw.trim()

  work = work.replace(/@([^\s#@]+)/gi, (_m, label: string) => {
    labelTokens.push(label)
    return " "
  })
  work = work.replace(/\s+/g, " ").trim()

  work = work.replace(/#([a-z0-9_-]+)/gi, (_m, slug: string) => {
    const list = slugToList.get(slug.toLowerCase())
    if (list) {
      listId = list.id
    } else if (!unknownProjectToken) {
      unknownProjectToken = `#${slug}`
    }
    return " "
  })
  work = work.replace(/\s+/g, " ").trim()

  const todayEnd = endOfUtcDayFromDate(nowUtc)
  const tomorrowBase = new Date(nowUtc)
  tomorrowBase.setUTCDate(tomorrowBase.getUTCDate() + 1)
  const tomorrowEnd = endOfUtcDayFromDate(tomorrowBase)
  const nextWeekEnd = nextMondayEndUtc(nowUtc)

  type DateSpan = { start: number; end: number; value: Date }
  const dateSpans: DateSpan[] = []
  const pushMatches = (re: RegExp, value: Date) => {
    const r = new RegExp(
      re.source,
      re.flags.includes("g") ? re.flags : `${re.flags}g`
    )
    let m: RegExpExecArray | null
    while ((m = r.exec(work)) !== null) {
      dateSpans.push({ start: m.index, end: m.index + m[0].length, value })
    }
  }
  pushMatches(/\bnext\s+week\b/gi, nextWeekEnd)
  pushMatches(/\btomorrow\b/gi, tomorrowEnd)
  pushMatches(/\btoday\b/gi, todayEnd)

  if (dateSpans.length > 0) {
    dateSpans.sort((a, b) => a.start - b.start)
    dueAt = dateSpans[dateSpans.length - 1]!.value
    let out = ""
    let i = 0
    const sorted = [...dateSpans].sort((a, b) => a.start - b.start)
    for (const span of sorted) {
      if (span.start > i) out += work.slice(i, span.start)
      i = span.end
    }
    if (i < work.length) out += work.slice(i)
    work = out.replace(/\s+/g, " ").trim()
  }

  work = work.replace(/\b(p[1-4])\b/gi, (_m, token: string) => {
    const t = token.toLowerCase()
    const nextSev =
      t === "p1"
        ? ("critical" as const)
        : t === "p2"
          ? ("high" as const)
          : t === "p3"
            ? ("medium" as const)
            : ("low" as const)
    const r = SEVERITY_RANK[nextSev]
    if (r > severityRank) {
      severityRank = r
      severity = nextSev
    }
    return " "
  })
  work = work.replace(/\s+/g, " ").trim()

  return {
    cleanTitle: work.trim(),
    severity,
    dueAt,
    listId,
    labelTokens,
    unknownProjectToken,
  }
}
