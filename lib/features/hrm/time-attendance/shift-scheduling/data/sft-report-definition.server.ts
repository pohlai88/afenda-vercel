import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmShiftRosterReportDefinition } from "#lib/db/schema"

import {
  rosterListFiltersSchema,
  type RosterListFiltersInput,
} from "../schemas/sft.schema"

export type ShiftRosterReportDefinitionRow = {
  readonly id: string
  readonly organizationId: string
  readonly name: string
  readonly filters: RosterListFiltersInput
  readonly createdAt: Date
}

function parseFilters(raw: unknown): RosterListFiltersInput {
  const parsed = rosterListFiltersSchema.safeParse(raw ?? {})
  return parsed.success ? parsed.data : {}
}

export async function listShiftRosterReportDefinitions(input: {
  organizationId: string
}): Promise<ShiftRosterReportDefinitionRow[]> {
  const rows = await db
    .select({
      id: hrmShiftRosterReportDefinition.id,
      organizationId: hrmShiftRosterReportDefinition.organizationId,
      name: hrmShiftRosterReportDefinition.name,
      filters: hrmShiftRosterReportDefinition.filters,
      createdAt: hrmShiftRosterReportDefinition.createdAt,
    })
    .from(hrmShiftRosterReportDefinition)
    .where(
      eq(hrmShiftRosterReportDefinition.organizationId, input.organizationId)
    )
    .orderBy(asc(hrmShiftRosterReportDefinition.name))

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    filters: parseFilters(row.filters),
    createdAt: row.createdAt,
  }))
}

export async function createShiftRosterReportDefinition(input: {
  organizationId: string
  userId: string
  name: string
  filters: RosterListFiltersInput
}): Promise<{ ok: true; definitionId: string } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name) {
    return { ok: false, error: "Report name is required." }
  }

  const filtersParsed = rosterListFiltersSchema.safeParse(input.filters)
  if (!filtersParsed.success) {
    return {
      ok: false,
      error: filtersParsed.error.issues[0]?.message ?? "Invalid filters.",
    }
  }

  const existing = await db
    .select({ id: hrmShiftRosterReportDefinition.id })
    .from(hrmShiftRosterReportDefinition)
    .where(
      and(
        eq(hrmShiftRosterReportDefinition.organizationId, input.organizationId),
        eq(hrmShiftRosterReportDefinition.name, name)
      )
    )
    .limit(1)

  if (existing[0]) {
    return {
      ok: false,
      error: "A report with this name already exists for the organization.",
    }
  }

  const definitionId = crypto.randomUUID()
  const now = new Date()

  await db.insert(hrmShiftRosterReportDefinition).values({
    id: definitionId,
    organizationId: input.organizationId,
    name,
    filters: filtersParsed.data,
    createdByUserId: input.userId,
    createdAt: now,
    updatedAt: now,
  })

  return { ok: true, definitionId }
}

export async function deleteShiftRosterReportDefinition(input: {
  organizationId: string
  definitionId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db
    .select({ id: hrmShiftRosterReportDefinition.id })
    .from(hrmShiftRosterReportDefinition)
    .where(
      and(
        eq(hrmShiftRosterReportDefinition.organizationId, input.organizationId),
        eq(hrmShiftRosterReportDefinition.id, input.definitionId)
      )
    )
    .limit(1)

  if (!rows[0]) {
    return { ok: false, error: "Report definition not found." }
  }

  await db
    .delete(hrmShiftRosterReportDefinition)
    .where(eq(hrmShiftRosterReportDefinition.id, input.definitionId))

  return { ok: true }
}
