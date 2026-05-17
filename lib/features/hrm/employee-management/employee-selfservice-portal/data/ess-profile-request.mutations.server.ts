import "server-only"

import { and, eq } from "drizzle-orm"
import type { InferInsertModel } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmEmployeePersonalProfile, hrmEssProfileUpdateRequest } from "#lib/db/schema"

export type EssProfileRequestApproveInput = {
  readonly organizationId: string
  readonly requestId: string
  readonly reviewedByUserId: string
  readonly reviewNote?: string | null
}

export type EssProfileRequestRejectInput = {
  readonly organizationId: string
  readonly requestId: string
  readonly reviewedByUserId: string
  readonly reviewNote: string
}

/**
 * Approves an ESS profile update request and applies the requested changes
 * to the master employee record. HRM-ESS-004/023.
 *
 * Returns `false` when the request is not found, not in `pending` status,
 * or the employee is archived.
 */
export async function approveEssProfileUpdateRequest(
  input: EssProfileRequestApproveInput
): Promise<boolean> {
  const [request] = await db
    .select({
      id: hrmEssProfileUpdateRequest.id,
      employeeId: hrmEssProfileUpdateRequest.employeeId,
      section: hrmEssProfileUpdateRequest.section,
      requestedChanges: hrmEssProfileUpdateRequest.requestedChanges,
      status: hrmEssProfileUpdateRequest.status,
    })
    .from(hrmEssProfileUpdateRequest)
    .where(
      and(
        eq(hrmEssProfileUpdateRequest.organizationId, input.organizationId),
        eq(hrmEssProfileUpdateRequest.id, input.requestId),
        eq(hrmEssProfileUpdateRequest.status, "pending")
      )
    )
    .limit(1)

  if (!request) return false

  const changes = (
    request.requestedChanges &&
    typeof request.requestedChanges === "object" &&
    !Array.isArray(request.requestedChanges)
      ? request.requestedChanges
      : {}
  ) as Record<string, unknown>

  const now = new Date()

  await db.transaction(async (tx) => {
    // Apply changes to the employee master record
    if (request.section === "personal") {
      type EmployeePersonalPatch = Pick<
        InferInsertModel<typeof hrmEmployee>,
        | "preferredName"
        | "dateOfBirth"
        | "gender"
        | "nationality"
        | "updatedAt"
        | "updatedByUserId"
      >

      const employeePatch: Partial<
        Pick<
          InferInsertModel<typeof hrmEmployee>,
          "preferredName" | "dateOfBirth" | "gender" | "nationality"
        >
      > = {}
      if ("preferredName" in changes)
        employeePatch.preferredName =
          (changes.preferredName as string | null | undefined) ?? null
      if ("dateOfBirth" in changes) {
        employeePatch.dateOfBirth = changes.dateOfBirth
          ? new Date(`${changes.dateOfBirth as string}T00:00:00.000Z`)
          : null
      }
      if ("gender" in changes)
        employeePatch.gender =
          (changes.gender as string | null | undefined) ?? null
      if ("nationality" in changes)
        employeePatch.nationality =
          (changes.nationality as string | null | undefined) ?? null

      if (Object.keys(employeePatch).length > 0) {
        const employeeSet: EmployeePersonalPatch = {
          updatedAt: now,
          updatedByUserId: input.reviewedByUserId,
          ...employeePatch,
        }
        await tx
          .update(hrmEmployee)
          .set(employeeSet)
          .where(
            and(
              eq(hrmEmployee.organizationId, input.organizationId),
              eq(hrmEmployee.id, request.employeeId)
            )
          )
      }

      // Sync personal profile table
      type PersonalProfilePatch = Pick<
        InferInsertModel<typeof hrmEmployeePersonalProfile>,
        | "dateOfBirth"
        | "gender"
        | "nationality"
        | "maritalStatus"
        | "updatedAt"
        | "updatedByUserId"
      >

      const profilePatch: Partial<
        Pick<
          InferInsertModel<typeof hrmEmployeePersonalProfile>,
          "dateOfBirth" | "gender" | "nationality" | "maritalStatus"
        >
      > = {}
      if ("dateOfBirth" in changes) {
        profilePatch.dateOfBirth = changes.dateOfBirth
          ? new Date(`${changes.dateOfBirth as string}T00:00:00.000Z`)
          : null
      }
      if ("gender" in changes)
        profilePatch.gender =
          (changes.gender as string | null | undefined) ?? null
      if ("nationality" in changes)
        profilePatch.nationality =
          (changes.nationality as string | null | undefined) ?? null
      if ("maritalStatus" in changes)
        profilePatch.maritalStatus =
          (changes.maritalStatus as string | null | undefined) ?? null

      if (Object.keys(profilePatch).length > 0) {
        const profileInsertBase = {
          organizationId: input.organizationId,
          employeeId: request.employeeId,
          createdByUserId: input.reviewedByUserId,
        } as const

        const profileUpsertSet: PersonalProfilePatch = {
          updatedAt: now,
          updatedByUserId: input.reviewedByUserId,
          ...profilePatch,
        }

        await tx
          .insert(hrmEmployeePersonalProfile)
          .values({
            ...profileInsertBase,
            ...profilePatch,
          })
          .onConflictDoUpdate({
            target: [
              hrmEmployeePersonalProfile.organizationId,
              hrmEmployeePersonalProfile.employeeId,
            ],
            set: profileUpsertSet,
          })
      }
    }

    // Mark request as approved
    await tx
      .update(hrmEssProfileUpdateRequest)
      .set({
        status: "approved",
        reviewedByUserId: input.reviewedByUserId,
        reviewNote: input.reviewNote ?? null,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(hrmEssProfileUpdateRequest.id, request.id))
  })

  return true
}

/**
 * Rejects an ESS profile update request. No master record changes are made.
 * HRM-ESS-004/023.
 */
export async function rejectEssProfileUpdateRequest(
  input: EssProfileRequestRejectInput
): Promise<boolean> {
  const [request] = await db
    .select({ id: hrmEssProfileUpdateRequest.id })
    .from(hrmEssProfileUpdateRequest)
    .where(
      and(
        eq(hrmEssProfileUpdateRequest.organizationId, input.organizationId),
        eq(hrmEssProfileUpdateRequest.id, input.requestId),
        eq(hrmEssProfileUpdateRequest.status, "pending")
      )
    )
    .limit(1)

  if (!request) return false

  const now = new Date()
  await db
    .update(hrmEssProfileUpdateRequest)
    .set({
      status: "rejected",
      reviewedByUserId: input.reviewedByUserId,
      reviewNote: input.reviewNote,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(hrmEssProfileUpdateRequest.id, request.id))

  return true
}
