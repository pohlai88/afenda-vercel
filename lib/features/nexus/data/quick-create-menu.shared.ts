import type { Route } from "next"

export type QuickCreateLinkEntry = {
  kind: "link"
  id: string
  href: Route
  labelKey: string
  group: "modules" | "orbit" | "records"
}

export type QuickCreateFormKind =
  | "orbit-signal"
  | "orbit-item"
  | "orbit-session"
  | "contact"

export type QuickCreateFormEntry = {
  kind: QuickCreateFormKind
  id: string
  group: "orbit" | "records"
}

export type QuickCreateMenuEntry = QuickCreateLinkEntry | QuickCreateFormEntry

export type QuickCreateMenu = {
  entries: QuickCreateMenuEntry[]
  orgSlug: string
}
