import "server-only"

import { and, eq } from "drizzle-orm"
import type { InferInsertModel } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeContactProfile,
  hrmEmployeePersonalProfile,
  hrmEssProfileUpdateRequest,
} from "#lib/db/schema"

import { notifyEssRequestLifecycle } from "./employee-portal-notification.server"
import { HRM_ESS_AUDIT } from "../ess.contract"
import { recordEmployeeRecordChangeHistory } from "../../employee-records-management/data/employee-record-history.server"
import { getCurrentPayrollProfileForEmployee } from "../../../payroll-compensation/payroll-processing/data/payroll-profile.queries.server"
import { upsertPayrollProfileMutation } from "../../../payroll-compensation/payroll-processing/data/payroll-profile.mutations.server"

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

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

function isoDateOrNull(value: unknown): Date | null {
  const text = stringOrNull(value)
  return text ? new Date(`${text}T00:00:00.000Z`) : null
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function tomorrowIsoDay(date: Date): string {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + 1)
  return toIsoDay(next)
}

function comparable(value: unknown): unknown {
  return value instanceof Date ? toIsoDay(value) : value
}

function valuesDiffer(left: unknown, right: unknown): boolean {
  return JSON.stringify(comparable(left)) !== JSON.stringify(comparable(right))
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
      submittedByUserId: hrmEssProfileUpdateRequest.submittedByUserId,
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

  const [employeeState] = await db
    .select({ archivedAt: hrmEmployee.archivedAt })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, request.employeeId)
      )
    )
    .limit(1)

  if (!employeeState || employeeState.archivedAt) return false

  const changes = (
    request.requestedChanges &&
    typeof request.requestedChanges === "object" &&
    !Array.isArray(request.requestedChanges)
      ? request.requestedChanges
      : {}
  ) as Record<string, unknown>

  const now = new Date()

  if (request.section === "banking") {
    const currentProfile = await getCurrentPayrollProfileForEmployee(
      input.organizationId,
      request.employeeId
    )
    if (!currentProfile) return false

    const requestedEffectiveFrom =
      currentProfile.effectiveFrom.getTime() >= now.getTime()
        ? tomorrowIsoDay(currentProfile.effectiveFrom)
        : toIsoDay(now)

    const applied = await upsertPayrollProfileMutation({
      organizationId: input.organizationId,
      employeeId: request.employeeId,
      actorUserId: input.reviewedByUserId,
      effectiveFrom: requestedEffectiveFrom,
      countryCode: currentProfile.countryCode,
      taxResidencyCountry: currentProfile.taxResidencyCountry,
      taxIdentifierType: currentProfile.taxIdentifierType,
      taxIdentifierNumber: currentProfile.taxIdentifierNumber,
      epfNumber: currentProfile.epfNumber,
      socsoNumber: currentProfile.socsoNumber,
      eisEligible: currentProfile.eisEligible,
      pcbCategory: currentProfile.pcbCategory,
      hrdfApplicable: currentProfile.hrdfApplicable,
      bankCode: stringOrNull(changes.bankCode) ?? currentProfile.bankCode,
      bankAccountHolderName:
        stringOrNull(changes.bankAccountHolderName) ??
        currentProfile.bankAccountHolderName,
      bankAccountTokenized:
        stringOrNull(changes.bankAccountTokenized) ??
        currentProfile.bankAccountTokenized,
      paySchedule: currentProfile.paySchedule,
      payCurrency: currentProfile.payCurrency,
      payrollGroupCode: currentProfile.payrollGroupCode,
    })
    if (!applied.ok) return false

    await db
      .update(hrmEssProfileUpdateRequest)
      .set({
        status: "approved",
        reviewedByUserId: input.reviewedByUserId,
        reviewNote: input.reviewNote ?? null,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(hrmEssProfileUpdateRequest.id, request.id))
  } else {
    await db.transaction(async (tx) => {
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

        const [employeeBefore] = await tx
          .select({
            preferredName: hrmEmployee.preferredName,
            dateOfBirth: hrmEmployee.dateOfBirth,
            gender: hrmEmployee.gender,
            nationality: hrmEmployee.nationality,
          })
          .from(hrmEmployee)
          .where(
            and(
              eq(hrmEmployee.organizationId, input.organizationId),
              eq(hrmEmployee.id, request.employeeId)
            )
          )
          .limit(1)

        if (!employeeBefore) throw new Error("Employee record not found.")

        const employeePatch: EmployeePersonalPatch = {
          preferredName: stringOrNull(changes.preferredName),
          dateOfBirth: isoDateOrNull(changes.dateOfBirth),
          gender: stringOrNull(changes.gender),
          nationality: stringOrNull(changes.nationality),
          updatedAt: now,
          updatedByUserId: input.reviewedByUserId,
        }

        await tx
          .update(hrmEmployee)
          .set(employeePatch)
          .where(
            and(
              eq(hrmEmployee.organizationId, input.organizationId),
              eq(hrmEmployee.id, request.employeeId)
            )
          )

        type PersonalProfilePatch = Pick<
          InferInsertModel<typeof hrmEmployeePersonalProfile>,
          | "dateOfBirth"
          | "gender"
          | "nationality"
          | "maritalStatus"
          | "updatedAt"
          | "updatedByUserId"
        >

        const profilePatch: PersonalProfilePatch = {
          dateOfBirth: employeePatch.dateOfBirth,
          gender: employeePatch.gender,
          nationality: employeePatch.nationality,
          maritalStatus: stringOrNull(changes.maritalStatus),
          updatedAt: now,
          updatedByUserId: input.reviewedByUserId,
        }

        await tx
          .insert(hrmEmployeePersonalProfile)
          .values({
            organizationId: input.organizationId,
            employeeId: request.employeeId,
            createdByUserId: input.reviewedByUserId,
            ...profilePatch,
          })
          .onConflictDoUpdate({
            target: [
              hrmEmployeePersonalProfile.organizationId,
              hrmEmployeePersonalProfile.employeeId,
            ],
            set: profilePatch,
          })

        await recordEmployeeRecordChangeHistory(
          {
            organizationId: input.organizationId,
            employeeId: request.employeeId,
            changedByUserId: input.reviewedByUserId,
            changes: [
              {
                fieldName: "preferredName",
                oldValue: employeeBefore.preferredName,
                newValue: employeePatch.preferredName,
              },
              {
                fieldName: "dateOfBirth",
                oldValue: employeeBefore.dateOfBirth,
                newValue: employeePatch.dateOfBirth,
              },
              {
                fieldName: "gender",
                oldValue: employeeBefore.gender,
                newValue: employeePatch.gender,
              },
              {
                fieldName: "nationality",
                oldValue: employeeBefore.nationality,
                newValue: employeePatch.nationality,
              },
            ].filter((change) =>
              valuesDiffer(change.oldValue, change.newValue)
            ),
            meta: {
              reason: input.reviewNote ?? "ESS profile update approved",
              approvalReference: request.id,
            },
          },
          tx
        )
      }

      if (request.section === "contact" || request.section === "emergency") {
        const [contactBefore] = await tx
          .select({
            id: hrmEmployeeContactProfile.id,
            personalEmail: hrmEmployeeContactProfile.personalEmail,
            personalPhone: hrmEmployeeContactProfile.personalPhone,
            address: hrmEmployeeContactProfile.address,
          })
          .from(hrmEmployeeContactProfile)
          .where(
            and(
              eq(hrmEmployeeContactProfile.organizationId, input.organizationId),
              eq(hrmEmployeeContactProfile.employeeId, request.employeeId)
            )
          )
          .limit(1)

        const contactPatch = {
          personalEmail: stringOrNull(changes.personalEmail),
          personalPhone: stringOrNull(changes.personalPhone),
          address:
            changes.address && typeof changes.address === "object"
              ? (changes.address as Record<string, unknown>)
              : null,
          updatedAt: now,
          updatedByUserId: input.reviewedByUserId,
        }

        if (contactBefore) {
          await tx
            .update(hrmEmployeeContactProfile)
            .set(contactPatch)
            .where(eq(hrmEmployeeContactProfile.id, contactBefore.id))
        } else {
          await tx.insert(hrmEmployeeContactProfile).values({
            organizationId: input.organizationId,
            employeeId: request.employeeId,
            workEmail: null,
            workPhone: null,
            createdByUserId: input.reviewedByUserId,
            ...contactPatch,
          })
        }

        await recordEmployeeRecordChangeHistory(
          {
            organizationId: input.organizationId,
            employeeId: request.employeeId,
            changedByUserId: input.reviewedByUserId,
            changes: [
              {
                fieldName: "personalEmail",
                oldValue: contactBefore?.personalEmail ?? null,
                newValue: contactPatch.personalEmail,
              },
              {
                fieldName: "personalPhone",
                oldValue: contactBefore?.personalPhone ?? null,
                newValue: contactPatch.personalPhone,
              },
              {
                fieldName: "address",
                oldValue: contactBefore?.address ?? null,
                newValue: contactPatch.address,
              },
            ].filter((change) =>
              valuesDiffer(change.oldValue, change.newValue)
            ),
            meta: {
              reason: input.reviewNote ?? "ESS contact update approved",
              approvalReference: request.id,
            },
          },
          tx
        )
      }

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
  }

  await writeIamAuditEvent({
    action: HRM_ESS_AUDIT.profileUpdate.approve,
    actorUserId: input.reviewedByUserId,
    actorSessionId: null,
    organizationId: input.organizationId,
    resourceType: "hrm_ess_profile_update_request",
    resourceId: request.id,
    metadata: {
      employeeId: request.employeeId,
      section: request.section,
    },
  })
  await notifyEssRequestLifecycle({
    organizationId: input.organizationId,
    targetUserId: request.submittedByUserId,
    kind: "profile_update",
    status: "approved",
    requestId: request.id,
    employeeId: request.employeeId,
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
    .select({
      id: hrmEssProfileUpdateRequest.id,
      employeeId: hrmEssProfileUpdateRequest.employeeId,
      section: hrmEssProfileUpdateRequest.section,
      submittedByUserId: hrmEssProfileUpdateRequest.submittedByUserId,
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

  await writeIamAuditEvent({
    action: HRM_ESS_AUDIT.profileUpdate.reject,
    actorUserId: input.reviewedByUserId,
    actorSessionId: null,
    organizationId: input.organizationId,
    resourceType: "hrm_ess_profile_update_request",
    resourceId: request.id,
    metadata: {
      employeeId: request.employeeId,
      section: request.section,
      reviewNote: input.reviewNote,
    },
  })
  await notifyEssRequestLifecycle({
    organizationId: input.organizationId,
    targetUserId: request.submittedByUserId,
    kind: "profile_update",
    status: "rejected",
    requestId: request.id,
    employeeId: request.employeeId,
  })

  return true
}
