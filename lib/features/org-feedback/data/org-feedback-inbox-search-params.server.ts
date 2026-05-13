import "server-only"

import type { SearchParams } from "nuqs/server"

import { loadOrgFeedbackInboxSearchParams } from "../schemas/org-feedback-inbox.search-params"

import { parseOrgFeedbackListStateFilter } from "./feedback.queries.server"

export async function resolveOrgFeedbackInboxSearchParams(
  searchParams: Promise<SearchParams>
) {
  const loaded = await loadOrgFeedbackInboxSearchParams(searchParams)
  const page =
    Number.isFinite(loaded.page) && loaded.page >= 1 ? loaded.page : 1
  const stateFilter = parseOrgFeedbackListStateFilter(
    loaded.state === "all" ? undefined : loaded.state
  )
  return { page, stateFilter, loaded }
}
