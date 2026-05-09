export type OpenStatusPublicState =
  | "operational"
  | "degraded"
  | "maintenance"
  | "incident"
  | "unknown"

export type OpenStatusComponent = {
  readonly name: string
  readonly status: OpenStatusPublicState
  readonly description?: string
}

export type OpenStatusEvent = {
  readonly title: string
  readonly status: OpenStatusPublicState | string
  readonly message?: string
  readonly date?: string
}

export type OpenStatusPublicSnapshot = {
  readonly configured: boolean
  readonly available: boolean
  readonly publicStatusUrl: string | null
  readonly feedUrl: string | null
  readonly title: string
  readonly summary: string
  readonly overallStatus: OpenStatusPublicState
  readonly components: readonly OpenStatusComponent[]
  readonly incidents: readonly OpenStatusEvent[]
  readonly maintenances: readonly OpenStatusEvent[]
  readonly checkedAt: string
  readonly fallbackReason?: "missing-config" | "fetch-failed" | "invalid-feed"
}

const DEFAULT_STATUS_TITLE = "Afenda Status"
const DEFAULT_STATUS_SUMMARY =
  "OpenStatus is the public availability authority. Afenda reflects that source without publishing a separate uptime claim."

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(
  record: Record<string, unknown>,
  keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function readRecord(
  record: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = record[key]
    if (isRecord(value)) return value
  }
  return undefined
}

function readArray(
  record: Record<string, unknown>,
  keys: readonly string[]
): readonly unknown[] {
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  return []
}

export function normalizeOpenStatusState(
  value: unknown
): OpenStatusPublicState {
  const raw =
    typeof value === "string" || typeof value === "number"
      ? String(value).toLowerCase()
      : ""

  if (
    raw.includes("operational") ||
    raw.includes("healthy") ||
    raw === "ok" ||
    raw === "up"
  ) {
    return "operational"
  }

  if (raw.includes("maintenance")) {
    return "maintenance"
  }

  if (
    raw.includes("degraded") ||
    raw.includes("minor") ||
    raw.includes("partial")
  ) {
    return "degraded"
  }

  if (
    raw.includes("incident") ||
    raw.includes("major") ||
    raw.includes("critical") ||
    raw.includes("down") ||
    raw.includes("outage")
  ) {
    return "incident"
  }

  return "unknown"
}

function normalizeComponent(value: unknown): OpenStatusComponent | null {
  if (!isRecord(value)) return null

  const monitor = readRecord(value, ["monitor"])
  const name =
    readString(value, ["name", "title", "label"]) ??
    (monitor ? readString(monitor, ["name", "title", "url"]) : undefined)

  if (!name) return null

  const statusRaw =
    value.status ??
    value.state ??
    value.overallStatus ??
    value.indicator ??
    monitor?.status ??
    monitor?.state

  return {
    name,
    status: normalizeOpenStatusState(statusRaw),
    description: readString(value, ["description", "summary"]),
  }
}

function normalizeEvent(value: unknown): OpenStatusEvent | null {
  if (!isRecord(value)) return null

  const title = readString(value, ["title", "name", "summary"])
  if (!title) return null

  const statusRaw = readString(value, ["status", "state", "type"]) ?? "unknown"
  const normalizedStatus = normalizeOpenStatusState(statusRaw)
  return {
    title,
    status: normalizedStatus === "unknown" ? statusRaw : normalizedStatus,
    message: readString(value, ["message", "description", "body"]),
    date: readString(value, ["date", "createdAt", "updatedAt", "startsAt"]),
  }
}

export function buildOpenStatusFeedUrl(
  publicStatusUrl: string | undefined
): string | null {
  const raw = publicStatusUrl?.trim()
  if (!raw) return null

  try {
    const url = new URL(raw)
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/feed/json`
    url.search = ""
    url.hash = ""
    return url.toString()
  } catch {
    return null
  }
}

export function fallbackOpenStatusSnapshot(args: {
  publicStatusUrl?: string
  feedUrl?: string | null
  reason: OpenStatusPublicSnapshot["fallbackReason"]
}): OpenStatusPublicSnapshot {
  const publicStatusUrl = args.publicStatusUrl?.trim() || null

  return {
    configured: Boolean(publicStatusUrl),
    available: false,
    publicStatusUrl,
    feedUrl: args.feedUrl ?? null,
    title: DEFAULT_STATUS_TITLE,
    summary: DEFAULT_STATUS_SUMMARY,
    overallStatus: "unknown",
    components: [],
    incidents: [],
    maintenances: [],
    checkedAt: new Date().toISOString(),
    fallbackReason: args.reason,
  }
}

export function normalizeOpenStatusFeed(
  feed: unknown,
  args: { publicStatusUrl: string; feedUrl: string }
): OpenStatusPublicSnapshot {
  if (!isRecord(feed)) {
    return fallbackOpenStatusSnapshot({
      ...args,
      reason: "invalid-feed",
    })
  }

  const statusPage = readRecord(feed, ["statusPage", "page"])
  const status = readRecord(feed, ["status", "overall"])

  const title =
    (statusPage ? readString(statusPage, ["title", "name"]) : undefined) ??
    readString(feed, ["title", "name"]) ??
    DEFAULT_STATUS_TITLE

  const summary =
    (statusPage
      ? readString(statusPage, ["description", "summary"])
      : undefined) ??
    readString(feed, ["description", "summary"]) ??
    DEFAULT_STATUS_SUMMARY

  const overallStatus = normalizeOpenStatusState(
    feed.overallStatus ?? feed.status ?? feed.indicator ?? status?.indicator
  )

  const components = readArray(feed, [
    "pageComponents",
    "components",
    "monitors",
  ])
    .map(normalizeComponent)
    .filter((component): component is OpenStatusComponent => Boolean(component))

  const incidents = readArray(feed, ["statusReports", "incidents", "reports"])
    .map(normalizeEvent)
    .filter((event): event is OpenStatusEvent => Boolean(event))

  const maintenances = readArray(feed, [
    "maintenances",
    "maintenanceWindows",
    "scheduledMaintenances",
  ])
    .map(normalizeEvent)
    .filter((event): event is OpenStatusEvent => Boolean(event))

  return {
    configured: true,
    available: true,
    publicStatusUrl: args.publicStatusUrl,
    feedUrl: args.feedUrl,
    title,
    summary,
    overallStatus,
    components,
    incidents,
    maintenances,
    checkedAt: new Date().toISOString(),
  }
}
