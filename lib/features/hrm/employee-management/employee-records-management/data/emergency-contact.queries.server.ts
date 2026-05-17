import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployeeEmergencyContact } from "#lib/db/schema"

import type { EmergencyContactRow } from "../../../types"

/** Active (non-archived) emergency contacts ordered primary-first. */
export async function listEmergencyContactsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<EmergencyContactRow[]> {
  return db
    .select({
      id: hrmEmployeeEmergencyContact.id,
      legalName: hrmEmployeeEmergencyContact.legalName,
      relationship: hrmEmployeeEmergencyContact.relationship,
      phone: hrmEmployeeEmergencyContact.phone,
      alternatePhone: hrmEmployeeEmergencyContact.alternatePhone,
      email: hrmEmployeeEmergencyContact.email,
      isPrimary: hrmEmployeeEmergencyContact.isPrimary,
    })
    .from(hrmEmployeeEmergencyContact)
    .where(
      and(
        eq(hrmEmployeeEmergencyContact.organizationId, organizationId),
        eq(hrmEmployeeEmergencyContact.employeeId, employeeId),
        isNull(hrmEmployeeEmergencyContact.archivedAt)
      )
    )
    .orderBy(desc(hrmEmployeeEmergencyContact.isPrimary))
}
