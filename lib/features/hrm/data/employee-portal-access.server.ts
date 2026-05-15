import "server-only"

import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  organizationPortal,
  organizationPortalAccess,
} from "#lib/db/schema"
import { getPortalContext } from "#lib/portal/server"

import {
  buildEmployeePortalSlugCandidates,
  resolveEmployeePortalContextFromRows,
  type EmployeePortalAccessSnapshot,
  type EmployeePortalContext,
  type EmployeePortalSubjectRow,
} from "./employee-portal-access.shared"

type EmployeePortalRow = {
  id: string
  slug: string
  displayName: string
}

type EnsureEmployeePortalResult = EmployeePortalRow & {
  created: boolean
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  )
}

async function findActiveEmployeePortal(
  organizationId: string
): Promise<EmployeePortalRow | null> {
  const [portal] = await db
    .select({
      id: organizationPortal.id,
      slug: organizationPortal.slug,
      displayName: organizationPortal.displayName,
    })
    .from(organizationPortal)
    .where(
      and(
        eq(organizationPortal.organizationId, organizationId),
        eq(organizationPortal.audience, "employee"),
        eq(organizationPortal.status, "active")
      )
    )
    .limit(1)

  return portal ?? null
}

async function insertEmployeePortal(input: {
  organizationId: string
  actorUserId: string
  slug: string
}): Promise<EmployeePortalRow | null> {
  try {
    const [portal] = await db
      .insert(organizationPortal)
      .values({
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        slug: input.slug,
        audience: "employee",
        status: "active",
        displayName: "Employee Portal",
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      .returning({
        id: organizationPortal.id,
        slug: organizationPortal.slug,
        displayName: organizationPortal.displayName,
      })

    return portal ?? null
  } catch (error) {
    if (isUniqueViolation(error)) return null
    throw error
  }
}

export async function ensureEmployeePortalForOrganization(input: {
  organizationId: string
  orgSlug: string
  actorUserId: string
}): Promise<EnsureEmployeePortalResult> {
  const existing = await findActiveEmployeePortal(input.organizationId)
  if (existing) return { ...existing, created: false }

  const candidates = buildEmployeePortalSlugCandidates({
    orgSlug: input.orgSlug,
    organizationId: input.organizationId,
  })

  for (const slug of candidates) {
    const portal = await insertEmployeePortal({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      slug,
    })
    if (portal) return { ...portal, created: true }

    const concurrentPortal = await findActiveEmployeePortal(
      input.organizationId
    )
    if (concurrentPortal) return { ...concurrentPortal, created: false }
  }

  const afterCollision = await findActiveEmployeePortal(input.organizationId)
  if (afterCollision) return { ...afterCollision, created: false }

  throw new Error("Could not allocate an employee portal slug.")
}

export async function getEmployeePortalSubject(input: {
  organizationId: string
  employeeId: string
}): Promise<EmployeePortalSubjectRow | null> {
  const [employee] = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      linkedUserId: hrmEmployee.linkedUserId,
      archivedAt: hrmEmployee.archivedAt,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)

  return employee ?? null
}

export async function getEmployeePortalAccessForEmployee(input: {
  organizationId: string
  employeeId: string
}): Promise<EmployeePortalAccessSnapshot> {
  const portal = await findActiveEmployeePortal(input.organizationId)
  if (!portal) {
    return {
      portalId: null,
      portalSlug: null,
      portalDisplayName: null,
      accessId: null,
      accessStatus: null,
      accessUserId: null,
    }
  }

  const [activeAccess] = await db
    .select({
      id: organizationPortalAccess.id,
      userId: organizationPortalAccess.userId,
      status: organizationPortalAccess.status,
    })
    .from(organizationPortalAccess)
    .where(
      and(
        eq(organizationPortalAccess.portalId, portal.id),
        eq(organizationPortalAccess.audience, "employee"),
        eq(organizationPortalAccess.subjectId, input.employeeId),
        eq(organizationPortalAccess.status, "active")
      )
    )
    .limit(1)

  if (activeAccess) {
    return {
      portalId: portal.id,
      portalSlug: portal.slug,
      portalDisplayName: portal.displayName,
      accessId: activeAccess.id,
      accessStatus: "active",
      accessUserId: activeAccess.userId,
    }
  }

  const [revokedAccess] = await db
    .select({
      id: organizationPortalAccess.id,
      userId: organizationPortalAccess.userId,
      status: organizationPortalAccess.status,
    })
    .from(organizationPortalAccess)
    .where(
      and(
        eq(organizationPortalAccess.portalId, portal.id),
        eq(organizationPortalAccess.audience, "employee"),
        eq(organizationPortalAccess.subjectId, input.employeeId),
        eq(organizationPortalAccess.status, "revoked")
      )
    )
    .limit(1)

  return {
    portalId: portal.id,
    portalSlug: portal.slug,
    portalDisplayName: portal.displayName,
    accessId: revokedAccess?.id ?? null,
    accessStatus: revokedAccess ? "revoked" : null,
    accessUserId: revokedAccess?.userId ?? null,
  }
}

export async function getActiveEmployeePortalAccessForEmployee(input: {
  organizationId: string
  employeeId: string
}): Promise<{
  portalId: string
  portalSlug: string
  accessId: string
  accessUserId: string
} | null> {
  const portal = await findActiveEmployeePortal(input.organizationId)
  if (!portal) return null

  const [access] = await db
    .select({
      id: organizationPortalAccess.id,
      userId: organizationPortalAccess.userId,
    })
    .from(organizationPortalAccess)
    .where(
      and(
        eq(organizationPortalAccess.portalId, portal.id),
        eq(organizationPortalAccess.audience, "employee"),
        eq(organizationPortalAccess.subjectId, input.employeeId),
        eq(organizationPortalAccess.status, "active")
      )
    )
    .limit(1)

  return access
    ? {
        portalId: portal.id,
        portalSlug: portal.slug,
        accessId: access.id,
        accessUserId: access.userId,
      }
    : null
}

export async function getEmployeePortalContext(
  portalSlug: string
): Promise<EmployeePortalContext | null> {
  const portal = await getPortalContext(portalSlug)
  if (!portal) return null

  const employee = portal.subjectId
    ? await getEmployeePortalSubject({
        organizationId: portal.organizationId,
        employeeId: portal.subjectId,
      })
    : null

  const resolution = resolveEmployeePortalContextFromRows({
    portal,
    employee,
  })

  return resolution.ok ? resolution.context : null
}

export async function requireEmployeePortalContext(
  portalSlug: string
): Promise<EmployeePortalContext> {
  const context = await getEmployeePortalContext(portalSlug)
  if (!context) {
    notFound()
  }
  return context
}
