import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDependent } from "#lib/db/schema"

export type DependentRow = {
  id: string
  employeeId: string
  legalName: string
  relationship: string
  dateOfBirth: Date | null
  taxDependent: boolean
  createdAt: Date
}

export async function listDependentsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<DependentRow[]> {
  const rows = await db
    .select({
      id: hrmDependent.id,
      employeeId: hrmDependent.employeeId,
      legalName: hrmDependent.legalName,
      relationship: hrmDependent.relationship,
      dateOfBirth: hrmDependent.dateOfBirth,
      taxDependent: hrmDependent.taxDependent,
      createdAt: hrmDependent.createdAt,
    })
    .from(hrmDependent)
    .where(
      and(
        eq(hrmDependent.organizationId, organizationId),
        eq(hrmDependent.employeeId, employeeId),
        isNull(hrmDependent.archivedAt)
      )
    )
    .orderBy(desc(hrmDependent.createdAt))

  return rows
}

export async function listDependentsForOrganization(
  organizationId: string,
  options: { readonly limit?: number } = {}
): Promise<DependentRow[]> {
  const limit = options.limit ?? 2000
  return db
    .select({
      id: hrmDependent.id,
      employeeId: hrmDependent.employeeId,
      legalName: hrmDependent.legalName,
      relationship: hrmDependent.relationship,
      dateOfBirth: hrmDependent.dateOfBirth,
      taxDependent: hrmDependent.taxDependent,
      createdAt: hrmDependent.createdAt,
    })
    .from(hrmDependent)
    .where(
      and(
        eq(hrmDependent.organizationId, organizationId),
        isNull(hrmDependent.archivedAt)
      )
    )
    .orderBy(desc(hrmDependent.createdAt))
    .limit(limit)
}

export async function countTaxDependentsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmDependent.id })
    .from(hrmDependent)
    .where(
      and(
        eq(hrmDependent.organizationId, organizationId),
        eq(hrmDependent.employeeId, employeeId),
        eq(hrmDependent.taxDependent, true),
        isNull(hrmDependent.archivedAt)
      )
    )
  return rows.length
}
