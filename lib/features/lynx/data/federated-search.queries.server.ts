import "server-only"

import { and, eq, ilike, isNull, or } from "drizzle-orm"

import { db } from "#lib/db"
import { customers, hrmEmployee, plannerItem } from "#lib/db/schema"

export type FederatedSearchEntityKind = "employee" | "contact" | "planner_item"

export type FederatedOrgSearchHit = {
  readonly kind: FederatedSearchEntityKind
  readonly id: string
  readonly title: string
  readonly subtitle: string | null
  /** Higher sorts first — v1 heuristic only. */
  readonly rank: number
}

function safeIlikePattern(raw: string): string {
  const trimmed = raw.trim()
  const stripped = trimmed.replaceAll("%", "").replaceAll("_", "")
  if (stripped.length < 2) return ""
  return `%${stripped}%`
}

/**
 * Org-scoped federated lookup across a small set of high-signal ERP tables.
 * Intended for Lynx / operator surfaces — not a replacement for pgvector truth.
 */
export async function federatedOrgEntitySearch(input: {
  readonly organizationId: string
  readonly query: string
  readonly limit?: number
}): Promise<FederatedOrgSearchHit[]> {
  const pattern = safeIlikePattern(input.query)
  if (!pattern) return []

  const cap = Math.min(Math.max(input.limit ?? 12, 1), 40)

  const [employees, contacts, items] = await Promise.all([
    db
      .select({
        id: hrmEmployee.id,
        legalName: hrmEmployee.legalName,
        employeeNumber: hrmEmployee.employeeNumber,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, input.organizationId),
          isNull(hrmEmployee.archivedAt),
          or(
            ilike(hrmEmployee.legalName, pattern),
            ilike(hrmEmployee.employeeNumber, pattern)
          )
        )
      )
      .limit(cap),

    db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, input.organizationId),
          or(ilike(customers.name, pattern), ilike(customers.email, pattern))
        )
      )
      .limit(cap),

    db
      .select({
        id: plannerItem.id,
        title: plannerItem.title,
        description: plannerItem.description,
      })
      .from(plannerItem)
      .where(
        and(
          eq(plannerItem.organizationId, input.organizationId),
          ilike(plannerItem.title, pattern)
        )
      )
      .limit(cap),
  ])

  const hits: FederatedOrgSearchHit[] = []

  for (const e of employees) {
    hits.push({
      kind: "employee",
      id: e.id,
      title: e.legalName,
      subtitle: e.employeeNumber,
      rank: 3,
    })
  }
  for (const c of contacts) {
    hits.push({
      kind: "contact",
      id: c.id,
      title: c.name,
      subtitle: c.email ?? null,
      rank: 2,
    })
  }
  for (const p of items) {
    hits.push({
      kind: "planner_item",
      id: p.id,
      title: p.title,
      subtitle: p.description ?? null,
      rank: 1,
    })
  }

  hits.sort((a, b) => b.rank - a.rank)
  return hits.slice(0, cap)
}
