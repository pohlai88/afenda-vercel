import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmOrgHoliday } from "#lib/db/schema"

export type OrgHolidayRow = {
  readonly id: string
  readonly holidayDate: string
  readonly name: string
  readonly regionCode: string | null
  readonly isActive: boolean
}

export async function listOrgHolidaysForOrganization(
  organizationId: string
): Promise<OrgHolidayRow[]> {
  const rows = await db.query.hrmOrgHoliday.findMany({
    where: and(
      eq(hrmOrgHoliday.organizationId, organizationId),
      eq(hrmOrgHoliday.isActive, true)
    ),
    columns: {
      id: true,
      holidayDate: true,
      name: true,
      regionCode: true,
      isActive: true,
    },
    orderBy: [desc(hrmOrgHoliday.holidayDate)],
    limit: 200,
  })

  return rows
}

export async function listOrgHolidayDatesForRange(input: {
  readonly organizationId: string
  readonly startDate: string
  readonly endDate: string
}): Promise<string[]> {
  const rows = await db.query.hrmOrgHoliday.findMany({
    where: and(
      eq(hrmOrgHoliday.organizationId, input.organizationId),
      eq(hrmOrgHoliday.isActive, true)
    ),
    columns: { holidayDate: true },
  })

  return rows
    .map((row) => row.holidayDate)
    .filter((date) => date >= input.startDate && date <= input.endDate)
}
